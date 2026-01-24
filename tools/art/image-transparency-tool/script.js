const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const opacityRange = document.getElementById('opacityRange');
const opacityValue = document.getElementById('opacityValue');
const downloadBtn = document.getElementById('download');

let originalImage = null;

upload.addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        originalImage = new Image();
        originalImage.onload = () => {
            // Set canvas size to match image
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            
            // Check if image is already transparent and set slider accordingly
            checkImageTransparency(originalImage);
            
            draw();
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
});

opacityRange.addEventListener('input', () => {
    opacityValue.innerText = opacityRange.value + '%';
    draw();
});

let originalPixels = null; 
let maxAlphaInImage = 255; // Default to fully opaque

function checkImageTransparency(image) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    tempCtx.drawImage(image, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    originalPixels = imageData.data; 

    maxAlphaInImage = 0;
    for (let i = 3; i < originalPixels.length; i += 4) {
        if (originalPixels[i] > maxAlphaInImage) {
            maxAlphaInImage = originalPixels[i];
        }
    }

    // If maxAlpha is 0 (fully empty image), default to 255 to avoid division by zero
    if (maxAlphaInImage === 0) maxAlphaInImage = 255;
    
    const detectedOpacity = Math.round((maxAlphaInImage / 255) * 100);
    opacityRange.value = detectedOpacity;
    opacityValue.innerText = detectedOpacity + '%';
    
    draw();
}

function draw() {
    if (!originalPixels) return;

    const targetOpacityPercent = opacityRange.value / 100; // e.g., 1.0 (100%)
    const newImageData = ctx.createImageData(canvas.width, canvas.height);
    const data = newImageData.data;

    for (let i = 0; i < originalPixels.length; i += 4) {
        data[i]     = originalPixels[i];     
        data[i + 1] = originalPixels[i + 1]; 
        data[i + 2] = originalPixels[i + 2]; 
        
        // NORMALIZE THE ALPHA:
        // 1. Get the original alpha (e.g., 127)
        // 2. Divide by max found in image (e.g., 127) to get 1.0 (fully solid)
        // 3. Multiply by the slider's target (e.g., 1.0 for 100%)
        let normalizedAlpha = (originalPixels[i + 3] / maxAlphaInImage) * 255 * targetOpacityPercent;
        
        // Ensure we don't exceed 255
        data[i + 3] = Math.min(255, normalizedAlpha);
    }

    ctx.putImageData(newImageData, 0, 0);
}

downloadBtn.addEventListener('click', () => {
    if (!originalImage) {
        alert("Please upload an image first!");
        return;
    }
    const link = document.createElement('a');
    link.download = 'transparent-result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
