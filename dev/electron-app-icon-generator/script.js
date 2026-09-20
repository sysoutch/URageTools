window.registerDashboardThemeSync();
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.getElementById('dropArea');
    const previewSection = document.getElementById('previewSection');
    let sourceImg = null;

    const DPI_SCALES = [
        { suffix: '', scale: 1 },
        { suffix: '@1.25x', scale: 1.25 },
        { suffix: '@1.33x', scale: 1.33 },
        { suffix: '@1.5x', scale: 1.5 },
        { suffix: '@2x', scale: 2 },
        { suffix: '@3x', scale: 3 },
        { suffix: '@4x', scale: 4 },
        { suffix: '@5x', scale: 5 }
    ];

    dropArea.onclick = () => fileInput.click();
    fileInput.onchange = (e) => loadFile(e.target.files[0]);
    dropArea.ondragover = (e) => { e.preventDefault(); dropArea.style.borderColor = "var(--forge-blue)"; };
    dropArea.ondragleave = () => dropArea.style.borderColor = "#444";
    dropArea.ondrop = (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); };

    function loadFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                sourceImg = img;
                previewSection.style.display = 'flex';
                dropArea.innerHTML = `<strong>File Loaded:</strong> ${file.name}`;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function resize(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceImg, 0, 0, size, size);
        return new Promise(res => canvas.toBlob(res, 'image/png'));
    }

    // Binary ICO and ICNS logic (same as previous optimized version)
    async function createICO() {
        const sizes = [16, 32, 48, 64, 128, 256];
        const blobs = await Promise.all(sizes.map(s => resize(s)));
        const buffers = await Promise.all(blobs.map(b => b.arrayBuffer()));
        const header = new Uint8Array([0, 0, 1, 0, blobs.length, 0]);
        const directory = new Uint8Array(blobs.length * 16);
        let offset = 6 + (blobs.length * 16);
        for (let i = 0; i < blobs.length; i++) {
            const s = sizes[i] === 256 ? 0 : sizes[i];
            directory.set([s, s, 0, 0, 1, 0, 32, 0], i * 16);
            new DataView(directory.buffer).setUint32(i * 16 + 8, buffers[i].byteLength, true);
            new DataView(directory.buffer).setUint32(i * 16 + 12, offset, true);
            offset += buffers[i].byteLength;
        }
        return new Blob([header, directory, ...buffers]);
    }

    async function createICNS() {
        const mappings = [{id:'icp4',s:16},{id:'icp5',s:32},{id:'icp6',s:64},{id:'ic07',s:128},{id:'ic08',s:256},{id:'ic09',s:512},{id:'ic10',s:1024}];
        const frames = await Promise.all(mappings.map(async m => ({id:m.id, buf: await (await resize(m.s)).arrayBuffer()})));
        let total = 8 + frames.reduce((a, b) => a + b.buf.byteLength + 8, 0);
        const out = new Uint8Array(total);
        out.set([105, 99, 110, 115]);
        new DataView(out.buffer).setUint32(4, total);
        let off = 8;
        frames.forEach(f => {
            out.set(f.id.split('').map(c=>c.charCodeAt(0)), off);
            new DataView(out.buffer).setUint32(off+4, f.buf.byteLength+8);
            out.set(new Uint8Array(f.buf), off+8);
            off += f.buf.byteLength + 8;
        });
        return new Blob([out]);
    }

    async function generateBundle(type) {
        const zip = new JSZip();
        if (type === 'icons') {
            zip.file("icon.ico", await createICO());
            zip.file("icon.icns", await createICNS());
            zip.file("icon.png", await resize(512));
        } else {
            // High-DPI logic: Based on a standard 32x32 base asset size
            // (You can change 32 to any base size you need for your UI)
            const baseSize = 32;
            for (const item of DPI_SCALES) {
                const size = Math.round(baseSize * item.scale);
                zip.file(`icon${item.suffix}.png`, await resize(size));
            }
        }
        const content = await zip.generateAsync({type:"blob"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = type === 'icons' ? "forge_app_icons.zip" : "high_dpi_assets.zip";
        a.click();
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Failed to read generated icon asset.'));
            reader.readAsDataURL(blob);
        });
    }

    async function describeCurrentAssets() {
        if (!sourceImg) return [];
        const iconPng = await resize(512);
        return [{
            kind: 'image',
            title: 'Electron App Icon PNG',
            fileName: 'icon.png',
            mimeType: 'image/png',
            dataUrl: await blobToDataUrl(iconPng),
            width: 512,
            height: 512,
            previewKind: 'image',
            sourceDetail: 'Generated 512px Electron app icon.',
            metadata: { sourceTool: 'electron-app-icon-generator', resourceFormat: 'png-icon' }
        }];
    }

    window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
    window.__urageToolDescribeCurrentAsset = async () => (await describeCurrentAssets())[0] || null;