window.registerDashboardThemeSync();
    let extractedFiles = [];

    function extractClasses() {
        const code = document.getElementById('inputCode').value;
        const output = document.getElementById('output');
        const status = document.getElementById('status');
        output.innerHTML = '';
        extractedFiles = [];

        if (!code.trim()) {
            status.innerText = "Please paste some code first.";
            return;
        }

        // 1. Capture "using" statements
        const usingRegex = /using\s+[\w.]+;/g;
        const usings = (code.match(usingRegex) || []).join('\n');

        // 2. Capture Namespace if it exists
        const namespaceMatch = code.match(/namespace\s+([\w.]+)/);
        const namespaceHeader = namespaceMatch ? `namespace ${namespaceMatch[1]}\n{\n` : "";
        const namespaceFooter = namespaceMatch ? `\n}` : "";

        // 3. Updated Regex: Matches optional modifiers + class/struct/enum + Name
        // The (?:...) groups are non-capturing. 
        const classStartRegex = /(?:(?:public|internal|private|protected|static|partial|abstract)\s+)*(class|struct|enum)\s+(\w+)/g;
        
        let match;
        while ((match = classStartRegex.exec(code)) !== null) {
            const type = match[1]; // class, struct, or enum
            const name = match[2]; // The identifier name
            const startIndex = match.index;
            
            const body = getScope(code, startIndex);
            
            if (body) {
                const fullFileContent = usings + "\n\n" + namespaceHeader + body + namespaceFooter;
                extractedFiles.push({ name: name + ".cs", content: fullFileContent });
                displayFile(name + ".cs", fullFileContent);
            }
        }
        status.innerText = `Found ${extractedFiles.length} items.`;
    }

    function getScope(text, startIdx) {
        let firstBrace = text.indexOf('{', startIdx);
        if (firstBrace === -1) return null;

        let count = 1;
        let i = firstBrace + 1;
        while (count > 0 && i < text.length) {
            if (text[i] === '{') count++;
            else if (text[i] === '}') count--;
            i++;
        }
        return text.substring(startIdx, i);
    }

    function displayFile(filename, content) {
        const container = document.createElement('div');
        container.className = 'output-item';
        container.innerHTML = `
            <div class="filename"><span>${filename}</span></div>
            <pre>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        `;
        document.getElementById('output').appendChild(container);
    }

    function downloadZip() {
        if (extractedFiles.length === 0) {
            alert("Nothing to download. Click 'Extract' first.");
            return;
        }
        const zip = new JSZip();
        extractedFiles.forEach(file => {
            zip.file(file.name, file.content);
        });

        zip.generateAsync({type:"blob"}).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "UnityScripts.zip";
            link.click();
        });
    }

    function describeCurrentAssets() {
        return extractedFiles.map(file => ({
            kind: 'text',
            title: file.name,
            fileName: file.name,
            mimeType: 'text/x-csharp',
            textContent: file.content,
            previewKind: 'text',
            previewText: file.content,
            sourceDetail: 'Extracted C# script file.',
            metadata: { sourceTool: 'csharp-class-extractor', resourceFormat: 'csharp' }
        }));
    }

    window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
    window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;