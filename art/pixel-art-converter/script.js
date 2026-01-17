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
    const originalCanvas = document.getElementById('originalCanvas');
    const pixelCanvas = document.getElementById('pixelCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const pixelCtx = pixelCanvas.getContext('2d');

    pixelSizeValue.textContent = pixelSizeSlider.value;
    pixelSizeSlider.addEventListener('input', () => pixelSizeValue.textContent = pixelSizeSlider.value);

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
        for(let y=0;y<height;y+=actualPixelSize){
            for(let x=0;x<width;x+=actualPixelSize){
                const idx = (y*width+x)*4;
                const r=data[idx],g=data[idx+1],b=data[idx+2],a=data[idx+3];
                if(removeBg && a<128) continue;
                if(removeBg){
                    const bgRgb = hexToRgb(bgColor);
                    if(bgRgb && Math.abs(r-bgRgb.r)<30 && Math.abs(g-bgRgb.g)<30 && Math.abs(b-bgRgb.b)<30) continue;
                }
                pixelCtx.fillStyle=`rgba(${r},${g},${b},${a/255})`;
                pixelCtx.fillRect(x,y,actualPixelSize,actualPixelSize);
            }
        }
        downloadBtn.style.display='block';
        downloadScaledBtn.style.display='block';
    });

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
