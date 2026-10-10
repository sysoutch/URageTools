const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { metadata } = require('./tool-page');
const root = path.resolve(__dirname, '..');
const published = path.resolve(process.argv[2] || path.join(root, '..', 'public', 'tools'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));
assert(catalog.categories.some(category => category.id === 'simulation'));
assert(catalog.tools.some(tool => tool.category === 'simulation'));
for (const tool of catalog.tools) {
    const dir = path.join(published, tool.category, tool.slug);
    for (const file of ['index.html', 'tool.html']) {
        const html = fs.readFileSync(path.join(dir, file), 'utf8');
        for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) {
            assert.equal((html.match(new RegExp(`property="${property}"`, 'g')) || []).length, 1, `${tool.id}: ${property}`);
        }
        assert(html.includes('name="twitter:card" content="summary_large_image"'));
        const image = new URL(html.match(/property="og:image" content="([^"]+)"/)[1]);
        assert.equal(image.protocol, 'https:');
        assert(fs.statSync(path.join(published, image.pathname.replace(/^\/tools\//, ''))).size > 0, `${tool.id}: image exists`);
        assert(!html.includes('property="og:image:width"'), 'Do not invent dimensions for varied thumbnails');
    }
    const wrapper = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const standalone = fs.readFileSync(path.join(dir, 'tool.html'), 'utf8');
    assert(wrapper.includes('<nav class="navbar">') && wrapper.includes('<footer>'), `${tool.id}: site shell`);
    assert(wrapper.includes('id="tool-frame" src="./tool.html"'), `${tool.id}: iframe`);
    assert(wrapper.includes('Open in new window') && wrapper.includes('rel="noopener noreferrer"'));
    assert(standalone.includes('dashboard-theme.js'), `${tool.id}: dashboard theme`);
}
const fixture = { category: 'test', slug: 'safe', title: 'A "title" <tag>', description: 'Text & details', thumbnail: '' };
const once = metadata('<html><head><title>Old</title><meta property="og:image" content="old"></head><body></body></html>', fixture);
assert.equal(metadata(once, fixture), once, 'Metadata generation is idempotent');
assert(once.includes('Text &amp; details') && once.includes('&lt;tag&gt;'));
console.log(`PASS: ${catalog.tools.length} framed pages and standalone pages; metadata, image files, shell, theme loader, simulation category, escaping and idempotence.`);
