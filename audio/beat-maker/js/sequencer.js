// =========================================================
// SEQUENCER - Playback scheduling & transport control
// =========================================================

function secondsPerStep() {
  return 60 / currentPattern().bpm / 4;
}

// nextNoteTime stays on the grid; swing is added when a step is played (BeatEngine.swingDelay), so it no longer
// slows the tempo down.
function nextStep() {
  const pattern = currentPattern();
  state.nextNoteTime += secondsPerStep();

  // Detect loop wrap-around for auto-random. (It used to wrap one step late, playing 17 steps of a 16-step loop.)
  state.currentStep++;
  if (state.currentStep >= pattern.steps) {
    state.currentStep = 0;
    if (state.chainMode) state.activePattern = state.activePattern === 'A' ? 'B' : 'A';
    // Trigger auto-random loop check after wrapping
    setTimeout(() => checkLoopCompletion(), 0);
  }
}

function scheduler() {
  while (state.nextNoteTime < state.audio.currentTime + state.scheduleAheadTime) {
    const drawStep = state.currentStep;
    const drawPattern = state.activePattern;
    const playAt = state.nextNoteTime + BeatEngine.swingDelay(currentPattern(), drawStep);
    playStep(drawStep, playAt);
    const delay = Math.max(0, (playAt - state.audio.currentTime) * 1000);
    setTimeout(() => {
      ui.stepLabel.textContent = String(drawStep + 1);
      ui.patternLabel.textContent = drawPattern;
      ui.lengthLabel.textContent = String(currentPattern().steps);
      if (state.activePattern === drawPattern) markPlayhead(drawStep); else renderLanes(drawStep);
      // Each new bar: show what party mode plays in it (silenced hits, extra hits).
      if (drawStep % 16 === 0) showArrangement(drawStep);
      deckStep(drawStep);
    }, delay);
    nextStep();
  }
  state.timerId = setTimeout(scheduler, state.lookahead);
}

function setPlayState(on) {
  state.isPlaying = on;
  ui.playBtn.innerHTML = on ? icon('fa-pause') + '<span>Pause</span>' : icon('fa-play') + '<span>Play</span>';
  ui.led.classList.toggle('on', on);
  if (!on) showArrangement(null);
  updateDeck();
}

function startPlayback() {
  ensureAudio();
  state.audio.resume();
  if (state.isPlaying) {
    clearTimeout(state.timerId);
    setPlayState(false);
    return;
  }
  state.currentStep = 0;
  state.nextNoteTime = state.audio.currentTime + 0.05;
  scheduler();
  setPlayState(true);
}

function stopPlayback() {
  clearTimeout(state.timerId);
  state.currentStep = 0;
  setPlayState(false);
  renderLanes(0);
  ui.stepLabel.textContent = '1';
}