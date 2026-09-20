let players = [], busted = [], levels = [], currentLevel = 0, timeLeft = 0, totalSecs = 0, isRunning = false, clockInterval;
    let auditLog = [];
    let chips = [{v:100, c:'#fff'}, {v:500, c:'#ef4444'}, {v:1000, c:'#3b82f6'}, {v:5000, c:'#10b981'}, {v:25000, c:'#000'}];

    function init() { applySettings(true); renderChips(); }

    function addLog(msg) {
        auditLog.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    }

    function applySettings(silent = false) {
        const sb = parseInt(document.getElementById('set-sb').value);
        const time = parseInt(document.getElementById('set-time').value);
        levels = [];
        let curSB = sb;
        let cumulative = 0;

        for(let i=1; i<=30; i++) {
            levels.push({ type:'level', sb: curSB, bb: curSB*2, ante: i>=5 ? curSB*2 : 0, duration: time*60, t: cumulative });
            cumulative += time*60;
            if(i % 4 === 0) { levels.push({ type:'break', duration: 15*60, t: cumulative }); cumulative += 15*60; }
            curSB = (i % 2 === 0) ? curSB * 2 : Math.round(curSB * 1.5 / 25) * 25;
        }
        currentLevel = 0; timeLeft = levels[0].duration; totalSecs = 0;
        if(!silent) { players = []; busted = []; auditLog = []; addLog("Tournament Initialized."); }
        updateUI(); renderStructure(); calcPayouts(); renderPlayers();
        showTab('clock');
    }

    function toggleClock() {
        if(isRunning) { clearInterval(clockInterval); document.getElementById('play-btn').innerText = "RESUME"; addLog("Timer Paused"); }
        else {
            clockInterval = setInterval(() => { 
                if(timeLeft > 0) { timeLeft--; totalSecs++; updateUI(); }
                else { document.getElementById('bell').play(); changeLevel(1, false); }
            }, 1000);
            document.getElementById('play-btn').innerText = "PAUSE";
            addLog("Timer Started");
        }
        isRunning = !isRunning;
    }

    function changeLevel(dir, manual) {
        currentLevel = Math.max(0, Math.min(levels.length-1, currentLevel + dir));
        timeLeft = levels[currentLevel].duration;
        if(manual) addLog(`Manual Level Jump to ${currentLevel + 1}`);
        updateUI(); renderStructure();
    }

    function updateUI() {
        const lvl = levels[currentLevel];
        const next = levels[currentLevel+1] || lvl;
        document.getElementById('timer-text').innerText = fmt(timeLeft);
        document.getElementById('total-runtime').innerText = fmt(totalSecs, true);
        
        if(lvl.type === 'break') {
            document.getElementById('level-label').innerText = "BREAK";
            document.getElementById('blind-text').innerText = "PAUSED";
            document.getElementById('ante-text').innerText = "COLOR UP CHIPS";
        } else {
            document.getElementById('level-label').innerText = `LEVEL ${currentLevel + 1}`;
            document.getElementById('blind-text').innerText = `${lvl.sb.toLocaleString()} / ${lvl.bb.toLocaleString()}`;
            document.getElementById('ante-text').innerText = lvl.ante > 0 ? `BB ANTE: ${lvl.ante.toLocaleString()}` : 'NO ANTE';
        }
        document.getElementById('next-blind').innerText = next.type === 'break' ? 'BREAK' : `${next.sb.toLocaleString()} / ${next.bb.toLocaleString()}`;
        document.getElementById('players-ratio').innerText = `${players.length} / ${players.length + busted.length}`;
        const startChips = parseInt(document.getElementById('set-chips').value);
        document.getElementById('avg-stack').innerText = players.length ? Math.floor(((players.length + busted.length) * startChips) / players.length).toLocaleString() : '0';
    }

    function renderStructure() {
        document.getElementById('structure-body').innerHTML = levels.map((l, i) => `
            <tr class="${i === currentLevel ? 'active-row' : ''} ${l.type === 'break' ? 'break-row' : ''}">
                <td>${l.type === 'break' ? '-' : i+1}</td>
                <td>${l.type === 'break' ? 'BREAK' : l.sb.toLocaleString() + ' / ' + l.bb.toLocaleString()}</td>
                <td>${l.type === 'break' ? '-' : l.ante.toLocaleString()}</td>
                <td>${Math.floor(l.t/60)}m</td>
            </tr>
        `).join('');
    }

    function addPlayer() {
        const name = document.getElementById('player-name-input').value;
        if(!name) return;
        players.push({ id: Date.now(), name });
        document.getElementById('player-name-input').value = '';
        addLog(`Joined: ${name}`);
        renderPlayers(); updateUI(); calcPayouts();
    }

    function eliminate(id) {
        const idx = players.findIndex(p => p.id === id);
        const p = players.splice(idx, 1)[0];
        p.rank = players.length + 1;
        busted.unshift(p);
        addLog(`Busted: ${p.name} at ${p.rank}th place`);
        renderPlayers(); updateUI(); calcPayouts();
    }

    function renderPlayers() {
        document.getElementById('active-players-list').innerHTML = players.map(p => `<div class="player-card"><span>${p.name}</span><button class="bust-btn" onclick="eliminate(${p.id})">BUST</button></div>`).join('');
        document.getElementById('busted-players-list').innerHTML = busted.map(p => `<div class="player-card" style="opacity:0.5"><span>#${p.rank} ${p.name}</span></div>`).join('');
    }

    function calcPayouts() {
        const count = players.length + busted.length;
        const buyin = parseInt(document.getElementById('set-buyin').value);
        const total = count * buyin;
        document.getElementById('total-pool').innerText = `$${total.toLocaleString()}`;
        let struct = count >= 15 ? [50, 25, 15, 10] : (count >= 8 ? [60, 30, 10] : [70, 30]);
        if(count < 4) struct = [100];

        document.getElementById('payout-body').innerHTML = struct.map((pct, i) => {
            const winner = busted.find(p => p.rank === i+1) || (players.length === 1 && i === 0 ? players[0] : null);
            return `<tr><td style="color:var(--accent)">${i+1} Place (${pct}%)</td><td>${winner ? winner.name : '---'}</td><td>$${Math.floor(total*pct/100).toLocaleString()}</td></tr>`;
        }).join('');
    }

    function exportTournamentData() {
        const buyin = document.getElementById('set-buyin').value;
        const total = (players.length + busted.length) * buyin;
        let content = `TOURNAMENT SUMMARY - ${new Date().toLocaleDateString()}\n`;
        content += `==========================================\n`;
        content += `Total Entries: ${players.length + busted.length}\n`;
        content += `Total Prize Pool: $${total.toLocaleString()}\n`;
        content += `Total Duration: ${document.getElementById('total-runtime').innerText}\n\n`;
        content += `FINAL RANKINGS:\n`;
        if(players.length === 1) content += `1st: ${players[0].name} (WINNER)\n`;
        busted.forEach(p => content += `${p.rank}th: ${p.name}\n`);
        content += `\nAUDIT LOG:\n`;
        auditLog.forEach(line => content += `${line}\n`);

        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `poker_results_${Date.now()}.txt`;
        a.click();
    }

    function fmt(s, long) {
        const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
        return long ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
    }

    function renderChips() {
        document.getElementById('clock-chip-legend').innerHTML = chips.map(c => `<div style="display:flex; align-items:center; gap:8px; background:#1f1f23; padding:5px 12px; border-radius:20px; border:1px solid #333;"><div style="width:12px; height:12px; border-radius:50%; background:${c.c}"></div><span style="font-size:0.75rem; font-weight:bold">${c.v.toLocaleString()}</span></div>`).join('');
    }

    function showTab(id, e) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('view-' + id).classList.add('active');
        if(e) e.target.classList.add('active');
    }

    init();