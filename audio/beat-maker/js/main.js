// =========================================================
// MAIN - State initialization & app startup
// =========================================================

const state = {
  patterns: { A: clone(PRESETS['Neon Bounce']), B: clone(PRESETS['Lo-Fi Night']) },
  activePattern: 'A',
  chainMode: false,
  currentStep: 0,
  isPlaying: false,
  nextNoteTime: 0,
  timerId: null,
  lookahead: 25,
  scheduleAheadTime: 0.12,
  audio: null,
  masterGain: null,
  memory: Array.from({ length: 4 }, () => null)
};

function initApp() {
  applyDashboardTheme(readStoredDashboardTheme() || document.body.getAttribute('data-dashboard-theme') || 'fire');
  buildPresetCards();
  loadLocal();
  updateControls();
  renderLanes();
  renderMemoryGrid();
  attachEventHandlers();
  // The auto-random lane picks and per-lane density were only drawn after the scope changed, so they started empty.
  renderAutoRandomLaneSelector();
  renderLaneIntensitySliders();
  initDeck();
}

initApp();