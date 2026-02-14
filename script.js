const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const saveData = navigator.connection?.saveData ?? false;

function initHero() {
    const canvas = document.getElementById('mainCanvas');
    const viewport = document.getElementById('viewport');
    if (!canvas || !viewport) return;

    if (prefersReducedMotion || saveData) {
        canvas.style.display = 'none';
        return;
    }

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const colors = ['#ff6b35', '#f55353', '#ff8a00'];
    const waves = [
        { amp: 22, freq: 0.012, speed: 0.70, offset: 0, alpha: 0.55, color: colors[0] },
        { amp: 16, freq: 0.018, speed: 0.52, offset: 18, alpha: 0.38, color: colors[1] },
        { amp: 12, freq: 0.023, speed: 0.36, offset: 32, alpha: 0.26, color: colors[2] }
    ];

    let cw = 0;
    let ch = 0;
    let dpr = 1;
    let rafId = 0;
    let running = false;
    let inView = true;

    const ripples = [];
    const mouse = { x: null, y: null };

    function resize() {
        const rect = viewport.getBoundingClientRect();
        cw = Math.max(1, Math.floor(rect.width));
        ch = Math.max(1, Math.floor(rect.height));
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        canvas.width = Math.max(1, Math.floor(cw * dpr));
        canvas.height = Math.max(1, Math.floor(ch * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawWave(t, w) {
        const baseY = ch * 0.64;
        const time = t * 0.001 * w.speed;

        ctx.beginPath();
        ctx.moveTo(0, ch);

        const step = cw >= 900 ? 6 : 5;
        for (let x = 0; x <= cw + step; x += step) {
            const y = baseY + w.offset + Math.sin(x * w.freq + time) * w.amp;
            ctx.lineTo(x, y);
        }

        ctx.lineTo(cw, ch);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - 90, 0, ch);
        grad.addColorStop(0, w.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.globalAlpha = w.alpha;
        ctx.fillStyle = grad;
        ctx.fill();
    }

    function drawRipples() {
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.radius += 9;
            r.alpha -= 0.018;

            if (r.alpha <= 0) {
                ripples.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = r.alpha;
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function frame(t) {
        if (!running) return;

        ctx.clearRect(0, 0, cw, ch);

        // Back-to-front
        for (let i = waves.length - 1; i >= 0; i--) drawWave(t, waves[i]);
        drawRipples();

        // Subtle highlight around cursor (cheap)
        if (mouse.x != null && mouse.y != null) {
            const rg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 160);
            rg.addColorStop(0, 'rgba(255,255,255,0.10)');
            rg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = rg;
            ctx.fillRect(0, 0, cw, ch);
        }

        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (running) return;
        running = true;
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
    }

    const ro = new ResizeObserver(() => {
        resize();
    });
    ro.observe(viewport);

    const io = new IntersectionObserver(
        (entries) => {
            inView = entries.some((e) => e.isIntersecting);
            if (document.hidden) return;
            if (inView) start();
            else stop();
        },
        { threshold: 0.1 }
    );
    io.observe(viewport);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else if (inView) start();
    });

    viewport.addEventListener(
        'pointermove',
        (e) => {
            const rect = viewport.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        },
        { passive: true }
    );

    viewport.addEventListener(
        'pointerleave',
        () => {
            mouse.x = null;
            mouse.y = null;
        },
        { passive: true }
    );

    viewport.addEventListener('pointerdown', (e) => {
        const rect = viewport.getBoundingClientRect();
        ripples.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, radius: 0, alpha: 0.55 });
        if (ripples.length > 6) ripples.shift();
    });

    // First layout pass
    resize();
    start();
}

function initAccordion() {
    const headers = Array.from(document.querySelectorAll('.accordion-header[aria-controls]'));
    if (headers.length === 0) return;

    function getPanel(header) {
        const id = header.getAttribute('aria-controls');
        return id ? document.getElementById(id) : null;
    }

    function openItem(header) {
        const panel = getPanel(header);
        if (!panel) return;

        header.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        panel.classList.add('open');

        // Animate to content height (no hardcoded max-height).
        panel.style.maxHeight = '0px';
        requestAnimationFrame(() => {
            panel.style.maxHeight = `${panel.scrollHeight}px`;
        });
    }

    function closeItem(header) {
        const panel = getPanel(header);
        if (!panel) return;

        header.setAttribute('aria-expanded', 'false');
        panel.classList.remove('open');

        // Animate closed; hide after transition ends for accessibility.
        panel.style.maxHeight = `${panel.scrollHeight}px`;
        requestAnimationFrame(() => {
            panel.style.maxHeight = '0px';
        });

        const onEnd = (e) => {
            if (e.propertyName !== 'max-height') return;
            panel.hidden = true;
            panel.removeEventListener('transitionend', onEnd);
        };
        panel.addEventListener('transitionend', onEnd);
    }

    function closeOthers(exceptHeader) {
        for (const h of headers) {
            if (h === exceptHeader) continue;
            if (h.getAttribute('aria-expanded') === 'true') closeItem(h);
        }
    }

    function toggle(header) {
        const isOpen = header.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
            closeItem(header);
            return;
        }

        closeOthers(header);
        openItem(header);
    }

    function refreshOpenHeights() {
        for (const header of headers) {
            if (header.getAttribute('aria-expanded') !== 'true') continue;
            const panel = getPanel(header);
            if (!panel) continue;
            panel.style.maxHeight = `${panel.scrollHeight}px`;
        }
    }

    for (const header of headers) {
        const panel = getPanel(header);
        if (panel) {
            panel.hidden = true;
            panel.style.maxHeight = '0px';

            // Images are lazy-loaded; keep open panels sized as content arrives.
            panel.addEventListener(
                'load',
                () => {
                    if (header.getAttribute('aria-expanded') === 'true') refreshOpenHeights();
                },
                true
            );
        }

        header.addEventListener('click', () => toggle(header));
    }

    const onResize = () => {
        refreshOpenHeights();
    };
    window.addEventListener('resize', onResize, { passive: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initHero();
        initAccordion();
    });
} else {
    initHero();
    initAccordion();
}
