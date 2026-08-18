const fs = require('fs');
const path = require('path');

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

                tools.push({
                    id: manifest.id || `${categoryId}__${entry.name}`,
                    category: categoryId,
                    slug: entry.name,
                    title: manifest.title || titleFromSlug(entry.name),
                    description: manifest.description || readmeDescription || 'Open this URage tool in your browser.',
                    href: `/${categoryId}/${entry.name}/`,
                    thumbnail: fs.existsSync(path.join(toolPath, 'thumbnail.png'))
                        ? `/${categoryId}/${entry.name}/thumbnail.png`
                        : ''
                });
            });
    });

tools.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
fs.writeFileSync(path.join(root, 'catalog.json'), `${JSON.stringify({ categories, tools }, null, 2)}\n`, 'utf8');
console.log(`Generated catalog.json with ${tools.length} tools.`);
