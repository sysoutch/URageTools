const fs = require('fs');
const path = require('path');
const { metadata } = require('./tool-page');

const root = path.resolve(__dirname, '..');
const categoryDir = path.join(root, 'categories');
const ignoredDirs = new Set(['shared', 'categories', '.git', 'node_modules', 'bak', 'dist']);

function readJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_error) {
        return fallback;
    }
}

function titleFromSlug(slug) {
    return slug
        .replace(/[-_]+/g, ' ')
        .replace(/\b3d\b/gi, '3D')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function descriptionFromReadme(readme) {
    return String(readme || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line
            && !line.startsWith('#')
            && !line.startsWith('![')
            && !line.startsWith('>')
            && !line.startsWith('- ')
            && !line.startsWith('```')) || '';
}

function plainDescription(value) {
    return String(value).replace(/&(?:amp|quot|apos|lt|gt|#39);/g, entity => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' })[entity])
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
}

const categories = fs.readdirSync(categoryDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readJson(path.join(categoryDir, file), null))
    .filter(Boolean);

const tools = [];
fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignoredDirs.has(entry.name))
    .forEach((categoryEntry) => {
        const categoryId = categoryEntry.name;
        const categoryPath = path.join(root, categoryId);
        fs.readdirSync(categoryPath, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(categoryPath, entry.name, 'index.html')))
            .forEach((entry) => {
                const toolPath = path.join(categoryPath, entry.name);
                const manifest = readJson(path.join(toolPath, 'tool.json'), {});
                const readme = fs.existsSync(path.join(toolPath, 'README.md'))
                    ? fs.readFileSync(path.join(toolPath, 'README.md'), 'utf8')
                    : '';
                const readmeDescription = descriptionFromReadme(readme);
                const htmlPath = path.join(toolPath, 'index.html');
                let html = fs.readFileSync(htmlPath, 'utf8');
                const htmlDescription = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];

                tools.push({
                    id: manifest.id || `${categoryId}__${entry.name}`,
                    category: categoryId,
                    slug: entry.name,
                    title: manifest.title || titleFromSlug(entry.name),
                    description: plainDescription(manifest.description || readmeDescription || htmlDescription || `Use ${manifest.title || titleFromSlug(entry.name)} online with this free URage browser tool.`),
                    href: `/${categoryId}/${entry.name}/`,
                    thumbnail: fs.existsSync(path.join(toolPath, 'thumbnail.png'))
                        ? `/${categoryId}/${entry.name}/thumbnail.png`
                        : '/shared/tool-cover.png'
                });
                if (!html.includes('dashboard-theme.js')) {
                    html = html.replace(/<head\b[^>]*>/i, '$&\n<script src="../../shared/dashboard-theme.js"></script>');
                }
                fs.writeFileSync(htmlPath, metadata(html, tools[tools.length - 1]));
            });
    });

tools.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
for (const id of new Set(tools.map(tool => tool.category))) {
    if (!categories.some(category => category.id === id)) {
        categories.push({ id, label: titleFromSlug(id), description: `${titleFromSlug(id)} tools.` });
    }
}
fs.writeFileSync(path.join(root, 'catalog.json'), `${JSON.stringify({ categories, tools }, null, 2)}\n`, 'utf8');
console.log(`Generated catalog.json with ${tools.length} tools.`);
