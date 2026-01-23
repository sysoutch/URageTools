const themeBtn = document.getElementById('theme-btn');
const themes = ['dark', 'light', 'inferno'];
const themeIcons = { dark: '🌙', light: '☀️', inferno: '🔥' };

themeBtn.onclick = () => {
    let current = document.body.getAttribute('data-theme');
    let next = themes[(themes.indexOf(current) + 1) % themes.length];
    document.body.setAttribute('data-theme', next);
    themeBtn.innerText = themeIcons[next];
};

const slider = document.getElementById('pixelSizeSlider');
const sliderVal = document.getElementById('pixelSizeValue');
slider.oninput = () => sliderVal.innerText = slider.value;

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadScaledBtn = document.getElementById('downloadScaledBtn');
    const pixelSizeSlider = document.getElementById('pixelSizeSlider');
    const pixelSizeValue = document.getElementById('pixelSizeValue');
    const autoScaleCheckbox = document.getElementById('autoScaleCheckbox');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const pickColorBtn = document.getElementById('pickColorBtn');
    const removeBgCheckbox = document.getElementById('removeBgCheckbox');
    const autoConvertCheckbox = document.getElementById('autoConvertCheckbox');
    const originalCanvas = document.getElementById('originalCanvas');
    const pixelCanvas = document.getElementById('pixelCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const pixelCtx = pixelCanvas.getContext('2d');

    pixelSizeValue.textContent = pixelSizeSlider.value;
    pixelSizeSlider.addEventListener('input', () => pixelSizeValue.textContent = pixelSizeSlider.value);

    // Add event listeners for auto-convert
    pixelSizeSlider.addEventListener('input', function() {
        if (autoConvertCheckbox.checked && originalCanvas.width && originalCanvas.height) {
            convertImage();
        }
    });

    autoScaleCheckbox.addEventListener('change', function() {
        if (autoConvertCheckbox.checked && originalCanvas.width && originalCanvas.height) {
            convertImage();
        }
    });

    removeBgCheckbox.addEventListener('change', function() {
        if (autoConvertCheckbox.checked && originalCanvas.width && originalCanvas.height) {
            convertImage();
        }
    });

    bgColorPicker.addEventListener('input', function() {
        if (autoConvertCheckbox.checked && originalCanvas.width && originalCanvas.height) {
            convertImage();
        }
    });

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    originalCanvas.width = img.width;
                    originalCanvas.height = img.height;
                    pixelCanvas.width = img.width;
                    pixelCanvas.height = img.height;
                    originalCtx.drawImage(img, 0, 0);
                    const pixelData = originalCtx.getImageData(0, 0, 1, 1).data;
                    const hexColor = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
                    bgColorPicker.value = hexColor;
                    originalCanvas.classList.remove('hidden');
                    pixelCanvas.classList.remove('hidden');
                    convertBtn.disabled = false;
                    
                    // Auto-convert if enabled
                    if (autoConvertCheckbox.checked) {
                        convertImage();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) } : null;
    }

    pickColorBtn.addEventListener('click', function() {
        if (!originalCanvas.classList.contains('hidden')) {
            const rect = originalCanvas.getBoundingClientRect();
            const x = rect.left;
            const y = rect.top;
            const imageData = originalCtx.getImageData(x, y, 1, 1);
            const rgb = imageData.data;
            const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
            bgColorPicker.value = hex;
        }
    });

    convertBtn.addEventListener('click', function() {
        if (!originalCanvas.width || !originalCanvas.height) {
            alert('Please select an image first!');
            return;
        }
        convertImage();
    });

    // Function to perform the image conversion
    function convertImage() {
        const pixelSize = parseInt(pixelSizeSlider.value);
        const autoScale = autoScaleCheckbox.checked;
        const removeBg = removeBgCheckbox.checked;
        const bgColor = bgColorPicker.value;
        const width = originalCanvas.width;
        const height = originalCanvas.height;
        let actualPixelSize = pixelSize;
        if (autoScale) {
            const referenceWidth = 1024;
            const referenceHeight = 1024;
            const scaleX = width / referenceWidth;
            const scaleY = height / referenceHeight;
            const scaleFactor = (scaleX + scaleY)/2;
            actualPixelSize = Math.max(1, Math.min(64, Math.round(pixelSize*scaleFactor)));
        }
        pixelCtx.clearRect(0,0,pixelCanvas.width,pixelCanvas.height);
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx.drawImage(originalCanvas,0,0);
        const imageData = tempCtx.getImageData(0,0,width,height);
        const data = imageData.data;
        const checkerboardPattern = createCheckerboardPattern(8);
        pixelCtx.fillStyle = checkerboardPattern;
        pixelCtx.fillRect(0,0,pixelCanvas.width,pixelCanvas.height);
        
        // Process image to pixel art using block-based approach
        for(let y = 0; y < height; y += actualPixelSize) {
            for(let x = 0; x < width; x += actualPixelSize) {
                // Get the dominant color in this block
                const dominantColor = getDominantColorInBlock(data, x, y, width, height, actualPixelSize);
                
                // Skip if removing background and this is background color
                if(removeBg) {
                    const bgRgb = hexToRgb(bgColor);
                    if(bgRgb && Math.abs(dominantColor.r-bgRgb.r)<30 && Math.abs(dominantColor.g-bgRgb.g)<30 && Math.abs(dominantColor.b-bgRgb.b)<30) {
                        continue;
                    }
                }
                
                // Draw the block with the dominant color
                pixelCtx.fillStyle = `rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},${dominantColor.a/255})`;
                pixelCtx.fillRect(x, y, actualPixelSize, actualPixelSize);
            }
        }
        downloadBtn.style.display='block';
        downloadScaledBtn.style.display='block';
		
		document.getElementById('originalCanvas').classList.remove('hidden');
		document.getElementById('pixelCanvas').classList.remove('hidden');
		document.getElementById('downloadBtn').style.display = 'flex';
		document.getElementById('downloadScaledBtn').style.display = 'flex';
    };

    function getDominantColorInBlock(data, startX, startY, width, height, blockSize) {
        let colorCount = {};
        let totalPixels = 0;

        for (let y = 0; y < blockSize && startY + y < height; y++) {
            for (let x = 0; x < blockSize && startX + x < width; x++) {
                const idx = ((startY + y) * width + (startX + x)) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                // Skip transparent pixels
                if (a < 255) continue;

                const color = {
                    r: r,
                    g: g,
                    b: b,
                    a: a
                };

                const colorKey = `${color.r},${color.g},${color.b},${color.a}`;
                if (colorCount[colorKey]) {
                    colorCount[colorKey]++;
                } else {
                    colorCount[colorKey] = 1;
                }
                totalPixels++;
            }
        }

        const dominantColorKey = Object.keys(colorCount).reduce((a, b) => colorCount[a] > colorCount[b] ? a : b, null);
        if (!dominantColorKey) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        const [r, g, b, a] = dominantColorKey.split(',').map(Number);
        return { r, g, b, a };
    }

    function createCheckerboardPattern(size){
        const canvas=document.createElement('canvas');
        canvas.width=size*2;
        canvas.height=size*2;
        const ctx=canvas.getContext('2d');
        const lightGray='#cccccc',darkGray='#999999';
        ctx.fillStyle=darkGray; ctx.fillRect(0,0,size,size);
        ctx.fillStyle=lightGray; ctx.fillRect(size,0,size,size);
        ctx.fillStyle=lightGray; ctx.fillRect(0,size,size,size);
        ctx.fillStyle=darkGray; ctx.fillRect(size,size,size,size);
        return ctx.createPattern(canvas,'repeat');
    }

    downloadBtn.addEventListener('click',function(){
        if(!pixelCanvas.width||!pixelCanvas.height){alert('No pixel art to download!'); return;}
        const downloadCanvas=document.createElement('canvas');
        const downloadCtx=downloadCanvas.getContext('2d');
        downloadCanvas.width=pixelCanvas.width;
        downloadCanvas.height=pixelCanvas.height;
        const checkerboardPattern=createCheckerboardPattern(8);
        downloadCtx.fillStyle=checkerboardPattern;
        downloadCtx.fillRect(0,0,downloadCanvas.width,downloadCanvas.height);
        downloadCtx.drawImage(pixelCanvas,0,0);
        const link=document.createElement('a');
        link.download='pixel-art.png';
        link.href=downloadCanvas.toDataURL('image/png');
        link.click();
    });

    downloadScaledBtn.addEventListener('click',function(){
        if(!pixelCanvas.width||!pixelCanvas.height){alert('No pixel art to download!'); return;}
        const scale=3;
        const scaledCanvas=document.createElement('canvas');
        const scaledCtx=scaledCanvas.getContext('2d');
        scaledCanvas.width=pixelCanvas.width*scale;
        scaledCanvas.height=pixelCanvas.height*scale;
        scaledCtx.imageSmoothingEnabled=false;
        scaledCtx.webkitImageSmoothingEnabled=false;
        scaledCtx.mozImageSmoothingEnabled=false;
        const checkerboardPattern=createCheckerboardPattern(8*scale);
        scaledCtx.fillStyle=checkerboardPattern;
        scaledCtx.fillRect(0,0,scaledCanvas.width,scaledCanvas.height);
        scaledCtx.drawImage(pixelCanvas,0,0,scaledCanvas.width,scaledCanvas.height);
        const link=document.createElement('a');
        link.download='pixel-art-scaled.png';
        link.href=scaledCanvas.toDataURL('image/png');
        link.click();
    });

    convertBtn.disabled=true;
});
