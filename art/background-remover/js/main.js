// Background Remover: the page. Loading, picking colours, preview, export
// and the URage dashboard hooks. The cut-out itself is in keyer.js.

import { keyImage, suggestKeyColors, opaqueBounds } from './keyer.js';

const $ = (id) => document.getElementById(id);

const els = {
    fileInput: $('fileInput'),
    canvas: $('preview'),
    canvasWrap: $('canvasWrap'),
    emptyState: $('emptyState'),
    swatches: $('swatches'),
    autoPick: $('autoPickButton'),
    tolerance: $('toleranceInput'),
    toleranceValue: $('toleranceValue'),
    softness: $('softnessInput'),
    softnessValue: $('softnessValue'),
    edgesOnly: $('edgesOnlyInput'),
    despill: $('despillInput'),
    trim: $('trimInput'),
    download: $('downloadButton'),
    reset: $('resetButton'),
    compare: $('compareButton'),
    status: $('status'),
};

const MAX_COLORS = 6;

const state = {
    source: null,      // ImageData of the original
    result: null,      // ImageData after keying
    colors: [],        // key colours as [r, g, b]
    fileName: 'image',
    pending: false,
    comparing: false,
};

const ctx = els.canvas.getContext('2d', { willReadFrequently: true });

const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

function setStatus(text) {
    els.status.textContent = text;
}

function setLoaded(loaded) {
    [els.autoPick, els.download, els.reset, els.compare].forEach((button) => { button.disabled = !loaded; });
    els.emptyState.hidden = loaded;
}

// ---- loading ------------------------------------------------------------

async function loadImageFromBlob(blob, name) {
    const bitmap = await createImageBitmap(blob);
    const scratch = document.createElement('canvas');
    scratch.width = bitmap.width;
    scratch.height = bitmap.height;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    state.source = sctx.getImageData(0, 0, scratch.width, scratch.height);
    state.fileName = String(name || 'image').replace(/\.[a-z0-9]+$/i, '') || 'image';
    els.canvas.width = scratch.width;
    els.canvas.height = scratch.height;
    // Start with the colours along the edges: right for most plain backgrounds.
    state.colors = suggestKeyColors(state.source);
    setLoaded(true);
    renderSwatches();
    scheduleRender();
    setStatus(`${scratch.width} × ${scratch.height} px. Picked ${state.colors.length} colour${state.colors.length === 1 ? '' : 's'} from the edges; click the image to add more.`);
}

async function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        setStatus('That is not an image file.');
        return;
    }
    try {
        await loadImageFromBlob(file, file.name);
    } catch (error) {
        setStatus(`Could not open the image: ${error.message || error}`);
    }
}

// ---- colours ------------------------------------------------------------

function addColor(color) {
    const duplicate = state.colors.some((c) => Math.hypot(c[0] - color[0], c[1] - color[1], c[2] - color[2]) < 6);
    if (duplicate) return;
    if (state.colors.length >= MAX_COLORS) state.colors.shift();
    state.colors.push(color);
    renderSwatches();
    scheduleRender();
}

function removeColor(index) {
    state.colors.splice(index, 1);
    renderSwatches();
    scheduleRender();
}

function renderSwatches() {
    els.swatches.innerHTML = '';
    if (!state.colors.length) {
        const hint = document.createElement('p');
        hint.className = 'bgr-hint';
        hint.textContent = 'Click the image to add a colour.';
        els.swatches.appendChild(hint);
        return;
    }
    state.colors.forEach((color, index) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'bgr-swatch';
        chip.title = `Remove ${hex(color)}`;
        chip.setAttribute('aria-label', `Remove background colour ${hex(color)}`);
        chip.innerHTML = `<span class="bgr-swatch-color" style="background:${hex(color)}"></span><code>${hex(color)}</code><span aria-hidden="true">×</span>`;
        chip.addEventListener('click', () => removeColor(index));
        els.swatches.appendChild(chip);
    });
}

// The image pixel under a click on the (scaled) canvas.
function pixelAt(event) {
    const rect = els.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (els.canvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (els.canvas.height / rect.height));
    if (x < 0 || y < 0 || x >= state.source.width || y >= state.source.height) return null;
    const p = (y * state.source.width + x) * 4;
    const d = state.source.data;
    return [d[p], d[p + 1], d[p + 2]];
}

// ---- rendering ----------------------------------------------------------

function options() {
    return {
        colors: state.colors,
        tolerance: Number(els.tolerance.value) / 100,
        softness: Number(els.softness.value) / 100,
        edgesOnly: els.edgesOnly.checked,
        despill: els.despill.checked,
    };
}

function scheduleRender() {
    if (!state.source || state.pending) return;
    state.pending = true;
    requestAnimationFrame(() => {
        state.pending = false;
        state.result = keyImage(state.source, options());
        draw();
    });
}

function draw() {
    if (!state.source) return;
    ctx.putImageData(state.comparing || !state.result ? state.source : state.result, 0, 0);
}

function updateSliderLabels() {
    els.toleranceValue.textContent = `${els.tolerance.value}%`;
    els.softnessValue.textContent = `${els.softness.value}%`;
}

// ---- export -------------------------------------------------------------

function resultCanvas() {
    const image = state.result || state.source;
    const bounds = els.trim.checked ? opaqueBounds(image) : null;
    const canvas = document.createElement('canvas');
    canvas.width = bounds ? bounds.width : image.width;
    canvas.height = bounds ? bounds.height : image.height;
    canvas.getContext('2d').putImageData(image, bounds ? -bounds.x : 0, bounds ? -bounds.y : 0);
    return canvas;
}

function download() {
    if (!state.source) return;
    resultCanvas().toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${state.fileName}-cutout.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        setStatus(`Saved ${link.download}.`);
    }, 'image/png');
}

// ---- events -------------------------------------------------------------

els.fileInput.addEventListener('change', () => loadFile(els.fileInput.files[0]));

els.canvas.addEventListener('click', (event) => {
    if (!state.source) return;
    const color = pixelAt(event);
    if (color) {
        addColor(color);
        setStatus(`Added ${hex(color)}.`);
    }
});

els.autoPick.addEventListener('click', () => {
    if (!state.source) return;
    state.colors = suggestKeyColors(state.source);
    renderSwatches();
    scheduleRender();
    setStatus('Picked the colours along the edges.');
});

els.reset.addEventListener('click', () => {
    state.colors = [];
    renderSwatches();
    scheduleRender();
    setStatus('Colours cleared. Click the image to pick the background.');
});

[els.tolerance, els.softness].forEach((input) => input.addEventListener('input', () => {
    updateSliderLabels();
    scheduleRender();
}));
[els.edgesOnly, els.despill].forEach((input) => input.addEventListener('change', scheduleRender));
els.download.addEventListener('click', download);

// Hold to compare with the original.
const startCompare = () => { state.comparing = true; draw(); };
const stopCompare = () => { state.comparing = false; draw(); };
els.compare.addEventListener('pointerdown', startCompare);
['pointerup', 'pointerleave', 'pointercancel'].forEach((name) => els.compare.addEventListener(name, stopCompare));

// Preview backdrop.
document.querySelectorAll('[data-backdrop]').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-backdrop]').forEach((b) => b.classList.toggle('active', b === button));
        els.canvasWrap.className = `bgr-canvas-wrap backdrop-${button.dataset.backdrop}`;
    });
});

// Drop and paste.
['dragenter', 'dragover'].forEach((name) => els.canvasWrap.addEventListener(name, (event) => {
    event.preventDefault();
    els.canvasWrap.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((name) => els.canvasWrap.addEventListener(name, () => els.canvasWrap.classList.remove('dragging')));
els.canvasWrap.addEventListener('drop', (event) => {
    event.preventDefault();
    loadFile(event.dataTransfer.files[0]);
});
window.addEventListener('paste', (event) => {
    const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile());
});

updateSliderLabels();

// ---- URage dashboard hooks ----------------------------------------------

window.__urageToolDescribeCurrentAsset = function describeCurrentAsset() {
    if (!state.source) return null;
    return {
        kind: 'image',
        label: `${state.fileName} cut-out`,
        fileName: `${state.fileName}-cutout.png`,
        dataUrl: resultCanvas().toDataURL('image/png'),
    };
};

window.__urageToolLoadAssetPayload = async function loadAssetPayload(payload) {
    const source = payload?.dataUrl || payload?.url || payload?.imageUrl;
    if (!source) return { accepted: false, reason: 'No image in the payload.' };
    try {
        const blob = await (await fetch(source)).blob();
        await loadImageFromBlob(blob, payload.fileName || payload.name || 'dashboard-image');
        return { accepted: true };
    } catch (error) {
        return { accepted: false, reason: String(error.message || error) };
    }
};
