// =========================================================
// DECK - what's on, play, and party mode's phrase, at the top of the main area
// =========================================================
// It stays usable when the dashboard takes the sidebar away (the transport lives there too). The phrase strip shows
// party mode's 16 bars (beat-engine.js section): where the breakdown, the build-up and the drop fall, and the bar
// playing now.

// Each preset's style, for its chip in the bank.
const PRESET_STYLE = {
  'Neon Bounce': 'Synth pop', 'Lo-Fi Night': 'Lo-fi', 'House Starter': 'House', 'Trap Minimal': 'Trap', 'Synth Drive': 'Synthwave',
  'Party Yacht': 'Deck house', 'Disco Fever': 'Disco', 'Big Room': 'EDM', 'Drum & Bass': 'DnB', 'Reggaeton': 'Latin',
  'UK Garage': 'Garage', 'Techno Rave': 'Techno', 'Afro House': 'Afro', 'Moombahton': 'Latin', 'Electro Swing': 'Swing', 'Hardstyle': 'Hard',
};
// What each bar of the phrase is, for the strip (the same layout as beat-engine.js sectionOf).
const PHRASE_BARS = Array.from({ length: 16 }, (_, i) => (i === 8 || i === 9 ? 'breakdown' : i === 14 || i === 15 ? 'build-up' : i === 0 ? 'drop' : 'groove'));
const SECTION_NAMES = { groove: 'Groove', lift: 'Lift', breakdown: 'Breakdown', 'build-up': 'Build-up', drop: 'Drop', loop: 'Plain loop' };

const deck = {
  play: document.getElementById('deckPlay'), preset: document.getElementById('deckPreset'), a: document.getElementById('deckA'), b: document.getElementById('deckB'),
  bpm: document.getElementById('deckBpm'), bpmDown: document.getElementById('bpmDown'), bpmUp: document.getElementById('bpmUp'),
  section: document.getElementById('deckSection'), bar: document.getElementById('deckBar'), phrase: document.getElementById('phrase'),
  pulse: document.getElementById('beatPulse'), party: document.getElementById('partyBtn'), ruler: document.getElementById('stepRuler'),
  cells: [], lastBar: -1, lastSection: '',
};

function initDeck() {
  if (!deck.play) return;
  deck.phrase.innerHTML = '';
  deck.cells = PHRASE_BARS.map((kind, i) => {
    const cell = document.createElement('span');
    cell.className = 'phrase-bar ' + kind;
    cell.title = 'Bar ' + (i + 1) + ': ' + SECTION_NAMES[kind];
    deck.phrase.appendChild(cell);
    return cell;
  });
  deck.play.addEventListener('click', startPlayback);
  deck.a.addEventListener('click', () => togglePattern('A'));
  deck.b.addEventListener('click', () => togglePattern('B'));
  const nudge = (by) => {
    const p = currentPattern();
    p.bpm = Math.max(70, Math.min(180, p.bpm + by));
    updateControls(); persistLocal();
  };
  deck.bpmDown.addEventListener('click', () => nudge(-1));
  deck.bpmUp.addEventListener('click', () => nudge(1));
  deck.party.addEventListener('click', () => {
    const p = currentPattern();
    p.party = p.party === false;
    updateDeck(); persistLocal();
  });
  updateDeck();
}

// The deck as the pattern and the playing stand now.
function updateDeck(step = state.currentStep) {
  if (!deck.play) return;
  const p = currentPattern(), playing = state.isPlaying;
  deck.play.textContent = playing ? '❚❚' : '▶';
  deck.play.classList.toggle('playing', playing);
  deck.preset.textContent = p.name || 'Custom beat';
  deck.a.classList.toggle('on', state.activePattern === 'A');
  deck.b.classList.toggle('on', state.activePattern === 'B');
  deck.bpm.textContent = p.bpm;
  const party = p.party !== false;
  deck.party.classList.toggle('on', party);
  deck.party.textContent = party ? '🎉 Party mode' : '🔁 Plain loop';
  deck.phrase.classList.toggle('off', !party);
  const where = BeatEngine.section(p, step || 0), bar = playing && party ? where.bar % 16 : -1, kind = playing ? where.section : party ? 'groove' : 'loop';
  if (bar !== deck.lastBar) {
    deck.cells.forEach((cell, i) => cell.classList.toggle('now', i === bar));
    deck.lastBar = bar;
  }
  deck.bar.textContent = bar >= 0 ? bar + 1 : 1;
  if (kind !== deck.lastSection) {
    deck.section.textContent = SECTION_NAMES[kind] || kind;
    deck.section.className = 'deck-section ' + kind;
    deck.lastSection = kind;
  }
}

// A flash on every beat, and the deck moved on (sequencer.js, as each step sounds).
function deckStep(step) {
  if (!deck.play) return;
  if (step % 4 === 0) {
    deck.pulse.classList.remove('beat', 'downbeat');
    void deck.pulse.offsetWidth;
    deck.pulse.classList.add(step % 16 === 0 ? 'downbeat' : 'beat');
  }
  updateDeck(step);
}

// The step numbers over the grid, in beats of four.
function renderRuler() {
  if (!deck.ruler) return;
  const p = currentPattern();
  if (deck.ruler.dataset.steps === String(p.steps)) return;
  deck.ruler.dataset.steps = String(p.steps);
  deck.ruler.style.gridTemplateColumns = '190px repeat(' + p.steps + ', minmax(0, 1fr))';
  deck.ruler.classList.toggle('long', p.steps > 16);
  deck.ruler.innerHTML = '<span class="ruler-pad"></span>' + Array.from({ length: p.steps }, (_, i) => '<span class="' + (i % 4 === 0 ? 'beat' : '') + (i % 16 === 0 ? ' bar' : '') + '">' + (i % 4 === 0 ? i / 4 + 1 : '·') + '</span>').join('');
}
