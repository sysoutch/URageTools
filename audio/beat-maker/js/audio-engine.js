// =========================================================
// AUDIO ENGINE - Sound synthesis & playback
// =========================================================

function ensureAudio() {
  if (state.audio) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = currentPattern().volume / 100;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 8;
  comp.ratio.value = 3;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  master.connect(comp);
  comp.connect(ctx.destination);
  state.audio = ctx;
  state.masterGain = master;
}

// The sounds themselves are in beat-engine.js, the same file Bottlefield's Party Yacht DJ plays.
function playStep(step, time) {
  BeatEngine.playStep(state.audio, state.masterGain, currentPattern(), step, time);
}
