// Usage: PLAYWRIGHT_MODULE=<installed playwright package> node this-file.cjs
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..', '..');
const base = process.env.TOOLS_PREVIEW_URL || 'http://127.0.0.1:3117';
const artifacts = path.join(root, 'memory-bank', 'tools-browser-check');
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        // Local asset and UI validation is independent of third-party CDN availability.
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public', 'tools', 'catalog.json')));
        const results = [];
        const queue = [...catalog.tools];
        await Promise.all([0, 1, 2].map(async () => {
            const page = await context.newPage();
            while (queue.length) {
                const tool = queue.shift();
                const errors = [], missing = [];
                const onError = error => errors.push(error.message);
                const onResponse = response => { if (response.status() >= 400 && response.url().startsWith(base)) missing.push({ url: response.url(), status: response.status() }); };
                page.on('pageerror', onError); page.on('response', onResponse);
                try {
                    await page.goto(base + tool.href, { waitUntil: 'load', timeout: 20000 });
                    await page.waitForTimeout(150);
                    assert.equal(await page.locator('#tool-frame').count(), 1);
                    const iframe = page.frames().find(frame => new URL(frame.url()).pathname.endsWith('/tool.html'));
                    assert(iframe, 'Standalone tool frame loaded');
                    assert(await iframe.locator('body').innerText().then(text => text.trim().length > 0) || await iframe.locator('canvas').count() > 0, 'Tool has text or a game canvas');
                    assert.equal(await iframe.locator('html').getAttribute('data-dashboard-theme'), 'modern-dark');
                    assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'), tool.description);
                    const heading = await page.locator('.tool-page-heading h1').boundingBox();
                    const nav = await page.locator('.navbar').boundingBox();
                    assert(heading.y >= nav.y + nav.height, 'Heading clears fixed navigation');
                    results.push({ id: tool.id, shell: 'pass', errors, missing });
                } catch (error) { results.push({ id: tool.id, shell: 'fail', failure: error.message, errors, missing }); }
                page.off('pageerror', onError); page.off('response', onResponse);
                console.log(`${results.length}/${catalog.tools.length} ${tool.id}: ${results.at(-1).shell}`);
            }
            await page.close();
        }));
        fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ externalRequestsBlocked: true, results }, null, 2));
        const page = await context.newPage();
        await page.goto(base + '/tools/web/');
        await page.getByRole('button', { name: 'Simulation', exact: true }).click();
        assert.equal(await page.locator('#tools .tool-card').count(), 1);
        await page.locator('#tools .tool-card').click();
        const iframe = page.frameLocator('#tool-frame');
        await iframe.locator('#start').click();
        await page.waitForTimeout(300);
        assert.notEqual(await iframe.locator('#generated').innerText(), '0 / 32');
        await iframe.locator('#pause').click();
        await page.screenshot({ path: path.join(artifacts, 'simulation-desktop.png'), fullPage: true });
        await page.locator('#themeSelect').selectOption('modern-light');
        await page.waitForTimeout(200);
        assert.equal(await iframe.locator('html').getAttribute('data-dashboard-theme'), 'modern-light');
        const [popup] = await Promise.all([page.waitForEvent('popup'), page.locator('#tool-open-window').click()]);
        await popup.waitForLoadState();
        assert.equal(await popup.locator('#tool-frame').count(), 0);
        assert.equal(await popup.locator('html').getAttribute('data-dashboard-theme'), 'modern-light');
        await popup.close();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.mouse.move(389, 843);
        await page.waitForTimeout(200);
        assert.equal(await page.locator('.nav-menu').isVisible(), false, 'Mobile navigation is closed initially');
        await page.screenshot({ path: path.join(artifacts, 'simulation-mobile-light.png'), fullPage: true });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No outer mobile horizontal overflow');
        await page.locator('#mobileMenuToggle').click();
        assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('.nav-menu').isVisible(), true, 'Mobile navigation opens');
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(base + '/tools/art/poker-chip-generator/');
        await page.mouse.move(1400, 900);
        await page.screenshot({ path: path.join(artifacts, 'poker-chip-light.png'), fullPage: true });
        assert.equal(results.filter(result => result.shell === 'fail').length, 0, 'Every tool shell passes');
        console.log('PASS: all tool shells, simulation filter and controls, theme selection, standalone popup, mobile layout and menu. See results.json for tool runtime errors and missing assets.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
