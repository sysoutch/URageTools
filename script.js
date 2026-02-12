const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const engineSelect = document.getElementById('engineMode');
const codeOut = document.getElementById('code-output');
// const lavaCanvas = document.getElementById('lavaCanvas');
// const resetBtn = document.getElementById('resetBtn');
// const canvas = document.getElementById('mainCanvas');
// const viewport = document.getElementById('viewport');

const presets = {
    lava: ['#ff4e50', '#f9d423', '#e73c7e'],
    ocean: ['#23a6d5', '#23d5ab', '#000428'],
    cyber: ['#6a11cb', '#2575fc', '#ff00ff']
};

const config = {
    mode: 'waves',
    colors: [...presets.lava],
    baseLevel: 0.65,
    intensity: 30,
    globalSpeed: 1.0,
    waveParticles: [],
    waveLayers: [
        { speedMult: 0.002, freq: 0.01, amp: 1.2, opacity: 1.0, glow: true },
        { speedMult: 0.001, freq: 0.015, amp: 0.8, opacity: 0.6, glow: false },
        { speedMult: 0.003, freq: 0.008, amp: 1.0, opacity: 0.3, glow: false }
    ]
};

let gridParticles = [];
let waveYMap = [];
let mouse = { x: null, y: null, radius: 120 };

function applyPreset(name) {
    if (presets[name]) {
        config.colors = [...presets[name]];
        renderColorStack();
    }
}

function updateVisuals() {
    document.documentElement.style.setProperty('--primary', config.colors[0]);
    if (config.mode === 'particles') {
        const grad = `linear-gradient(-45deg, ${config.colors.join(', ')})`;
        viewport.style.background = grad;
        viewport.style.backgroundSize = "400% 400%";
        viewport.style.animation = "lavaFlow 15s ease infinite";
    } else {
        viewport.style.background = "#050505";
        viewport.style.animation = "none";
    }
}

function spawnWaveParticles(x, y, count, force, gravity) {
    for (let i = 0; i < count; i++) {
        config.waveParticles.push({
            x, y, vx: (Math.random() - 0.5) * force, vy: (Math.random() - 0.5) * force,
            size: Math.random() * 4 + 2, life: 1.0, gravity: gravity ? 0.2 : 0.05,
            color: config.colors[Math.floor(Math.random() * config.colors.length)]
        });
    }
}

function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (config.mode === 'waves') {
        const baseY = canvas.height * (1 - config.baseLevel);
        
        // Draw layers from back to front
        for (let i = config.waveLayers.length - 1; i >= 0; i--) {
            const layer = config.waveLayers[i];
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            
            for (let x = 0; x <= canvas.width; x += 3) {
                const y = baseY + (i * 15) + Math.sin(x * layer.freq + (time * layer.speedMult * config.globalSpeed)) * (config.intensity * layer.amp);
                ctx.lineTo(x, y);
                if (i === 0) waveYMap[x] = y;
            }
            
            ctx.lineTo(canvas.width, canvas.height);
            
            const colorIdx = i % config.colors.length;
            const mainColor = config.colors[colorIdx];
            
            // Front layer (i=0) is now fully opaque
            ctx.globalAlpha = (i === 0) ? 1.0 : layer.opacity;
            
            // Glow effect only for the front wave
            if (i === 0) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = mainColor;
            } else {
                ctx.shadowBlur = 0;
            }

            const grad = ctx.createLinearGradient(0, baseY - 50, 0, canvas.height);
            grad.addColorStop(0, mainColor);
            grad.addColorStop(1, '#000000');
            
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.shadowBlur = 0; // Reset for next layers
        }

        config.waveParticles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.life -= 0.015;
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            if (p.life <= 0) config.waveParticles.splice(i, 1);
        });
    } else {
        // Particle Mode
        gridParticles.forEach(p => {
            let dx = mouse.x - p.x; let dy = mouse.y - p.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < mouse.radius) {
                let f = (mouse.radius - dist) / mouse.radius;
                p.x -= (dx/dist) * f * p.den; p.y -= (dy/dist) * f * p.den;
            } else {
                p.x -= (p.x - p.bx) / 10; p.y -= (p.y - p.by) / 10;
            }
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2); ctx.fill();
        });
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
}

function initGrid() {
    gridParticles = [];
    for(let y=0; y<canvas.height; y+=25) for(let x=0; x<canvas.width; x+=25) 
        gridParticles.push({x, y, bx:x, by:y, sz:Math.random()*3+1, den:Math.random()*25+1});
}

viewport.addEventListener('mousemove', (e) => {
    mouse.x = e.offsetX; mouse.y = e.offsetY;
    if (config.mode === 'waves' && Math.random() > 0.8) {
        const r = document.createElement('div');
        r.className = 'ripple'; r.style.left = (mouse.x-25)+'px'; r.style.top = (mouse.y-25)+'px';
        viewport.appendChild(r); setTimeout(()=>r.remove(), 1000);
    }
});

viewport.addEventListener('mousedown', () => {
    mouse.radius = 250; setTimeout(()=>mouse.radius=120, 200);
    if(config.mode === 'waves') {
        const wy = waveYMap[Math.floor(mouse.x)] || canvas.height/2;
        spawnWaveParticles(mouse.x, mouse.y, 35, 10, mouse.y < wy);
    }
});

window.addEventListener('resize', () => { canvas.width = viewport.clientWidth; canvas.height = viewport.clientHeight; if(config.mode==='particles') initGrid(); });

config.mode = 'particles';
updateVisuals();
window.dispatchEvent(new Event('resize'));
animate(0);


// Accordion functionality - moved to end to avoid conflicts with other code
function initAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            // Prevent the click from propagating to other elements
            e.stopPropagation();
            
            const accordionItem = this.parentElement;
            const accordionContent = this.nextElementSibling;
            
            // Toggle the active class on the header
            this.classList.toggle('active');
            
            // Toggle the open class on the content
            accordionContent.classList.toggle('open');
            
            // Close other accordions when this one opens
            const allAccordionItems = document.querySelectorAll('.accordion-item');
            allAccordionItems.forEach(item => {
                if (item !== accordionItem) {
                    const otherContent = item.querySelector('.accordion-content');
                    const otherHeader = item.querySelector('.accordion-header');
                    if (otherContent.classList.contains('open')) {
                        otherContent.classList.remove('open');
                        otherHeader.classList.remove('active');
                    }
                }
            });
        });
    });
}

// Initialize accordion after DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordion);
} else {
    initAccordion();
}
