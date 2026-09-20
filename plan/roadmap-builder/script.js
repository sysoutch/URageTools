let milestones = JSON.parse(localStorage.getItem('myRoadmap')) || [
            { title: "Project Kickoff", desc: "Aligning stakeholders and defining high-level goals." },
            { title: "UX Research", desc: "User interviews and competitive analysis." },
            { title: "Visual Design", desc: "Design system and high-fidelity mockups." },
            { title: "Alpha Version", desc: "Internal testing of core features." },
            { title: "Beta Launch", desc: "Rolling out to the first 500 early adopters." },
            { title: "Global Scale", desc: "Expanding server infrastructure globally." }
        ];

        const container = document.getElementById('roadmap');

        function save() {
            localStorage.setItem('myRoadmap', JSON.stringify(milestones));
        }

        function render() {
            container.innerHTML = '';
            milestones.forEach((m, i) => {
                const item = document.createElement('div');
                item.className = 'item';
                item.innerHTML = `
                    <div class="dot"></div>
                    <div class="card">
                        <h3 contenteditable="true" onblur="update(${i}, 'title', this.innerText)">${m.title}</h3>
                        <p contenteditable="true" onblur="update(${i}, 'desc', this.innerText)">${m.desc}</p>
                        <div class="actions">
                            <button class="btn-icon" onclick="move(${i}, -1)" title="Move Up/Left">←</button>
                            <button class="btn-icon" onclick="move(${i}, 1)" title="Move Down/Right">→</button>
                            <button class="btn-icon" onclick="remove(${i})" title="Delete">🗑</button>
                        </div>
                    </div>
                `;
                container.appendChild(item);
            });
        }

        function update(i, field, val) {
            milestones[i][field] = val;
            save();
        }

        function addItem() {
            milestones.push({ title: "New Milestone", desc: "Briefly describe the objective." });
            save();
            render();
        }

        function remove(i) {
            milestones.splice(i, 1);
            save();
            render();
        }

        function move(i, dir) {
            let target = i + dir;
            if (target >= 0 && target < milestones.length) {
                [milestones[i], milestones[target]] = [milestones[target], milestones[i]];
                save();
                render();
            }
        }

        function toggleLayout() {
            container.classList.toggle('vertical');
            container.classList.toggle('horizontal');
        }

        function clearAll() {
            if(confirm("Are you sure? This will delete all milestones.")) {
                milestones = [];
                save();
                render();
            }
        }

        function applyDashboardTheme(nextTheme) {
            if (typeof window.applyDashboardThemeVars === 'function') {
                window.applyDashboardThemeVars(nextTheme || document.body.getAttribute('data-dashboard-theme') || 'fire');
                return;
            }
            document.body.setAttribute('data-dashboard-theme', String(nextTheme || 'fire').trim() || 'fire');
        }

        function describeCurrentAssets() {
            const text = JSON.stringify({ milestones }, null, 2);
            return [{
                kind: 'text',
                title: 'Roadmap JSON',
                fileName: 'roadmap.json',
                mimeType: 'application/json',
                textContent: text,
                previewKind: 'text',
                previewText: text,
                sourceDetail: 'Roadmap Builder milestone data.',
                metadata: { sourceTool: 'roadmap-builder', resourceFormat: 'roadmap-json' }
            }];
        }

        window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
        window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;

        window.addEventListener('message', (event) => {
            const message = event && event.data;
            if (message && message.type === 'tool:theme') applyDashboardTheme(message.payload?.theme);
        });

        applyDashboardTheme(document.body.getAttribute('data-dashboard-theme') || 'fire');
        render();