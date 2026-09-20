function updateMeta() {
        // Values
        const title = document.getElementById('metaTitle').value || 'Page Title Goes Here';
        const desc = document.getElementById('metaDesc').value || 'Your site description will appear here when you share your link on Discord, Slack, or Facebook. Make it catchy!';
        const url = document.getElementById('metaUrl').value || 'https://yoursite.com';
        const img = document.getElementById('metaImg').value || document.getElementById('previewImg').src;

        // Update Preview
        document.getElementById('previewTitle').textContent = title;
        document.getElementById('previewDesc').textContent = desc;
        document.getElementById('previewImg').src = img;

        // Generate Meta Tags
        const tags = `<title>${title}</title>
<meta name="title" content="${title}">
<meta name="description" content="${desc}">

<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">

<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${url}">
<meta property="twitter:title" content="${title}">
<meta property="twitter:description" content="${desc}">
<meta property="twitter:image" content="${img}">`;

        document.getElementById('metaOutput').textContent = tags;
    }

    function copyCode() {
        const code = document.getElementById('metaOutput').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('copyBtn');
            btn.textContent = 'Copied!';
            btn.style.background = '#43b581'; // Success Green
            setTimeout(() => {
                btn.textContent = 'Copy Code';
                btn.style.background = '#5865f2';
            }, 2000);
        });
    }

    if (window.registerDashboardThemeSync) window.registerDashboardThemeSync();

    function describeCurrentAssets() {
        const text = document.getElementById('metaOutput').textContent || '';
        return [{
            kind: 'text',
            title: 'Meta OG Tags',
            fileName: 'meta-og-tags.html',
            mimeType: 'text/html',
            textContent: text,
            previewKind: 'text',
            previewText: text,
            sourceDetail: 'Generated Open Graph and Twitter card meta tags.',
            metadata: { sourceTool: 'meta-og-tag-generator', resourceFormat: 'html-meta' }
        }];
    }

    window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
    window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;

    // Initialize on load
    updateMeta();