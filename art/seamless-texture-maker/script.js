const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
let fullResImg = null;
let scene, camera, renderer, mesh, material, texture;

function init3D() {
    const container = document.getElementById('three-container');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    setShape('sphere');

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 2));
    camera.position.z = 3.5;

    function animate() {
        requestAnimationFrame(animate);
        if(mesh) mesh.rotation.y += 0.003;
        renderer.render(scene, camera);
    }
    animate();
}

function setShape(type) {
    if (mesh) scene.remove(mesh);
    let geo;
    if (type === 'sphere') geo = new THREE.SphereGeometry(1, 64, 64);
    else if (type === 'box') geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    else geo = new THREE.PlaneGeometry(2.5, 2.5);
    mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase() === type));
}

document.getElementById('img-upload').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => { fullResImg = img; update(); };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
};

document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', update));

function update() {
    if (!fullResImg) return;
    const maskType = document.getElementById('mask-type').value;
    const soft = parseInt(document.getElementById('softness').value);
    const jit = parseInt(document.getElementById('jitter').value);
    const scale = parseInt(document.getElementById('tile-scale').value);

    document.getElementById('soft-val').innerText = soft + 'px';
    document.getElementById('jit-val').innerText = jit + '%';
    document.getElementById('tile-val').innerText = `${scale}x${scale}`;

    const w = fullResImg.width;
    const h = fullResImg.height;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    if (maskType === 'mirror') {
        ctx.save();
        ctx.scale(0.5, 0.5);
        ctx.drawImage(fullResImg, 0, 0);
        ctx.scale(-1, 1); ctx.drawImage(fullResImg, -2*w, 0);
        ctx.scale(1, -1); ctx.drawImage(fullResImg, -2*w, -2*h);
        ctx.scale(-1, 1); ctx.drawImage(fullResImg, 0, -2*h);
        ctx.restore();
    } else {
        // Quad Stitch
        ctx.drawImage(fullResImg, w/2, h/2, w/2, h/2, 0, 0, w/2, h/2);
        ctx.drawImage(fullResImg, 0, h/2, w/2, h/2, w/2, 0, w/2, h/2);
        ctx.drawImage(fullResImg, w/2, 0, w/2, h/2, 0, h/2, w/2, h/2);
        ctx.drawImage(fullResImg, 0, 0, w/2, h/2, w/2, h/2, w/2, h/2);

        const mask = document.createElement('canvas');
        mask.width = w; mask.height = h;
        const mCtx = mask.getContext('2d');

        if (maskType === 'noise') {
            // Generate Organic Noise Mask
            for(let i=0; i< (soft * 10); i++) {
                mCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
                const x = (w/2 - soft) + Math.random() * (soft * 2);
                const y = Math.random() * h;
                mCtx.beginPath(); mCtx.arc(x, y, Math.random() * 20, 0, Math.PI*2); mCtx.fill();
                
                const x2 = Math.random() * w;
                const y2 = (h/2 - soft) + Math.random() * (soft * 2);
                mCtx.beginPath(); mCtx.arc(x2, y2, Math.random() * 20, 0, Math.PI*2); mCtx.fill();
            }
        } else {
            const gV = mCtx.createLinearGradient(w/2 - soft, 0, w/2 + soft, 0);
            gV.addColorStop(0, 'transparent'); gV.addColorStop(0.5, 'black'); gV.addColorStop(1, 'transparent');
            mCtx.fillStyle = gV; mCtx.fillRect(0,0,w,h);
            const gH = mCtx.createLinearGradient(0, h/2 - soft, 0, h/2 + soft);
            gH.addColorStop(0, 'transparent'); gH.addColorStop(0.5, 'black'); gH.addColorStop(1, 'transparent');
            mCtx.globalCompositeOperation = 'screen';
            mCtx.fillStyle = gH; mCtx.fillRect(0,0,w,h);
        }

        const temp = document.createElement('canvas');
        temp.width = w; temp.height = h;
        const tCtx = temp.getContext('2d');
        
        // Apply Jitter to the center patch
        if (jit > 0) tCtx.filter = `hue-rotate(${jit}deg) saturate(${100+jit}%)`;
        tCtx.drawImage(fullResImg, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(mask, 0, 0);

        ctx.drawImage(temp, 0, 0);
    }

    if(texture) texture.dispose();
    texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(scale, scale);
    material.map = texture;
    material.needsUpdate = true;
}

function download() {
    if(!fullResImg) return;
    const link = document.createElement('a');
    link.download = 'seamless_v8_organic.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

window.onload = init3D;
