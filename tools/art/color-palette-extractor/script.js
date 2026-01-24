const fInput = document.getElementById('file-input');
const output = document.getElementById('palette-output');
const contrastList = document.getElementById('contrast-list');
const historyList = document.getElementById('history-list');
const imgPreview = document.getElementById('image-preview');
const mCanvas = document.getElementById('main-canvas');
const mCtx = mCanvas.getContext('2d', { willReadFrequently: true });

let colors = [];
let currentImgBase64 = null;

function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', next);
    document.getElementById('theme-btn').innerText = next === 'dark' ? '☀️' : '🌙';
}

function clearHistory() {
    if(confirm("Permanently delete all saved analysis history?")) {
        localStorage.removeItem('arch_history');
        renderHistory();
    }
}

function saveToHistory(imgData, palette) {
    let history = JSON.parse(localStorage.getItem('arch_history') || '[]');
    if(history.length > 0 && history[0].img === imgData) return;
    
    history.unshift({ img: imgData, colors: palette, time: new Date().getTime() });
    if(history.length > 12) history.pop();
    localStorage.setItem('arch_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('arch_history') || '[]');
    if(history.length === 0) {
        historyList.innerHTML = '<p style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 20px;">No history records found.</p>';
        return;
    }
    historyList.innerHTML = '';
    history.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.onclick = () => restoreHistory(item);
        const paletteDivs = item.colors.slice(0, 10).map(c => `<div style="background:${c};flex:1"></div>`).join('');
        div.innerHTML = `<img src="${item.img}" class="history-thumb"><div class="history-palette">${paletteDivs}</div>`;
        historyList.appendChild(div);
    });
}

function restoreHistory(item) {
    colors = item.colors;
    currentImgBase64 = item.img;
    imgPreview.src = item.img;
    imgPreview.style.display = 'block';
    render();
}

fInput.onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
        const img = new Image();
        img.onload = () => {
            mCanvas.width = img.width; mCanvas.height = img.height;
            mCtx.drawImage(img, 0, 0);
            currentImgBase64 = re.target.result;
            imgPreview.src = currentImgBase64;
            imgPreview.style.display = 'block';
            process();
        };
        img.src = re.target.result;
    };
    reader.readAsDataURL(file);
};

function process() {
    const count = parseInt(document.getElementById('c-count').value);
    document.getElementById('c-val').innerText = count;
    const data = mCtx.getImageData(0, 0, mCanvas.width, mCanvas.height).data;
    
    let map = {};
    const step = data.length > 1000000 ? 240 : 120; // Dynamic step for performance
    for (let i = 0; i < data.length; i += step) {
        const r = data[i], g = data[i+1], b = data[i+2];
        map[`${r},${g},${b}`] = (map[`${r},${g},${b}`] || 0) + 1;
    }

    let sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    let final = [];
    for (let [rgb] of sorted) {
        if (final.length >= count) break;
        const cur = rgb.split(',').map(Number);
        if (final.every(ex => {
            const e = ex.split(',').map(Number);
            return Math.sqrt((cur[0]-e[0])**2 + (cur[1]-e[1])**2 + (cur[2]-e[2])**2) > 35;
        })) final.push(rgb);
    }

    colors = final.map(c => {
        const rgb = c.split(',').map(Number);
        return "#" + rgb.map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    });

    saveToHistory(currentImgBase64, colors);
    render();
}

function getLum(hex) {
    const i = parseInt(hex.slice(1), 16);
    const r = (i >> 16) & 255, g = (i >> 8) & 255, b = i & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function render() {
    output.innerHTML = ''; contrastList.innerHTML = '';
    const sort = document.getElementById('sort').value;
    if(sort === 'lum') colors.sort((a,b) => getLum(b) - getLum(a));

    colors.forEach((c, i) => {
        const swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.backgroundColor = c;
        const lum = getLum(c);
        swatch.innerHTML = `<span class="swatch-hex" style="color:${lum > 0.5 ? '#000' : '#fff'}; background:${lum > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}">${c}</span>`;
        output.appendChild(swatch);

        if (i < 8) {
            const ratio = (1.05) / (lum + 0.05);
            const item = document.createElement('div');
            item.className = `contrast-item ${ratio > 3 ? 'pass' : 'fail'}`;
            item.innerHTML = `<div style="color:${c}; font-weight:900; font-size:22px; font-family:'Inter'">Aa</div><div style="text-align:right"><div style="font-weight:700; font-size:13px">${ratio.toFixed(2)}:1</div><div style="font-size:9px; opacity:0.7">${ratio > 4.5 ? 'AAA' : ratio > 3 ? 'AA' : 'FAIL'}</div></div>`;
            contrastList.appendChild(item);
        }
    });
}

function downloadTexture() {
    if(colors.length === 0) return;
    const tex = document.createElement('canvas');
    tex.width = colors.length; tex.height = 1;
    const ctx = tex.getContext('2d');
    colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i,0,1,1); });
    const a = document.createElement('a');
    a.download = `palette_${Date.now()}.png`; a.href = tex.toDataURL(); a.click();
}

window.onload = () => {
    renderHistory();
    const saved = localStorage.getItem('last_palette');
    if (saved) {
        colors = JSON.parse(saved);
        render();
    }
};
