// 1. ORIGINAL SITE CONFIG & GLOBAL SETTINGS
let siteConfig = {
    title: 'My Project',
    desc: 'Built with StudioHTML5',
    gaId: '',
    darkMode: false
};

const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    fromElement: true,
    storageManager: { type: 'local', autosave: true },
    blockManager: { appendTo: '#blocks' },
    layerManager: { appendTo: '#layers-container' },
    styleManager: { appendTo: '#styles-container' },
    traitManager: { appendTo: '#traits-container' },
    panels: { defaults: [] },
    deviceManager: {
        devices: [
            { id: 'desktop', name: 'Desktop', width: '' },
            { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '992px' },
            { id: 'mobile-portrait', name: 'Mobile', width: '320px', widthMedia: '480px' },
            { id: 'mobile-landscape', name: 'Landscape', width: '568px', widthMedia: '768px' }
        ]
    },
    plugins: ['gjs-blocks-basic'],
    canvas: {
        styles: [
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
            'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
        ]
    }
});

// 2. DEVICE PANEL SETUP
editor.Panels.addPanel({
    id: 'devices-panel', el: '#device-switcher',
    buttons: [
        { id: 'device-desktop', command: 'set-device-desktop', className: 'fa fa-desktop', active: true },
        { id: 'device-tablet', command: 'set-device-tablet', className: 'fa fa-tablet' },
        { id: 'device-mobile-p', command: 'set-device-mobile-portrait', className: 'fa fa-mobile' },
        { id: 'device-mobile-l', command: 'set-device-mobile-landscape', className: 'fa fa-mobile fa-rotate-90' }
    ]
});

editor.Commands.add('set-device-desktop', { run: ed => ed.setDevice('desktop') });
editor.Commands.add('set-device-tablet', { run: ed => ed.setDevice('tablet') });
editor.Commands.add('set-device-mobile-portrait', { run: ed => ed.setDevice('mobile-portrait') });
editor.Commands.add('set-device-mobile-landscape', { run: ed => ed.setDevice('mobile-landscape') });

// 3. FULL BLOCK MANAGER RESTORATION
const bm = editor.BlockManager;

bm.add('nav-sticky', {
    label: '<i class="fa fa-window-maximize"></i><div>Sticky Nav</div>',
    category: 'Navigation',
    content: `<nav class="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-white shadow-md">
        <div class="text-xl font-bold text-blue-600">LOGO</div>
        <div class="hidden md:flex space-x-6 text-gray-600 font-medium">
            <a href="#" class="hover:text-blue-600">Home</a><a href="#" class="hover:text-blue-600">Services</a>
        </div>
        <button class="bg-blue-600 text-white px-5 py-2 rounded-lg">Action</button>
    </nav>`
});

bm.add('hero-modern', {
    label: '<i class="fa fa-star"></i><div>Hero Section</div>',
    category: 'Layout',
    content: `<section class="py-24 bg-white text-center">
        <div class="max-w-4xl mx-auto px-6">
            <h1 class="text-6xl font-extrabold text-gray-900 leading-tight">Create something <span class="text-indigo-600">Legendary.</span></h1>
            <p class="mt-6 text-xl text-gray-600">The most powerful way to build and export production-ready HTML5 sites.</p>
            <div class="mt-10 flex justify-center gap-4">
                <button class="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold">Get Started</button>
                <button class="border border-gray-200 px-8 py-4 rounded-xl font-bold">Live Demo</button>
            </div>
        </div>
    </section>`
});

bm.add('nav-float', {
    label: '<i class="fa fa-ellipsis-h"></i><div>Floating Nav</div>',
    category: 'Navigation',
    content: `<div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-4xl">
        <nav class="bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg border border-gray-200 rounded-2xl px-6 py-3 flex justify-between items-center shadow-xl">
            <span class="font-bold">STUDIO.</span>
            <div class="space-x-4 text-xs font-bold uppercase"><a href="#">Work</a><a href="#">About</a></div>
        </nav></div>`
});

bm.add('footer-modern', {
    label: '<i class="fa fa-arrow-down"></i><div>Footer</div>',
    category: 'Navigation',
    content: `<footer class="bg-gray-900 text-gray-300 py-12 px-8 text-center text-xs">© 2026 StudioHTML5.</footer>`
});

// 4. FULL TEMPLATE LOGIC RESTORATION
const tpls = {
    startup: {
        label: 'SaaS Growth', category: 'Landing', icon: 'fa-rocket',
        html: `
            <nav class="flex items-center justify-between px-12 py-6 bg-white border-b border-gray-100">
                <div class="text-2xl font-black text-indigo-600">FLOW.</div>
                <div class="space-x-8 font-medium text-gray-600"><a>Product</a><a>Pricing</a><a>Docs</a></div>
                <button class="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-indigo-200">Get Started</button>
            </nav>
            <section class="py-28 bg-white text-center">
                <div class="max-w-4xl mx-auto px-6">
                    <span class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">v2.0 is live</span>
                    <h1 class="text-7xl font-black text-gray-900 mt-8 mb-6 tracking-tight">Everything you need to <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">scale faster.</span></h1>
                    <p class="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">Stop managing infrastructure and start building features. The all-in-one platform for modern developers.</p>
                    <div class="flex justify-center gap-4">
                        <div class="p-4 border border-gray-100 rounded-2xl shadow-sm bg-gray-50 w-40 text-left">
                            <div class="text-indigo-600 font-bold text-2xl">99.9%</div><div class="text-xs text-gray-400 font-bold uppercase">Uptime</div>
                        </div>
                        <div class="p-4 border border-gray-100 rounded-2xl shadow-sm bg-gray-50 w-40 text-left">
                            <div class="text-indigo-600 font-bold text-2xl">24/7</div><div class="text-xs text-gray-400 font-bold uppercase">Support</div>
                        </div>
                    </div>
                </div>
            </section>`,
        css: 'body{margin:0; font-family: sans-serif;}'
    },
    agency: {
        label: 'Creative Agency', category: 'Portfolio', icon: 'fa-wand-magic-sparkles',
        html: `
            <section class="bg-zinc-900 text-white min-h-screen">
                <div class="grid grid-cols-1 md:grid-cols-2">
                    <div class="h-screen flex flex-col justify-center px-20 border-r border-zinc-800">
                        <h2 class="text-indigo-500 font-mono mb-4">// Who we are</h2>
                        <h1 class="text-8xl font-black mb-8 leading-none">WE BUILD<br>DIGITAL<br>RECORDS.</h1>
                        <p class="text-zinc-400 text-lg max-w-sm">Award-winning agency specializing in high-end web experiences and brand identity.</p>
                    </div>
                    <div class="grid grid-cols-2">
                        <div class="aspect-square bg-zinc-800 flex items-center justify-center border-b border-zinc-700 font-black text-4xl text-zinc-700">WORK_01</div>
                        <div class="aspect-square bg-zinc-700 flex items-center justify-center border-b border-l border-zinc-600 font-black text-4xl text-zinc-600">WORK_02</div>
                        <div class="aspect-square bg-zinc-600 flex items-center justify-center font-black text-4xl text-zinc-500">WORK_03</div>
                        <div class="aspect-square bg-zinc-500 flex items-center justify-center border-l border-zinc-400 font-black text-4xl text-zinc-400">WORK_04</div>
                    </div>
                </div>
            </section>`,
        css: 'body{margin:0; font-family: sans-serif;}'
    },
    service: {
        label: 'Legal/Pro Service', category: 'Business', icon: 'fa-scale-balanced',
        html: `
            <div class="bg-slate-900 py-2 px-12 text-center text-xs text-slate-400 border-b border-slate-800">
                Call for a free consultation: 1-800-STUDIO-HTML
            </div>
            <nav class="bg-white py-6 px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div class="font-serif text-2xl italic font-bold">L&W Partners</div>
                <div class="flex gap-8 text-sm font-bold uppercase tracking-widest"><a>Practice Areas</a><a>Attorneys</a><a>Contact</a></div>
            </nav>
            <section class="relative h-[600px] bg-slate-100 flex items-center px-20">
                <div class="max-w-2xl">
                    <h1 class="text-6xl font-serif font-bold text-slate-900 mb-6">Expert Legal Counsel for Complex Matters.</h1>
                    <p class="text-lg text-slate-600 mb-8">With over 40 years of experience, we provide dedicated advocacy for our clients in and out of the courtroom.</p>
                    <button class="bg-slate-900 text-white px-10 py-4 font-bold uppercase tracking-widest">Our Expertise</button>
                </div>
            </section>`,
        css: 'body{margin:0; font-family: sans-serif;}'
    }
};

editor.Commands.add('open-templates', {
    run: (ed) => {
        const categories = ['All', 'Landing', 'Portfolio', 'Business'];
        
        const render = (filter = 'All') => {
            let keys = Object.keys(tpls);
            if(filter !== 'All') keys = keys.filter(k => tpls[k].category === filter);

            const tabs = categories.map(c => `<div class="tpl-tab ${filter === c ? 'active' : ''}" onclick="window.updateTplFilter('${c}')">${c}</div>`).join('');
            const cards = keys.map(k => `
                <div class="tpl-card">
                    <div class="tpl-preview-area"><i class="fa ${tpls[k].icon}"></i></div>
                    <div class="tpl-actions">
                        <button class="btn-tpl-apply" onclick="applyTpl('${k}')">Apply Template</button>
                        <button class="btn-tpl-preview" onclick="showQuickPreview('${k}')">Quick View</button>
                    </div>
                    <div class="tpl-info">
                        <div class="tpl-tag">${tpls[k].category}</div>
                        <div class="tpl-name">${tpls[k].label}</div>
                    </div>
                </div>
            `).join('');

            return `<div class="modal-body tpl-container"><div class="tpl-tabs">${tabs}</div><div class="tpl-grid">${cards}</div></div>`;
        };

        window.updateTplFilter = (c) => ed.Modal.setContent(render(c));
        ed.Modal.setTitle('Template Library').setContent(render()).open();
    }
});

window.applyTpl = (key) => {
    editor.setComponents(tpls[key].html);
    editor.setStyle(tpls[key].css);
    editor.Modal.close();
};

// Quick View Functionality
window.showQuickPreview = (key) => {
    const tpl = tpls[key];
    const frame = document.getElementById('preview-frame');
    const overlay = document.getElementById('tpl-full-preview');
    
    document.getElementById('preview-title').innerText = tpl.label;
    overlay.style.display = 'flex';
    
    // Inject content into iframe
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(`<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"><style>${tpl.css}</style></head><body>${tpl.html}</body></html>`);
    doc.close();

    document.getElementById('preview-apply-btn').onclick = () => {
        applyTpl(key);
        overlay.style.display = 'none';
    };
};

editor.Commands.add('save-to-library', {
    run: (ed) => {
        ed.Modal.setTitle('Save Current Design to Library').setContent(`
            <div class="modal-body">
                <label>Template Name</label>
                <input id="new-tpl-name" placeholder="My Awesome Landing Page">
                <label>Category</label>
                <select id="new-tpl-cat" style="width:100%; margin-top:8px; padding:12px; background:#0f172a; border:1px solid var(--border); color:#fff; border-radius:6px;">
                    <option value="Landing">Landing</option>
                    <option value="Portfolio">Portfolio</option>
                    <option value="Business">Business</option>
                    <option value="Custom">Custom</option>
                </select>
                <button onclick="processSaveTemplate()" class="btn btn-blue" style="width:100%; margin-top:20px; justify-content:center;">Save to Library</button>
            </div>
        `).open();
    }
});

window.processSaveTemplate = () => {
    const name = document.getElementById('new-tpl-name').value || 'Untitled Design';
    const cat = document.getElementById('new-tpl-cat').value;
    const id = 'custom_' + Date.now();

    // Add to the tpls object
    tpls[id] = {
        label: name,
        category: cat,
        icon: 'fa-floppy-disk',
        html: editor.getHtml(),
        css: editor.getCss()
    };

    alert('Saved! You can now find this in the Templates panel.');
    editor.Modal.close();
};

// 5. FULL SETTINGS LOGIC RESTORATION
document.getElementById('global-settings-trigger').onclick = () => {
    editor.Modal.setTitle('Site Settings').setContent(`
        <div class="modal-body">
            <label>Site Title</label><input id="set-title" value="${siteConfig.title}">
            <label>Description</label><textarea id="set-desc" rows="2">${siteConfig.desc}</textarea>
            <label>GA ID (G-XXXXX)</label><input id="set-ga" value="${siteConfig.gaId}">
            <label style="display:flex; align-items:center; gap:10px; margin-top:15px;">
                <input type="checkbox" id="set-dark" ${siteConfig.darkMode ? 'checked' : ''} style="width:auto; margin:0;"> Dark Mode Export
            </label>
            <button onclick="saveAllSettings()" class="btn btn-blue" style="width:100%; margin-top:20px; justify-content:center;">Save All Changes</button>
        </div>
    `).open();
};

window.saveAllSettings = () => {
    siteConfig.title = document.getElementById('set-title').value;
    siteConfig.desc = document.getElementById('set-desc').value;
    siteConfig.gaId = document.getElementById('set-ga').value;
    siteConfig.darkMode = document.getElementById('set-dark').checked;
    editor.Modal.close();
};

// 6. FULL PUBLISH LOGIC (FIXED)
editor.Commands.add('publish-site', {
    run: (ed) => {
        const zip = new JSZip();
        const darkStyle = siteConfig.darkMode ? 'body{background:#121212; color:#fff;}' : '';
        
        let gaPart = '';
        if(siteConfig.gaId) {
            gaPart = `<script async src="https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}"><\/script>
                      <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${siteConfig.gaId}');<\/script>`;
        }

        const finalOutput = `<!DOCTYPE html><html lang="en"><head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${siteConfig.title}</title>
            <meta name="description" content="${siteConfig.desc}">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
            ${gaPart}<style>${ed.getCss()}${darkStyle}</style>
        </head><body>${ed.getHtml()}</body></html>`;
        
        zip.file("index.html", finalOutput);
        zip.generateAsync({type:"blob"}).then(content => saveAs(content, "project.zip"));
    }
});

// 7. PREVIEW MODE FIXES (CLEAN PATCH)
editor.on('run:preview', () => {
    editor.select(); 
    const frames = editor.Canvas.getFrames();
    frames.forEach(frame => frame.el.style.pointerEvents = 'all');
    document.getElementById('back-to-editor').style.display = 'block';
    document.querySelector('.app-container').style.gridTemplateColumns = '0 1fr 0';
});

editor.on('stop:preview', () => {
    const frames = editor.Canvas.getFrames();
    frames.forEach(frame => frame.el.style.pointerEvents = 'none');
    document.getElementById('back-to-editor').style.display = 'none';
    document.querySelector('.app-container').style.gridTemplateColumns = '260px 1fr 280px';
});

document.body.insertAdjacentHTML('beforeend', `
    <div id="tpl-full-preview">
        <div class="preview-header">
            <h3 id="preview-title" style="margin:0">Template Preview</h3>
            <button class="btn btn-secondary" onclick="document.getElementById('tpl-full-preview').style.display='none'">
                <i class="fa fa-times"></i> Close Preview
            </button>
        </div>
        <div class="preview-window">
            <iframe id="preview-frame" style="width:100%; height:100%; border:none;"></iframe>
        </div>
        <button id="preview-apply-btn" class="btn btn-blue" style="margin-top:20px; padding: 12px 40px;">Use This Template</button>
    </div>
`);