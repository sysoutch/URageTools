window.registerDashboardThemeSync();
    const characters = [
        { name: "Protagonist", color: "#00e5ff" },
        { name: "Antagonist", color: "#ff4d4d" },
        { name: "System", color: "#ffffff" },
        { name: "Villager", color: "#4dff4d" }
    ];

    let nodes = [];
    let connections = [];
    let variables = ["gold", "has_key"];
    let nodeIdCounter = 1;
    
    // Zoom/Pan State
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;

    const viewport = document.getElementById('viewport');
    const content = document.getElementById('canvas-content');
    const svgLayer = document.getElementById('svg-layer');

    function init() {
        renderVariables();
        // Add a sample dialogue tree with actual text
        addNode(100, 100);
        addNode(300, 100);
        addNode(300, 200);
        addNode(500, 100);
        
        // Set properties for the nodes
        setTimeout(() => {
            nodes[0].text = "Hello there! What brings you to this village?";
            nodes[0].character = "Villager";
            nodes[1].text = "I'm looking for information about the ancient ruins.";
            nodes[1].character = "Protagonist";
            nodes[2].type = "choice";
            nodes[2].text = "What do you know about them?";
            nodes[2].character = "Villager";
            nodes[3].text = "They're said to hold great treasures, but also great dangers.";
            nodes[3].character = "Villager";
            
            // Connect the nodes to form a simple tree
            connections.push({ from: 1, to: 2 });
            connections.push({ from: 1, to: 3 });
            connections.push({ from: 2, to: 4 });
            
            // Re-render nodes to show all updated fields
            nodes.forEach(node => {
                const el = document.getElementById(`node-${node.id}`);
                if (el) {
                    // Update all fields in the rendered node
                    const typeSelect = el.querySelector('select[onchange^="updateNode"]:first-child');
                    const characterSelect = el.querySelector('select[onchange^="updateNode"]:last-child');
                    const conditionInput = el.querySelector('input.logic-field');
                    const actionInput = el.querySelector('input.logic-field:last-child');
                    const textarea = el.querySelector('textarea');
                    
                    if (typeSelect) typeSelect.value = node.type;
                    if (characterSelect) characterSelect.value = node.character;
                    if (conditionInput) conditionInput.value = node.condition;
                    if (actionInput) actionInput.value = node.action;
                    if (textarea) textarea.value = node.text;
                }
            });
            
            drawLinks();
        }, 100);
        
        // Mouse Wheel Zoom
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(0.2, scale * delta), 2);
            
            // Zoom toward mouse position
            const rect = viewport.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            offsetX -= (mouseX / newScale - mouseX / scale) * newScale;
            offsetY -= (mouseY / newScale - mouseY / scale) * newScale;
            
            scale = newScale;
            updateTransform();
        }, { passive: false });

        // Middle Mouse Pan
        viewport.onmousedown = (e) => {
            if (e.button === 1 || e.target === viewport) {
                isPanning = true;
                viewport.style.cursor = 'grabbing';
            }
        };

        window.onmousemove = (e) => {
            if (isPanning) {
                offsetX += e.movementX;
                offsetY += e.movementY;
                updateTransform();
            }
            if (draggingNode) {
                // Dragging must account for scale
                const x = (e.clientX - dragOffset.x - offsetX) / scale;
                const y = (e.clientY - dragOffset.y - offsetY) / scale;
                draggingNode.style.left = x + 'px';
                draggingNode.style.top = y + 'px';
                const node = nodes.find(n => n.id === parseInt(draggingNode.id.split('-')[1]));
                node.x = x; node.y = y;
                drawLinks();
            }
        };

        window.onmouseup = () => {
            isPanning = false;
            draggingNode = null;
            viewport.style.cursor = 'grab';
        };
    }

    function updateTransform() {
        content.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        document.getElementById('zoomDisplay').innerText = Math.round(scale * 100) + "%";
    }

    function addVariable() {
        const name = prompt("Variable Name:");
        if (name) {
            variables.push(name);
            renderVariables();
        }
    }

    function renderVariables() {
        const list = document.getElementById('varList');
        list.innerHTML = variables.map((v, i) => `
            <div class="var-item">
                <input value="${v}" onchange="variables[${i}]=this.value" style="margin:0">
                <button onclick="variables.splice(${i},1);renderVariables()">×</button>
            </div>
        `).join('');
    }

    // --- Node Core Logic ---
    let draggingNode = null;
    let dragOffset = { x: 0, y: 0 };

    function addNode(x = 100, y = 100) {
        const node = { id: nodeIdCounter++, x, y, type: "speech", character: characters[0].name, text: "", condition: "", action: "" };
        nodes.push(node);
        renderNode(node);
    }

    function renderNode(node) {
        const div = document.createElement('div');
        div.className = `node node-type-${node.type}`;
        div.id = `node-${node.id}`;
        div.style.left = node.x + 'px'; div.style.top = node.y + 'px';
        div.style.borderColor = characters.find(c => c.name === node.character).color;

        div.innerHTML = `
            <div class="node-header"><span>#${node.id}</span><span style="cursor:pointer" onclick="removeNode(${node.id})">×</span><span style="cursor:pointer" onclick="duplicateNode(${node.id})" style="margin-left:5px;">⧉</span></div>
            <div class="node-content">
                <label>TYPE</label>
                <select onchange="updateNode(${node.id}, 'type', this.value)">
                    <option value="speech" ${node.type === 'speech' ? 'selected' : ''}>Speech</option>
                    <option value="choice" ${node.type === 'choice' ? 'selected' : ''}>Choice</option>
                </select>
                <label>CHARACTER</label>
                <select onchange="updateNode(${node.id}, 'character', this.value)">
                    ${characters.map(c => `<option value="${c.name}" ${c.name === node.character ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                <label>IF (CONDITION)</label>
                <input type="text" class="logic-field" value="${node.condition}" oninput="updateNode(${node.id}, 'condition', this.value)">
                <textarea oninput="updateNode(${node.id}, 'text', this.value)" placeholder="Text...">${node.text}</textarea>
                <label>SET (ACTION)</label>
                <input type="text" class="logic-field" value="${node.action}" oninput="updateNode(${node.id}, 'action', this.value)">
            </div>
            <div class="dot in-dot"></div><div class="dot out-dot" onmousedown="initLink(event, ${node.id})"></div>
        `;

        div.onmousedown = (e) => {
            if (e.target.closest('.dot') || ['SELECT', 'TEXTAREA', 'INPUT'].includes(e.target.tagName)) return;
            draggingNode = div;
            dragOffset.x = e.clientX - (div.offsetLeft * scale + offsetX);
            dragOffset.y = e.clientY - (div.offsetTop * scale + offsetY);
        };
        content.appendChild(div);
    }

    function updateNode(id, field, value) {
        const node = nodes.find(n => n.id === id);
        node[field] = value;
        const el = document.getElementById(`node-${id}`);
        if (field === 'type') el.className = `node node-type-${value}`;
        if (field === 'character') el.style.borderColor = characters.find(c => c.name === value).color;
        drawLinks();
    }

    function initLink(e, fromId) {
        e.stopPropagation();
        const onLinkEnd = (ev) => {
            const targetIn = ev.target.closest('.in-dot');
            if (targetIn) {
                const toId = parseInt(targetIn.parentElement.id.split('-')[1]);
                if (fromId !== toId) { connections.push({ from: fromId, to: toId }); drawLinks(); }
            }
            window.removeEventListener('mouseup', onLinkEnd);
        };
        window.addEventListener('mouseup', onLinkEnd);
    }

    function drawLinks() {
        svgLayer.innerHTML = '';
        connections.forEach(c => {
            const n1 = document.getElementById(`node-${c.from}`);
            const n2 = document.getElementById(`node-${c.to}`);
            if (!n1 || !n2) return;
            const x1 = n1.offsetLeft + 240, y1 = n1.offsetTop + (n1.offsetHeight/2);
            const x2 = n2.offsetLeft, y2 = n2.offsetTop + (n2.offsetHeight/2);
            const color = characters.find(chr => chr.name === nodes.find(n => n.id === c.from).character).color;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`);
            path.setAttribute("stroke", color); path.setAttribute("stroke-width", "3"); path.setAttribute("fill", "none");
            svgLayer.appendChild(path);
        });
    }

    function removeNode(id) {
        nodes = nodes.filter(n => n.id !== id);
        connections = connections.filter(c => c.from !== id && c.to !== id);
        document.getElementById(`node-${id}`).remove();
        drawLinks();
    }

    function duplicateNode(id) {
        const nodeToDuplicate = nodes.find(n => n.id === id);
        if (nodeToDuplicate) {
            // Create a new node with incremented ID and slightly offset position
            const newNode = { 
                id: nodeIdCounter++, 
                x: nodeToDuplicate.x + 30, 
                y: nodeToDuplicate.y + 30, 
                type: nodeToDuplicate.type,
                character: nodeToDuplicate.character,
                text: nodeToDuplicate.text,
                condition: nodeToDuplicate.condition,
                action: nodeToDuplicate.action
            };
            nodes.push(newNode);
            renderNode(newNode);
        }
    }

    function exportData() {
        const blob = new Blob([JSON.stringify({ variables, nodes, connections }, null, 2)], {type : 'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'urage_engine_data.json'; a.click();
    }

    function describeCurrentAssets() {
        const text = JSON.stringify({ variables, nodes, connections }, null, 2);
        return [{
            kind: 'text',
            title: 'Dialogue Tree Engine Data',
            fileName: 'urage_engine_data.json',
            mimeType: 'application/json',
            textContent: text,
            previewKind: 'text',
            previewText: text,
            sourceDetail: 'Dialogue tree graph data for engine import.',
            metadata: { sourceTool: 'dialogue-tree-visualizer', resourceFormat: 'dialogue-tree-json' }
        }];
    }

    window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
    window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;

    init();