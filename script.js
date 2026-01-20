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


// function resizeCanvas() {
//     lavaCanvas.width = lavaCanvas.parentElement.clientWidth;
//     lavaCanvas.height = lavaCanvas.parentElement.clientHeight;
// }

// // Initial resize
// resizeCanvas();
// window.addEventListener('resize', resizeCanvas);

// // Lava properties
// const lava = {
//     waves: [],
//     particles: [],
//     color: '#ff3300',
//     baseHeight: 0.7,
//     waveHeight: 0.1,
//     waveSpeed: 0.01,
//     waveFrequency: 0.02,
//     particleCount: 100
// };

// // Initialize waves
// function initWaves() {
//     lava.waves = [];
//     for (let i = 0; i < 5; i++) {
//         lava.waves.push({
//             amplitude: 10 + Math.random() * 20,
//             frequency: 0.01 + Math.random() * 0.03,
//             phase: Math.random() * Math.PI * 2,
//             speed: 0.005 + Math.random() * 0.01,
//             color: `rgba(255, ${50 + Math.random() * 100}, 0, ${0.7 + Math.random() * 0.3})`
//         });
//     }
    
//     // Initialize particles
//     lava.particles = [];
//     for (let i = 0; i < lava.particleCount; i++) {
//         lava.particles.push({
//             x: Math.random() * lavaCanvas.width,
//             y: lavaCanvas.height * lava.baseHeight + Math.random() * 50,
//             size: 2 + Math.random() * 5,
//             speed: 0.5 + Math.random() * 2,
//             angle: Math.random() * Math.PI * 2,
//             opacity: 0.5 + Math.random() * 0.5,
//             color: `rgba(255, ${100 + Math.random() * 155}, 0, ${0.5 + Math.random() * 0.5})`
//         });
//     }
// }

// // Create ripple effect
// function createRipple(x, y) {
//     const ripple = document.createElement('div');
//     ripple.className = 'ripple';
//     ripple.style.left = `${x - 20}px`;
//     ripple.style.top = `${y - 20}px`;
//     ripple.style.width = '40px';
//     ripple.style.height = '40px';
//     ripple.style.backgroundColor = 'rgba(255, 100, 0, 0.5)';
//     document.querySelector('.animation-container').appendChild(ripple);
    
//     // Remove ripple after animation completes
//     setTimeout(() => {
//         ripple.remove();
//     }, 1500);
// }

// // Create explosion effect
// function createExplosion(x, y) {
//     // Create multiple ripples
//     for (let i = 0; i < 5; i++) {
//         setTimeout(() => {
//             createRipple(x, y);
//         }, i * 200);
//     }
    
//     // Create particle explosion
//     for (let i = 0; i < 30; i++) {
//         const angle = Math.random() * Math.PI * 2;
//         const speed = 2 + Math.random() * 5;
//         const size = 3 + Math.random() * 7;
//         const opacity = 0.7 + Math.random() * 0.3;
        
//         lava.particles.push({
//             x: x,
//             y: y,
//             size: size,
//             speed: speed,
//             angle: angle,
//             opacity: opacity,
//             color: `rgba(255, ${100 + Math.random() * 155}, 0, ${opacity})`,
//             life: 100
//         });
//     }
// }

// // Draw lava waves
// function drawLava() {
//     // Clear canvas
//     ctx.clearRect(0, 0, lavaCanvas.width, lavaCanvas.height);
    
//     // Draw background
//     const gradient = ctx.createLinearGradient(0, 0, 0, lavaCanvas.height);
//     gradient.addColorStop(0, '#0a0a1a');
//     gradient.addColorStop(1, '#1a1a2e');
//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, lavaCanvas.width, lavaCanvas.height);
    
//     // Draw lava waves
//     const baseY = lavaCanvas.height * lava.baseHeight;
//     const waveHeight = lavaCanvas.height * lava.waveHeight;
    
//     // Draw multiple waves
//     for (let i = 0; i < lava.waves.length; i++) {
//         const wave = lava.waves[i];
//         ctx.beginPath();
        
//         // Start from the left edge
//         ctx.moveTo(0, baseY);
        
//         // Draw wave
//         for (let x = 0; x < lavaCanvas.width; x += 5) {
//             const y = baseY + 
//                       Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
//                       Math.sin(x * wave.frequency * 1.5 + wave.phase * 1.2) * wave.amplitude * 0.5;
            
//             ctx.lineTo(x, y);
//         }
        
//         // Complete the wave shape
//         ctx.lineTo(lavaCanvas.width, lavaCanvas.height);
//         ctx.lineTo(0, lavaCanvas.height);
//         ctx.closePath();
        
//         // Apply gradient to wave
//         const waveGradient = ctx.createLinearGradient(0, baseY, 0, lavaCanvas.height);
//         waveGradient.addColorStop(0, wave.color);
//         waveGradient.addColorStop(1, '#800000');
        
//         ctx.fillStyle = waveGradient;
//         ctx.fill();
        
//         // Add glow effect
//         ctx.shadowColor = wave.color;
//         ctx.shadowBlur = 15;
//         ctx.fill();
//         ctx.shadowBlur = 0;
//     }
    
//     // Draw particles
//     lava.particles.forEach((particle, index) => {
//         if (particle.life !== undefined) {
//             particle.life--;
//             if (particle.life <= 0) {
//                 lava.particles.splice(index, 1);
//                 return;
//             }
//         }
        
//         ctx.beginPath();
//         ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
//         ctx.fillStyle = particle.color;
//         ctx.fill();
        
//         // Update particle position
//         particle.x += Math.cos(particle.angle) * particle.speed;
//         particle.y += Math.sin(particle.angle) * particle.speed;
        
//         // Apply gravity
//         particle.y += 0.2;
        
//         // Apply friction
//         particle.speed *= 0.98;
//     });
    
//     // Draw lava glow
//     const glowGradient = ctx.createRadialGradient(
//         lavaCanvas.width/2, lavaCanvas.height * 0.8, 0,
//         lavaCanvas.width/2, lavaCanvas.height * 0.8, lavaCanvas.width/2
//     );
//     glowGradient.addColorStop(0, 'rgba(255, 85, 0, 0.8)');
//     glowGradient.addColorStop(1, 'rgba(255, 85, 0, 0)');
    
//     ctx.fillStyle = glowGradient;
//     ctx.fillRect(0, lavaCanvas.height * 0.7, lavaCanvas.width, lavaCanvas.height * 0.3);
// }

// // Animation loop
// function animate() {
//     // Update wave phases
//     lava.waves.forEach(wave => {
//         wave.phase += wave.speed;
//     });
    
//     // Draw everything
//     drawLava();
    
//     // Continue animation
//     requestAnimationFrame(animate);
// }

// // Event listeners
// lavaCanvas.addEventListener('mousemove', (e) => {
//     const rect = lavaCanvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
    
//     // Create ripple effect on mouse move
//     if (Math.random() > 0.7) {
//         createRipple(x, y);
//     }
// });

// lavaCanvas.addEventListener('click', (e) => {
//     const rect = lavaCanvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
    
//     createExplosion(x, y);
// });

// initWaves();
// animate();