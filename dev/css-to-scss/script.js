window.registerDashboardThemeSync();
let processedFiles = {};
let activeFile = '';
let currentVars = []; // Array of { id: '$name', val: 'value', type: 'color|size' }

function processCSS() {
    let css = document.getElementById('cssInput').value;
    if (!css.trim()) return;

    currentVars = [];
    const varMap = new Map();

    // 1. Extract Colors
    const colors = [...new Set(css.match(/#(?:[0-9a-f]{3}){1,2}|rgba?\([^\)]+\)|hsla?\([^\)]+\)/gi))];
    colors.forEach((c, i) => {
        const id = `$color-${i + 1}`;
        currentVars.push({ id, val: c, type: 'color' });
    });

    // 2. Extract Spacing
    if (document.getElementById('autoVarToggle').checked) {
        const spacingRegex = /(?<=:\s?)(?!(?:0|1px|100%)\b)(\d+(?:\.\d+)?(?:px|rem|em|vh|vw))/g;
        const spacing = [...new Set(css.match(spacingRegex))];
        spacing.forEach((s, i) => {
            const id = `$size-${i + 1}`;
            currentVars.push({ id, val: s, type: 'size' });
        });
    }

    applyRefactor();
}

function applyRefactor() {
    const css = document.getElementById('cssInput').value;
    processedFiles = {
        '_variables.scss': "// Variables\n",
        '_reset.scss': "// Base\n",
        '_typography.scss': "// Typography\n",
        '_layout.scss': "// Layout\n",
        '_components.scss': "// Components\n",
        'main.scss': ""
    };

    // Update _variables.scss and create local map
    currentVars.forEach(v => {
        processedFiles['_variables.scss'] += `${v.id}: ${v.val};\n`;
    });

    const blocks = css.split('}');
    blocks.forEach(block => {
        if (!block.trim()) return;
        let content = block.trim() + "}";
        
        // Use the variable list to replace raw values
        currentVars.forEach(v => {
            content = content.split(v.val).join(v.id);
        });

        const selector = content.split('{')[0].trim();
        if (selector.match(/^(html|body|\*|audio|video)/)) processedFiles['_reset.scss'] += content + "\n\n";
        else if (selector.match(/^(h[1-6]|p|a|span|blockquote|li|ul|ol)/)) processedFiles['_typography.scss'] += content + "\n\n";
        else if (selector.match(/(\.container|\.grid|\.row|\.col|header|footer|nav)/)) processedFiles['_layout.scss'] += content + "\n\n";
        else processedFiles['_components.scss'] += content + "\n\n";
    });

    let imports = "/** Manifest **/\n\n";
    Object.keys(processedFiles).forEach(f => {
        if (f !== 'main.scss' && processedFiles[f].split('\n').length > 2) {
            imports += `@import '${f.replace('.scss', '').replace('_', '')}';\n`;
        }
    });
    processedFiles['main.scss'] = imports;

    renderUI();
    document.getElementById('dlBtn').disabled = false;
    if (!activeFile) activeFile = 'main.scss';
    selectFile(activeFile);
}

function renderUI() {
    // Render Variables Explorer
    const varExplorer = document.getElementById('varExplorer');
    varExplorer.innerHTML = "";
    currentVars.forEach((v, index) => {
        const row = document.createElement('div');
        row.className = "var-edit-row";
        row.innerHTML = `
            <input type="text" value="${v.id}" onchange="renameVar(${index}, this.value)">
            <div class="var-val">${v.val}</div>
        `;
        varExplorer.appendChild(row);
    });

    // Render File Explorer
    const explorer = document.getElementById('fileExplorer');
    explorer.innerHTML = "";
    Object.keys(processedFiles).forEach(name => {
        if (processedFiles[name].split('\n').length <= 2 && name !== 'main.scss') return;
        const div = document.createElement('div');
        div.className = `file-tab ${activeFile === name ? 'active' : ''}`;
        div.innerText = name;
        div.onclick = () => selectFile(name);
        explorer.appendChild(div);
    });
    generateScript();
}

function renameVar(index, newName) {
    if (!newName.startsWith('$')) newName = '$' + newName;
    currentVars[index].id = newName;
    applyRefactor(); // Re-run categorization with new names
}

function selectFile(name) {
    activeFile = name;
    document.getElementById('currentFileName').innerText = name;
    document.getElementById('filePreview').innerText = processedFiles[name];
    renderUI();
}

function generateScript() {
    const lang = document.getElementById('langSelect').value;
    const isMinify = document.getElementById('minifyToggle').checked;
    const style = isMinify ? "--style=compressed" : "--style=expanded";
    const scripts = {
        npm: `"build": "sass scss/main.scss dist/style.css ${style}"`,
        bash: `sass scss/main.scss:dist/style.css ${style} --watch`,
        python: `sass.compile(filename='scss/main.scss', output_style='${isMinify ? 'compressed' : 'expanded'}')`
    };
    document.getElementById('scriptOutput').innerText = scripts[lang] || "";
}

async function downloadZip() {
    const zip = new JSZip();
    const folder = zip.folder("scss");
    for (const [name, content] of Object.entries(processedFiles)) {
        if (content.split('\n').length > 1) folder.file(name, content);
    }
    const blob = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "refactored-scss.zip";
    link.click();
}

function describeCurrentAssets() {
    return Object.entries(processedFiles)
        .filter(([, content]) => String(content || '').trim())
        .map(([name, content]) => ({
            kind: 'text',
            title: name,
            fileName: name,
            mimeType: 'text/x-scss',
            textContent: content,
            previewKind: 'text',
            previewText: content,
            sourceDetail: 'Refactored SCSS output.',
            metadata: { sourceTool: 'css-to-scss', resourceFormat: 'scss' }
        }));
}

window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;