let allData = [];
        let typeChartInstance = null;
        let currentSort = { column: 'lines', direction: 'desc' };
        
        const els = {
            scanBtn: document.getElementById('scanBtn'),
            folderInput: document.getElementById('folderInput'),
            resultsBody: document.getElementById('resultsBody'),
            statStatus: document.getElementById('statStatus'),
            progressBar: document.getElementById('progressBar'),
            searchInput: document.getElementById('searchInput'),
            groupBySelect: document.getElementById('groupBySelect'),
            sortHeaders: document.querySelectorAll('.sortable')
        };

        els.scanBtn.addEventListener('click', () => els.folderInput.click());
        els.searchInput.addEventListener('input', renderView);
        els.groupBySelect.addEventListener('change', renderView);
        
        els.sortHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'desc';
                }
                
                els.sortHeaders.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
                header.classList.add(`sorted-${currentSort.direction}`);
                
                renderView();
            });
        });

        els.folderInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            allData = [];
            els.statStatus.innerText = 'Reading files...';
            els.statStatus.className = 'text-sm font-bold mt-2 text-blue-500 animate-pulse';
            els.resultsBody.innerHTML = '';
            
            const totalFiles = files.length;
            let processed = 0;

            const textExtensions = ['js', 'ts', 'html', 'css', 'txt', 'md', 'json', 'py', 'php', 'c', 'cpp', 'java', 'jsx', 'tsx', 'vue', 'rb', 'go', 'sql'];

            for (const file of files) {
                if (processed % 50 === 0) {
                    els.progressBar.style.width = `${(processed / totalFiles) * 100}%`;
                    els.statStatus.innerText = `Processing ${processed} / ${totalFiles}`;
                    await new Promise(r => setTimeout(r, 0)); 
                }

                if (file.webkitRelativePath.includes('/.') || file.webkitRelativePath.includes('node_modules/') || file.webkitRelativePath.includes('dist/')) {
                    processed++;
                    continue;
                }

                const ext = file.name.split('.').pop().toLowerCase();
                const isText = textExtensions.includes(ext);
                
                let lines = 0;
                if (isText && file.size < 5000000) { 
                    try {
                        const text = await file.text();
                        for (let i = 0; i < text.length; i++) {
                            if (text[i] === '\n') lines++;
                        }
                        if (text.length > 0) lines++; 
                    } catch (err) { lines = 0; }
                }

                const pathParts = file.webkitRelativePath.split('/');
                const topFolder = pathParts.length > 1 ? pathParts[0] : 'Root';

                allData.push({
                    name: file.name,
                    path: file.webkitRelativePath,
                    folder: topFolder,
                    ext: ext || 'unknown',
                    lines: lines,
                    size: file.size
                });

                processed++;
            }

            els.progressBar.style.width = '100%';
            els.statStatus.innerText = 'Analysis Complete';
            els.statStatus.className = 'text-sm font-bold mt-2 text-green-600';
            setTimeout(() => els.progressBar.style.width = '0%', 1000);
            
            updateStats(allData);
            updateChart(allData);
            renderView();
        });

        function renderView() {
            if (!allData.length) return;

            let processedData = [...allData];

            const query = els.searchInput.value.toLowerCase();
            if (query) {
                processedData = processedData.filter(item => 
                    item.path.toLowerCase().includes(query) || 
                    item.ext.toLowerCase().includes(query)
                );
            }

            processedData.sort((a, b) => {
                let valA = a[currentSort.column];
                let valB = b[currentSort.column];
                
                if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
                
                if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });

            const groupBy = els.groupBySelect.value;
            let html = '';

            if (groupBy === 'none') {
                html = processedData.map(item => createRow(item)).join('');
            } else {
                const groups = {};
                processedData.forEach(item => {
                    const key = item[groupBy];
                    if (!groups[key]) groups[key] = { items: [], lines: 0, size: 0 };
                    groups[key].items.push(item);
                    groups[key].lines += item.lines;
                    groups[key].size += item.size;
                });

                for (const [groupName, groupData] of Object.entries(groups)) {
                    html += `
                        <tr class="bg-slate-100 border-t-2 border-slate-200">
                            <td colspan="4" class="px-6 py-3">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-slate-700 uppercase tracking-wide text-xs">
                                        ${groupBy === 'ext' ? 'Extension:' : 'Folder:'} ${groupName} 
                                        <span class="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px]">${groupData.items.length} files</span>
                                    </span>
                                    <div class="text-xs text-slate-500 font-semibold space-x-4">
                                        <span class="text-blue-600">${groupData.lines.toLocaleString()} SLOC</span>
                                        <span>${formatBytes(groupData.size)}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    html += groupData.items.map(item => createRow(item)).join('');
                }
            }

            els.resultsBody.innerHTML = html;
        }

        function createRow(item) {
            return `
                <tr class="hover:bg-blue-50/50 transition-colors group">
                    <td class="px-6 py-3 text-sm font-medium text-slate-800">
                        <span class="text-[10px] text-slate-400 block font-normal uppercase tracking-wider group-hover:text-blue-400 transition-colors">${item.path.replace('/' + item.name, '')}</span>
                        ${item.name}
                    </td>
                    <td class="px-6 py-3 text-xs font-mono uppercase text-slate-500">${item.ext}</td>
                    <td class="px-6 py-3 text-sm text-right font-semibold ${item.lines > 1000 ? 'text-amber-600' : 'text-slate-700'}">${item.lines.toLocaleString()}</td>
                    <td class="px-6 py-3 text-sm text-right text-slate-500">${formatBytes(item.size)}</td>
                </tr>
            `;
        }

        function updateStats(data) {
            const totals = data.reduce((acc, curr) => {
                acc.lines += curr.lines;
                acc.size += curr.size;
                return acc;
            }, { lines: 0, size: 0 });

            document.getElementById('statFiles').innerText = data.length.toLocaleString();
            document.getElementById('statLines').innerText = totals.lines.toLocaleString();
            document.getElementById('statSize').innerText = formatBytes(totals.size);
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        function updateChart(data) {
            const ctx = document.getElementById('typeChart').getContext('2d');
            const counts = {};
            data.forEach(i => counts[i.ext] = (counts[i.ext] || 0) + i.lines); 

            const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 4); 
            
            if (typeChartInstance) typeChartInstance.destroy();
            typeChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: sorted.map(i => i[0].toUpperCase()),
                    datasets: [{
                        data: sorted.map(i => i[1]),
                        backgroundColor: ['#2563eb', '#8b5cf6', '#f43f5e', '#10b981'],
                        borderWidth: 0
                    }]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 }, color: getComputedStyle(document.body).getPropertyValue('--tool-text').trim() || '#f6f1ee' } },
                        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw.toLocaleString()} Lines` } }
                    } 
                }
            });
        }

        function applyDashboardTheme(nextTheme) {
            document.body.setAttribute('data-dashboard-theme', nextTheme || 'fire');
            if (allData.length) updateChart(allData);
        }

        function describeCurrentAssets() {
            const text = JSON.stringify({ files: allData, sort: currentSort }, null, 2);
            return [{
                kind: 'text',
                title: 'File Analysis JSON',
                fileName: 'file-analysis.json',
                mimeType: 'application/json',
                textContent: text,
                previewKind: 'text',
                previewText: text,
                sourceDetail: 'Workspace file analysis data.',
                metadata: { sourceTool: 'filer', resourceFormat: 'file-analysis-json' }
            }];
        }

        window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
        window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;

        window.addEventListener('message', (event) => {
            const message = event && event.data;
            if (message && message.type === 'tool:theme') applyDashboardTheme(message.payload?.theme);
        });

        applyDashboardTheme(document.body.getAttribute('data-dashboard-theme') || 'fire');