const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const zip = new JSZip();

// Set canvas to high resolution for better quality
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

fileInput.onchange = function(e) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            if(img.width !== img.height) {
                alert("Warning: For best results, use a square image!");
            }
            processImages(img);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
};

async function processImages(img) {
    const sizes = [
        { n: 'favicon-16x16.png', s: 16, id: 'p16' },
        { n: 'favicon-32x32.png', s: 32, id: 'p32' },
        { n: 'apple-touch-icon.png', s: 180, id: 'p180' },
        { n: 'android-chrome-192x192.png', s: 192 },
        { n: 'android-chrome-512x512.png', s: 512 }
    ];

    const imgFolder = zip.folder("icons");

    for (const item of sizes) {
        canvas.width = item.s;
        canvas.height = item.s;
        ctx.clearRect(0, 0, item.s, item.s);
        
        // Use high quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Calculate crop area to center the image
        const imgSize = Math.min(img.width, img.height);
        const startX = (img.width - imgSize) / 2;
        const startY = (img.height - imgSize) / 2;
        
        // For small sizes, we'll use a 4x larger canvas for rendering to improve quality
        if (item.s <= 32) {
            // Create a high-resolution canvas for small favicons
            const scale = 4;
            const highResCanvas = document.createElement('canvas');
            const highResCtx = highResCanvas.getContext('2d');
            highResCanvas.width = item.s * scale;
            highResCanvas.height = item.s * scale;
            
            // Set high quality rendering for the high-res canvas
            highResCtx.imageSmoothingEnabled = true;
            highResCtx.imageSmoothingQuality = 'high';
            
            // Draw the cropped image to the high-res canvas
            highResCtx.drawImage(img, startX, startY, imgSize, imgSize, 0, 0, highResCanvas.width, highResCanvas.height);
            
            // Draw the high-res image to the low-res canvas with high quality
            ctx.drawImage(highResCanvas, 0, 0, highResCanvas.width, highResCanvas.height, 0, 0, item.s, item.s);
        } else {
            // For larger sizes, maintain aspect ratio and center the image
            ctx.drawImage(img, startX, startY, imgSize, imgSize, 0, 0, item.s, item.s);
        }

        // Convert canvas to blob
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 1.0));
        zip.file(item.n, blob);

        // Update preview UI if ID exists
        if (item.id) {
            document.getElementById(item.id).src = URL.createObjectURL(blob);
        }
    }

    // Create Manifest File
    const manifest = {
        "name": "URage Toolset App",
        "short_name": "URage",
        "icons": [
            { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
            { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
        ],
        "theme_color": "#00ffcc",
        "background_color": "#121212",
        "display": "standalone"
    };
    zip.file("site.webmanifest", JSON.stringify(manifest, null, 2));

    document.getElementById('previewGrid').style.display = 'grid';
    document.getElementById('dlBtn').style.display = 'block';
    document.getElementById('codeSnippet').style.display = 'block';
    document.getElementById('status').innerText = "Bundle ready for export!";
}

function downloadBundle() {
    zip.generateAsync({type:"blob"}).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "urage-favicon-bundle.zip";
        link.click();
    });
}