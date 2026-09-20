let state = {
            activeBoard: 0,
            boards: [{
                name: 'Main Project',
                columns: [
                    { id: 'col1', title: 'To Do', cards: [{ id: 1, title: 'Fix Layout', priority: 'high', tag: 'UI', date: '2026-02-01' }] },
                    { id: 'col2', title: 'In Progress', cards: [] },
                    { id: 'col3', title: 'Done', cards: [{ id: 2, title: 'Setup Repo', priority: 'low', tag: 'Dev', date: '2026-01-20' }] }
                ]
            }]
        };

        // References
        let editingRef = { col: null, card: null };
        
        // Drag State
        let dragType = null; // 'card' or 'column'
        let draggingCardId = null; 
        let draggingColumnIndex = null;

        function applyDashboardTheme(theme) {
            if (typeof window.applyDashboardThemeVars === 'function') {
                window.applyDashboardThemeVars(theme || document.body.getAttribute('data-dashboard-theme') || 'fire');
                return;
            }
            document.body.setAttribute('data-dashboard-theme', String(theme || 'fire').trim() || 'fire');
        }

        function init() {
            const saved = localStorage.getItem('flowstate_v4');
            if (saved) state = JSON.parse(saved);
            applyDashboardTheme(document.body.getAttribute('data-dashboard-theme') || 'fire');
            render();
        }

        function render() {
            renderSidebar();
            renderBoard();
            localStorage.setItem('flowstate_v4', JSON.stringify(state));
        }

        function renderSidebar() {
            document.getElementById('sidebar-list').innerHTML = state.boards.map((b, i) => `
                <div class="board-link ${i === state.activeBoard ? 'active' : ''}" onclick="switchBoard(${i})">
                    ● ${b.name}
                </div>
            `).join('');
        }

        function switchBoard(idx) {
            state.activeBoard = idx;
            render();
        }

        function addBoard() {
            const name = prompt("Board Name:");
            if (name) {
                state.boards.push({
                    name: name,
                    columns: [
                        { id: Date.now()+'1', title: 'To Do', cards: [] },
                        { id: Date.now()+'2', title: 'Done', cards: [] }
                    ]
                });
                state.activeBoard = state.boards.length - 1;
                render();
            }
        }

        function renderBoard() {
            const canvas = document.getElementById('canvas');
            canvas.innerHTML = '';
            const board = state.boards[state.activeBoard];

            board.columns.forEach((col, colIdx) => {
                const colEl = document.createElement('div');
                colEl.className = 'column';
                colEl.dataset.colIdx = colIdx; // Store index for logic
                colEl.draggable = true; // Make column draggable

                // COLUMN DRAG EVENTS
                colEl.addEventListener('dragstart', e => handleColumnDragStart(e, colIdx));
                colEl.addEventListener('dragend', handleColumnDragEnd);
                
                // CARD DROP ZONES (On the column)
                colEl.addEventListener('dragover', e => handleCardDragOver(e, colEl));
                colEl.addEventListener('dragleave', e => handleCardDragLeave(e, colEl));
                colEl.addEventListener('drop', e => handleCardDrop(e, colIdx));

                colEl.innerHTML = `
                    <div class="column-header">
                        <span>${col.title}</span>
                        <span style="opacity:0.5; font-size:0.8rem">${col.cards.length}</span>
                    </div>
                    <div class="card-list">
                        ${col.cards.map((c, cardIdx) => `
                            <div class="card" 
                                 id="c-${c.id}" 
                                 draggable="true" 
                                 data-id="${c.id}"
                                 onclick="openModal(${colIdx}, ${cardIdx})">
                                <span class="tag priority-${c.priority}">${c.tag || 'Task'}</span>
                                <div class="card-title">${c.title}</div>
                                <div class="card-date">📅 ${c.date || 'No date'}</div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn" style="margin: 10px; background: transparent; color: var(--text-muted)" onclick="addTask(${colIdx})">+ Add Card</button>
                `;
                
                // Add Drag Start/End listeners to CARDS
                const cards = colEl.querySelectorAll('.card');
                cards.forEach(c => {
                    c.addEventListener('dragstart', (e) => {
                        e.stopPropagation(); // CRITICAL: Stop column from dragging when dragging a card
                        dragType = 'card';
                        c.classList.add('dragging');
                        draggingCardId = c.dataset.id;
                    });
                    c.addEventListener('dragend', () => {
                        dragType = null;
                        c.classList.remove('dragging');
                        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-active'));
                    });
                });

                canvas.appendChild(colEl);
            });
            filterCards();
        }

        /* --- COLUMN DRAG LOGIC (Horizontal) --- */
        function handleColumnDragStart(e, idx) {
            dragType = 'column';
            draggingColumnIndex = idx;
            e.target.classList.add('dragging');
        }

        function handleColumnDragEnd(e) {
            e.target.classList.remove('dragging');
            dragType = null;
            
            // Save the new column order based on DOM
            const board = state.boards[state.activeBoard];
            const canvas = document.getElementById('canvas');
            const newOrderIndices = [...canvas.children].map(child => parseInt(child.dataset.colIdx));
            
            // Rebuild column array
            const newColumns = newOrderIndices.map(oldIndex => board.columns[oldIndex]);
            board.columns = newColumns;
            
            render();
        }

        function handleCanvasDragOver(e) {
            if(dragType !== 'column') return; // Ignore if dragging a card
            e.preventDefault();
            
            const canvas = document.getElementById('canvas');
            const draggingEl = document.querySelector('.column.dragging');
            
            const afterElement = getColumnAfterElement(canvas, e.clientX);
            
            if (afterElement == null) {
                canvas.appendChild(draggingEl);
            } else {
                canvas.insertBefore(draggingEl, afterElement);
            }
        }

        function getColumnAfterElement(container, x) {
            const draggableElements = [...container.querySelectorAll('.column:not(.dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                // Distance from horizontal center
                const offset = x - box.left - box.width / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }


        /* --- CARD DRAG LOGIC (Vertical) --- */
        
        function handleCardDragOver(e, columnEl) {
            if(dragType !== 'card') return; // Ignore if dragging a column
            e.preventDefault();
            columnEl.classList.add('drag-active');
            
            const container = columnEl.querySelector('.card-list');
            const dragging = document.querySelector('.card.dragging');
            
            const afterElement = getCardAfterElement(container, e.clientY);
            
            if (afterElement == null) {
                container.appendChild(dragging);
            } else {
                container.insertBefore(dragging, afterElement);
            }
        }

        function handleCardDragLeave(e, columnEl) {
            columnEl.classList.remove('drag-active');
        }

        function getCardAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        function handleCardDrop(e, targetColIdx) {
            if(dragType !== 'card') return;
            e.preventDefault();
            e.stopPropagation(); // Stop bubbling to canvas

            const board = state.boards[state.activeBoard];

            // 1. Find the card object
            let movingCard = null;
            board.columns.forEach(col => {
                const idx = col.cards.findIndex(c => c.id == draggingCardId);
                if(idx !== -1) {
                    movingCard = col.cards[idx];
                    col.cards.splice(idx, 1);
                }
            });

            if(!movingCard) return;

            // 2. Reconstruct array from DOM
            // Note: Since columns might have been reordered, we need to find the specific DOM element dropped on
            // But we have targetColIdx from the closure. BUT, if columns were reordered, idx might be wrong?
            // Actually, render() refreshes indices. But we are midway through drag.
            // Safest way: Read the DOM of the event target's closest column
            const targetColEl = e.currentTarget; // The .column element
            const targetListEl = targetColEl.querySelector('.card-list');
            const newCardIds = [...targetListEl.querySelectorAll('.card')].map(el => el.dataset.id);
            
            // We need to find the REAL column object corresponding to this DOM element
            // Since we might have reordered columns visually but not saved state yet (if we mixed drag types, unlikely here)
            // But dragging cards doesn't reorder columns. So index is safe.
            
            const pool = [...board.columns[targetColIdx].cards, movingCard];
            const newCardsArray = [];
            newCardIds.forEach(id => {
                const card = pool.find(c => c.id == id);
                if(card) newCardsArray.push(card);
            });

            board.columns[targetColIdx].cards = newCardsArray;
            render();
        }

        /* --- STANDARD APP FUNCTIONS --- */
        function filterCards() {
            const query = document.getElementById('searchBar').value.toLowerCase();
            document.querySelectorAll('.card').forEach(card => {
                card.classList.toggle('hidden', !card.innerText.toLowerCase().includes(query));
            });
        }

        function addTask(colIdx) {
            state.boards[state.activeBoard].columns[colIdx].cards.push({
                id: Date.now(), title: 'New Task', priority: 'low', tag: 'Task', date: ''
            });
            render();
        }

        function addColumn() {
            const t = prompt("Column Name:");
            if(t) { 
                state.boards[state.activeBoard].columns.push({
                    id: Date.now(), title: t, cards: []
                }); 
                render(); 
            }
        }

        function openModal(col, card) {
            editingRef = { col, card };
            const data = state.boards[state.activeBoard].columns[col].cards[card];
            document.getElementById('m-title').value = data.title;
            document.getElementById('m-priority').value = data.priority;
            document.getElementById('m-tag').value = data.tag;
            document.getElementById('m-date').value = data.date;
            document.getElementById('modal-overlay').style.display = 'flex';
        }

        function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

        function saveTask() {
            const card = state.boards[state.activeBoard].columns[editingRef.col].cards[editingRef.card];
            card.title = document.getElementById('m-title').value;
            card.priority = document.getElementById('m-priority').value;
            card.tag = document.getElementById('m-tag').value;
            card.date = document.getElementById('m-date').value;
            closeModal();
            render();
        }

        function deleteTask() {
            state.boards[state.activeBoard].columns[editingRef.col].cards.splice(editingRef.card, 1);
            closeModal();
            render();
        }

        function describeCurrentAssets() {
            const text = JSON.stringify(state, null, 2);
            return [{
                kind: 'text',
                title: 'Kanban Board JSON',
                fileName: 'kanban-board.json',
                mimeType: 'application/json',
                textContent: text,
                previewKind: 'text',
                previewText: text,
                sourceDetail: 'Kanban board state data.',
                metadata: { sourceTool: 'kanban', resourceFormat: 'kanban-json' }
            }];
        }

        window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
        window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;

        window.addEventListener('message', event => {
            const message = event?.data || null;
            if (!message || message.source !== 'urage-dashboard') return;
            if (message.type === 'tool:theme') applyDashboardTheme(message.payload?.theme);
        });

        init();