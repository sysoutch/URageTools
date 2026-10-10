const fs = require('fs');
const path = require('path');

function escape(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function metadata(html, tool, baseUrl = 'https://urage.net', prefix = '/tools') {
    const url = new URL(`${prefix}/${tool.category}/${tool.slug}/`, baseUrl).href;
    const image = new URL(`${prefix}${tool.thumbnail || '/shared/tool-cover.png'}`, baseUrl).href;
    const title = `${tool.title} | URage Tools`;
    const tags = [
        `<title>${escape(title)}</title>`,
        `<link rel="canonical" href="${escape(url)}">`,
        ...[['name', 'description', tool.description], ['property', 'og:type', 'website'],
            ['property', 'og:site_name', 'URage Tools'], ['property', 'og:url', url],
            ['property', 'og:title', title], ['property', 'og:description', tool.description],
            ['property', 'og:image', image], ['property', 'og:image:alt', `${tool.title} preview`],
            ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', title],
            ['name', 'twitter:description', tool.description], ['name', 'twitter:image', image]]
            .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escape(value)}">`)
    ].join('\n');
    return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => head
        .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
        .replace(/<meta\b[^>]*>/gi, tag => /(?:name|property)\s*=\s*["'](?:description|og:[^"']*|twitter:[^"']*)["']/i.test(tag) ? '' : tag)
        .replace(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi, '')
        .replace(/\s*<\/head>/i, `\n${tags}\n</head>`)
        .replace(/^[ \t]+(?=\r?$)/gm, '')
        .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n'));
}

function publishToolPages({ sourceDir, targetDir, shell, baseUrl }) {
    const catalog = JSON.parse(fs.readFileSync(path.join(sourceDir, 'catalog.json'), 'utf8'));
    const start = shell.indexOf('<main');
    const end = shell.lastIndexOf('</main>');
    if (start < 0 || end < start) throw new Error('Website shell requires a main element');
    const header = shell.slice(0, start).replace('data-initial-view="home"', 'data-initial-view="tools"');
    const footer = shell.slice(end + 7).replace(/<script\b[^>]*src=["']\/js\/script(?:\.min)?\.js[^"']*["'][^>]*><\/script>/gi, '');
    for (const tool of catalog.tools) {
        const dir = path.join(targetDir, tool.category, tool.slug);
        const sourceToolDir = path.join(sourceDir, tool.category, tool.slug);
        const manifestPath = path.join(sourceToolDir, 'tool.json');
        const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
        let raw;
        if (manifest.publishEntry) {
            const entry = path.resolve(sourceToolDir, manifest.publishEntry);
            if (!entry.startsWith(path.resolve(sourceToolDir) + path.sep)) throw new Error('Tool publishEntry must stay inside its directory');
            raw = fs.readFileSync(entry, 'utf8');
            // Vite's bundled build is required for TypeScript tools. Keep its
            // assets beside tool.html and rebase root /assets references.
            for (const item of fs.readdirSync(path.dirname(entry))) {
                if (['index.html', 'node_modules', '.git'].includes(item)) continue;
                fs.cpSync(path.join(path.dirname(entry), item), path.join(dir, item), { recursive: true });
            }
            raw = raw.replace(/(["'])\/assets\//g, '$1./assets/');
            raw = raw.replace(/(["'])\.\.\/\.\.\/\.\.\/shared\//g, '$1../../shared/');
        } else {
            raw = fs.readFileSync(path.join(sourceToolDir, 'index.html'), 'utf8');
        }
        if (!raw.includes('dashboard-theme.js')) raw = raw.replace(/<head\b[^>]*>/i, '$&\n<script src="../../shared/dashboard-theme.js"></script>');
        fs.writeFileSync(path.join(dir, 'tool.html'), metadata(raw, tool, baseUrl));
        const body = `<main class="tool-page" id="view-tools">
<section class="tool-page-heading"><a class="chip" href="/tools/web/">Back to Tools</a>
<h1>${escape(tool.title)}</h1><p>${escape(tool.description)}</p>
<a class="chip" id="tool-open-window" href="./tool.html" target="_blank" rel="noopener noreferrer">Open in new window</a></section>
<iframe id="tool-frame" src="./tool.html" title="${escape(tool.title)}" allow="fullscreen; clipboard-read; clipboard-write; autoplay" allowfullscreen></iframe>
</main>`;
        let page = metadata(header + body + footer, tool, baseUrl);
        page = page.replace('</head>', '<link rel="stylesheet" href="/tools/shared/tool-page.css">\n</head>')
            .replace('</body>', '<script src="/tools/shared/tool-page.js"></script>\n</body>');
        fs.writeFileSync(path.join(dir, 'index.html'), page);
    }
    return catalog.tools.length;
}

module.exports = { metadata, publishToolPages };
