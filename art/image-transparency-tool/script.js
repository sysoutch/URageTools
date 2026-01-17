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

function draw() {
    if (!originalImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = opacityRange.value / 100;
    ctx.drawImage(originalImage, 0, 0);
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
