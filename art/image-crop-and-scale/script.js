const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const previews = document.getElementById('previews');
const dlAllBtn = document.getElementById('download-all-btn');
const modeSelect = document.getElementById('mode-select');
const globalStrategy = document.getElementById('global-strategy');
const bgPicker = document.getElementById('bg-picker');
const themeBtn = document.getElementById('theme-btn');
const resetFocusBtn = document.getElementById('reset-focus');

let sourceImg = null;
let customList = [];
let overrides = {}; 
let focusPoint = { x: 0.5, y: 0.5 };

const themes = ['dark', 'light', 'inferno'];
const themeIcons = { dark: '🌙', light: '☀️', inferno: '🔥' };

themeBtn.onclick = () => {
    let current = document.body.getAttribute('data-theme');
    let next = themes[(themes.indexOf(current) + 1) % themes.length];
    document.body.setAttribute('data-theme', next);
    themeBtn.innerText = themeIcons[next];
};

resetFocusBtn.onclick = () => {
    focusPoint = { x: 0.5, y: 0.5 };
    if(sourceImg) render();
};

const presets = {
    unity: [{id:'u1', name:"Cover", w:1950, h:1300},{id:'u2', name:"Social", w:1200, h:630},{id:'u3', name:"Card", w:420, h:280},{id:'u4', name:"Icon", w:160, h:160}],
    steam: [{id:'s1', name:"Main", w:616, h:353},{id:'s2', name:"Header", w:460, h:215},{id:'s3', name:"Small", w:231, h:87},{id:'s4', name:"Hero", w:1920, h:620}],
    epic: [{id:'e1', name:"Landscape", w:2560, h:1440},{id:'e2', name:"Portrait", w:1200, h:1600},{id:'e3', name:"Thumb", w:400, h:400}],
    mobile: [{id:'m1', name:"Icon", w:1024, h:1024},{id:'m2', name:"Feature", w:1024, h:500},{id:'m3', name:"Screen", w:1242, h:2208}],
    social: [{id:'so1', name:"YT Thumb", w:1280, h:720},{id:'so2', name:"X Header", w:1500, h:500},{id:'so3', name:"IG Post", w:1080, h:1080}]
};

globalStrategy.onchange = () => { if(sourceImg) render(); };
bgPicker.oninput = () => { if(sourceImg) render(); };
modeSelect.onchange = () => { document.getElementById('custom-ui').style.display = modeSelect.value === 'custom' ? 'block' : 'none'; if(sourceImg) render(); };

dropZone.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => { sourceImg = img; render(); dlAllBtn.disabled = false; };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
};

function render() {
    previews.innerHTML = '';
    let specs = modeSelect.value === 'custom' ? customList : presets[modeSelect.value];
    if (!sourceImg) return;

    specs.forEach(spec => {
        const strategy = overrides[spec.id] || globalStrategy.value;
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="asset-header"><strong>${spec.name}</strong><span>${spec.w}×${spec.h}</span></div>
            <div class="canvas-container" onclick="setFocus(event, '${spec.id}', ${spec.w}, ${spec.h})"><canvas id="canvas-${spec.id}"></canvas></div>
            <div class="card-actions">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <label style="font-size:0.6rem">Individual Strategy:</label>
                    <select class="strategy-select" onchange="updateOverride('${spec.id}', this.value)">
                        <option value="cover" ${strategy === 'cover' ? 'selected' : ''}>Crop</option>
                        <option value="contain" ${strategy === 'contain' ? 'selected' : ''}>Scale</option>
                    </select>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-primary" style="flex:1; font-size:0.65rem;" onclick="downloadSingle('${spec.id}', '${spec.name}')">💾 PNG</button>
                    ${modeSelect.value === 'custom' ? `<button class="btn btn-danger" style="padding:5px;" onclick="removeCustom('${spec.id}')">🗑️</button>` : ''}
                </div>
            </div>`;
        previews.appendChild(card);
        drawCrop(spec, strategy);
    });
}

window.updateOverride = (id, val) => { overrides[id] = val; render(); };

function drawCrop(spec, strategy) {
    const canvas = document.getElementById(`canvas-${spec.id}`);
    const ctx = canvas.getContext('2d');
    canvas.width = spec.w; canvas.height = spec.h;
    ctx.fillStyle = bgPicker.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let scale = strategy === 'cover' 
        ? Math.max(spec.w / sourceImg.width, spec.h / sourceImg.height)
        : Math.min(spec.w / sourceImg.width, spec.h / sourceImg.height);

    const centerX = sourceImg.width * focusPoint.x;
    const centerY = sourceImg.height * focusPoint.y;

    let drawX = (spec.w / 2) - (centerX * scale);
    let drawY = (spec.h / 2) - (centerY * scale);

    if (strategy === 'cover') {
        drawX = Math.min(0, Math.max(drawX, spec.w - sourceImg.width * scale));
        drawY = Math.min(0, Math.max(drawY, spec.h - sourceImg.height * scale));
    } else {
        drawX = (spec.w - sourceImg.width * scale) / 2;
        drawY = (spec.h - sourceImg.height * scale) / 2;
    }

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImg, drawX, drawY, sourceImg.width * scale, sourceImg.height * scale);
}

window.setFocus = (event, id, targetW, targetH) => {
    const strategy = overrides[id] || globalStrategy.value;
    if (strategy === 'contain') return; 
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width; 
    const clickY = (event.clientY - rect.top) / rect.height; 
    const scale = Math.max(targetW / sourceImg.width, targetH / sourceImg.height);
    const centerX = sourceImg.width * focusPoint.x;
    const centerY = sourceImg.height * focusPoint.y;
    let drawX = Math.min(0, Math.max((targetW / 2) - (centerX * scale), targetW - sourceImg.width * scale));
    let drawY = Math.min(0, Math.max((targetH / 2) - (centerY * scale), targetH - sourceImg.height * scale));
    focusPoint.x = (clickX * targetW - drawX) / (scale * sourceImg.width);
    focusPoint.y = (clickY * targetH - drawY) / (scale * sourceImg.height);
    render();
};

document.getElementById('add-custom').onclick = () => {
    const w = parseInt(document.getElementById('custom-w').value);
    const h = parseInt(document.getElementById('custom-h').value);
    if (w > 0 && h > 0) {
        customList.push({ id: 'c'+Date.now(), name: `Custom ${w}x${h}`, w, h });
        render();
    }
};

window.removeCustom = (id) => { customList = customList.filter(i => i.id !== id); render(); };
window.downloadSingle = (id, name) => {
    const canvas = document.getElementById(`canvas-${id}`);
    const link = document.createElement('a');
    link.download = `${name}.png`; link.href = canvas.toDataURL(); link.click();
};

dlAllBtn.onclick = async () => {
    const zip = new JSZip();
    const specs = modeSelect.value === 'custom' ? customList : presets[modeSelect.value];
    for (const s of specs) {
        const blob = await new Promise(r => document.getElementById(`canvas-${s.id}`).toBlob(r));
        zip.file(`${s.name}.png`, blob);
    }
    const content = await zip.generateAsync({type: "blob"});
    const a = document.createElement('a'); a.href = URL.createObjectURL(content); a.download = "assets.zip"; a.click();
};