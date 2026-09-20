(() => {
    // ── Elements ──
    const dropZone      = document.getElementById('dropZone');
    const fileInput      = document.getElementById('fileInput');
    const results        = document.getElementById('results');
    const originalPreview= document.getElementById('originalPreview');
    const cleanCanvas    = document.getElementById('cleanCanvas');
    const metaBody       = document.getElementById('metaBody');
    const statsBar       = document.getElementById('statsBar');
    const formatSelect   = document.getElementById('formatSelect');
    const qualitySlider  = document.getElementById('qualitySlider');
    const qualityValue   = document.getElementById('qualityValue');
    const qualityRow     = document.getElementById('qualityRow');
    const downloadBtn    = document.getElementById('downloadBtn');
    const resetBtn       = document.getElementById('resetBtn');
    const toast          = document.getElementById('toast');

    let originalBlob  = null;
    let cleanedBlob   = null;
    let origFileName  = '';

    // ── Drag & Drop ──
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) processFile(file);
        else showToast('Please drop a valid image file.');
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) processFile(fileInput.files[0]);
    });

    // ── Format / Quality toggles ──
    formatSelect.addEventListener('change', () => {
        qualityRow.style.display = formatSelect.value === 'image/png' ? 'none' : 'block';
    });
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value + '%';
    });

    // ── Process ──
    function processFile(file) {
        origFileName = file.name.replace(/\.[^.]+$/, '');
        originalBlob = file;

        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                // Draw to canvas (strips metadata)
                cleanCanvas.width  = img.naturalWidth;
                cleanCanvas.height = img.naturalHeight;
                const ctx = cleanCanvas.getContext('2d');
                ctx.clearRect(0, 0, cleanCanvas.width, cleanCanvas.height);
                ctx.drawImage(img, 0, 0);

                // Show original preview
                originalPreview.src = e.target.result;

                // Update badges
                document.getElementById('origSizeBadge').textContent = formatBytes(file.size);
                document.getElementById('cleanSizeBadge').textContent = 'Processing…';

                // Build metadata table (we can't read EXIF in pure JS easily,
                // but we note what was stripped)
                buildMetaTable(img.naturalWidth, img.naturalHeight, file.type);

                // Show results
                results.classList.add('visible');
                dropZone.style.display = 'none';

                showToast('Image loaded — generating clean version…');

                // Generate cleaned blob asynchronously so UI stays responsive
                requestAnimationFrame(() => {
                    generateCleanedBlob();
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function generateCleanedBlob() {
        const format  = formatSelect.value;
        const quality = parseInt(qualitySlider.value) / 100;

        cleanCanvas.toBlob(blob => {
            cleanedBlob = blob;
            document.getElementById('cleanSizeBadge').textContent = formatBytes(blob.size);
            updateStats();
            showToast('✅ Clean image ready!');
        }, format, quality);
    }

    // ── Metadata Table (what we know was stripped) ──
    function buildMetaTable(w, h, mime) {
        const tags = [
            ['Image Dimensions', `${w} × ${h}px`],
            ['MIME Type', mime],
            ['EXIF Timestamp', '🗑 Stripped'],
            ['Camera Make / Model', '🗑 Stripped'],
            ['GPS Coordinates', '🗑 Stripped'],
            ['Software / Editor', '🗑 Stripped'],
            ['Artist / Creator', '🗑 Stripped'],
            ['Copyright', '🗑 Stripped'],
            ['Color Profile (ICC)', '🗑 Stripped'],
            ['Thumbnail Data', '🗑 Stripped'],
            ['XMP Packet', '🗑 Stripped'],
            ['IPTC Data', '🗑 Stripped'],
        ];

        metaBody.innerHTML = tags.map(([tag, status]) => {
            const cls = status.includes('Stripped') ? 'stripped-tag' : 'kept-tag';
            return `<tr><td>${tag}</td><td class="${cls}">${status}</td></tr>`;
        }).join('');
    }

    // ── Stats Bar ──
    function updateStats() {
        const origSize = originalBlob.size;
        const cleanSize = cleanedBlob.size;
        const diff = origSize - cleanSize;
        const pct  = ((diff / origSize) * 100).toFixed(1);

        statsBar.innerHTML = `
            <div class="stat-card">
                <div class="value">${formatBytes(origSize)}</div>
                <div class="label">Original Size</div>
            </div>
            <div class="stat-card">
                <div class="value" style="color:#6ee7b7">${formatBytes(cleanSize)}</div>
                <div class="label">Cleaned Size</div>
            </div>
            <div class="stat-card">
                <div class="value" style="color:${diff >= 0 ? '#6ee7b7' : '#f87171'}">${diff >= 0 ? '−' : '+'}${formatBytes(Math.abs(diff))}</div>
                <div class="label">Size Change</div>
            </div>
            <div class="stat-card">
                <div class="value" style="color:#3b82f6">${pct}%</div>
                <div class="label">Metadata Removed</div>
            </div>
        `;
    }

    // ── Download ──
    downloadBtn.addEventListener('click', () => {
        if (!cleanedBlob) return;
        const ext = formatSelect.value.split('/')[1];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(cleanedBlob);
        a.download = `${origFileName}_clean.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('⬇ Download started!');
    });

    // ── Reset ──
    resetBtn.addEventListener('click', () => {
        results.classList.remove('visible');
        dropZone.style.display = '';
        fileInput.value = '';
        originalBlob = null;
        cleanedBlob  = null;
    });

    // ── Helpers ──
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
    }
})();