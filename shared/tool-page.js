(() => {
    const root = document.documentElement;
    const frame = document.getElementById('tool-frame');
    const select = document.getElementById('themeSelect');
    // Preserve shareable tool settings when entering through the framed URL.
    const standalone = new URL('./tool.html', location.href);
    standalone.search = location.search;
    standalone.hash = location.hash;
    document.getElementById('tool-open-window').href = standalone.href;
    if (location.search || location.hash) frame.src = standalone.href;
    const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
    function syncTheme() {
        const css = getComputedStyle(root);
        const value = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
        const payload = { theme: root.dataset.theme || 'modern-dark', tokens: {
            accent: value('--accent', '#ff8a4d'), accentStrong: value('--accent-hover', value('--accent', '#ff6136')),
            bg: value('--bg', '#120d0d'), surface: value('--card-bg', '#180e0e'),
            surfaceStrong: value('--card-bg', '#120d0d'), line: value('--border', '#48332b'),
            lineStrong: value('--border', '#48332b'), text: value('--text-main', '#f6f1ee'), muted: value('--text-dim', '#c8b6ae')
        } };
        write('urage-tool-website-theme', JSON.stringify(payload));
        frame.contentWindow?.postMessage({ source: 'urage-dashboard', type: 'tool:theme', payload }, location.origin);
    }
    function setTheme(theme) {
        root.dataset.theme = theme;
        if (select) select.value = theme;
        write('theme', theme);
        requestAnimationFrame(syncTheme);
    }
    select?.addEventListener('change', () => setTheme(select.value));
    frame.addEventListener('load', syncTheme);
    window.addEventListener('message', event => {
        if (event.origin === location.origin && event.source === frame.contentWindow && event.data?.type === 'tool:ready') syncTheme();
    });
    window.addEventListener('storage', event => { if (event.key === 'theme') setTheme(event.newValue || 'modern-dark'); });
    setTheme(read('theme') || 'modern-dark');
    window.toggleMobileMenu = () => {
        const open = document.querySelector('.navbar').classList.toggle('menu-open');
        document.querySelector('.nav-menu').classList.toggle('active', open);
        document.getElementById('mobileMenuToggle')?.setAttribute('aria-expanded', String(open));
    };
    window.scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const modal = document.getElementById('searchModal');
    window.openSearch = () => { if (modal) { modal.style.display = 'flex'; document.getElementById('modalInput')?.focus(); } };
    modal?.addEventListener('click', event => { if (event.target === modal) modal.style.display = 'none'; });
    window.addEventListener('keydown', event => { if (event.key === 'Escape' && modal) modal.style.display = 'none'; });
    let catalog;
    let searchRequest = 0;
    window.handleSearch = async query => {
        const request = ++searchRequest;
        const results = document.getElementById('searchResults');
        if (!results) return;
        try {
            catalog ||= fetch('/tools/catalog.json').then(response => { if (!response.ok) throw new Error('Catalogue unavailable'); return response.json(); });
            const data = await catalog;
            if (request !== searchRequest) return;
            results.replaceChildren();
            for (const tool of data.tools.filter(tool => `${tool.title} ${tool.description}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12)) {
                const link = document.createElement('a');
                link.href = tool.href;
                link.textContent = tool.title;
                link.className = 'chip';
                results.append(link);
            }
        } catch { results.textContent = 'Tools search is unavailable. Visit /tools/web/ to browse.'; catalog = null; }
    };
    document.querySelectorAll('.nav-menu a').forEach(link => {
        const active = link.getAttribute('href') === '/tools/';
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
})();
