// =========================================================
// BEAT ENGINE - the synth and the patterns, with no page attached
// =========================================================
// One file, two homes, kept byte-identical:
//   URageNow  tools/audio/beat-maker/js/beat-engine.js   (the Beat Maker tool)
//   Bottlefield  public/js/audio/beat-engine.js           (the menu and Party Yacht DJs)
// Change it in one, copy it to the other. It knows nothing about either page: give it an AudioContext, the node to
// play into, a pattern and a time, and it plays that step. Patterns are plain data, so one made in the tool plays
// the same in the game (copy it into PRESETS below).
//
// Party mode (on unless a pattern says `party: false`): the engine counts the bars a pattern has played and dresses
// the loop up over 16-bar phrases, so a two-bar loop never sounds like one: a crash at each phrase, a drum fill every
// fourth bar, a breakdown, a build-up with a snare roll and a rising sweep, and a drop with a boom; every other
// phrase lifts the hats and the bass. `section(pattern)` says where it is, for a display.

(function (root) {
  'use strict';

  const LANES = ['kick', 'snare', 'hats', 'clap', 'bass', 'chord', 'perc', 'fx'];
  const MAX_STEPS = 32;
  // The key every pattern plays in unless it brings its own (`bass`: eight notes, `chords`: four chords).
  const BASS_SCALE = ['C2', 'D#2', 'G1', 'A#1', 'C2', 'D#2', 'G1', 'A1'];
  const CHORD_BANK = [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']];
  // How far an off-beat step is pushed late at 100% swing, in steps.
  const SWING_REACH = 0.35;
  // Envelopes can't ramp to or from zero.
  const QUIET = 0.0001;
  // Party mode's phrase (bars of 16 steps) and where in it things happen.
  const PHRASE = 16, FILL_EVERY = 4, BREAK_AT = [8, 9], BUILD_AT = [14, 15];

  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function noteFreq(note) {
    const m = /^([A-G](?:#|b)?)(\d)$/.exec(note);
    const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Noise, made once per AudioContext and kind instead of on every hit.
  const noiseCache = new WeakMap();
  function noise(ctx, type) {
    let kinds = noiseCache.get(ctx);
    if (!kinds) noiseCache.set(ctx, (kinds = {}));
    if (kinds[type]) return kinds[type];
    const length = Math.floor(ctx.sampleRate * (type === 'long' ? 2 : 0.25));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = type === 'pink' ? (last + 0.02 * white) / 1.02 : white;
      last = data[i];
    }
    return (kinds[type] = buffer);
  }
  // A soft clip for weight, once per context.
  const driveCache = new WeakMap();
  function drive(ctx) {
    let curve = driveCache.get(ctx);
    if (!curve) {
      curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
      driveCache.set(ctx, curve);
    }
    const shaper = ctx.createWaveShaper();
    shaper.curve = curve;
    return shaper;
  }

  function envelope(ctx, out, time, peak, attack, length) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(QUIET, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(QUIET * 2, peak), time + attack);
    gain.gain.exponentialRampToValueAtTime(QUIET, time + length);
    gain.connect(out);
    return gain;
  }
  function noiseBurst(ctx, out, time, level, type, filter, freq, q, length, attack = 0.002) {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, type);
    const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
    src.connect(f); f.connect(envelope(ctx, out, time, Math.max(QUIET * 2, level), attack, length));
    src.start(time, Math.random() * 0.1); src.stop(time + length + 0.05);
  }
  function osc(ctx, type, freq, time, length) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    o.start(time); o.stop(time + length + 0.05);
    return o;
  }

  // The pattern's key: its own, or the engine's.
  const bassOf = (pattern) => (pattern && pattern.bass && pattern.bass.length ? pattern.bass : BASS_SCALE);
  const chordsOf = (pattern) => (pattern && pattern.chords && pattern.chords.length ? pattern.chords : CHORD_BANK);
  // The bass note and the chord a step plays: four chords spread over the loop.
  const bassAt = (pattern, step) => { const notes = bassOf(pattern); return notes[step % notes.length]; };
  const chordAt = (pattern, step, steps) => { const bank = chordsOf(pattern); return bank[Math.floor((step % steps) / Math.max(1, steps / 4)) % bank.length]; };

  // Per-hit feel (`pattern.variation`, 0-100): `pitch` and `tone` scale a voice's tuning and brightness a little on
  // every hit, so a lane never machine-guns. NO_FEEL leaves a voice exactly as it always was.
  const NO_FEEL = Object.freeze({ gain: 1, pitch: 1, tone: 1 });
  // Lanes that play notes keep their tuning; only their brightness varies.
  const TUNED = ['bass', 'chord'];
  function feelOf(pattern, key, step) {
    const amount = Math.max(0, Math.min(100, Number(pattern.variation) || 0)) / 100;
    if (!amount) return NO_FEEL;
    const wobble = () => Math.random() * 2 - 1;
    // Accents: the beat a little louder, the off-sixteenths a little softer.
    const accent = step % 4 === 0 ? 0.14 : step % 2 === 1 ? -0.1 : 0;
    return {
      gain: Math.max(0.35, 1 + amount * (accent + wobble() * 0.2)),
      pitch: TUNED.includes(key) ? 1 : 1 + amount * wobble() * 0.03,
      tone: 1 + amount * wobble() * 0.25,
    };
  }

  // Extra sounds per lane, added by beat-sounds.js (addSounds). A pattern picks one with `sounds: { kick: '808' }`;
  // a lane without one, or with a name this page doesn't know, plays its classic voice below.
  const SOUNDS = Object.fromEntries(LANES.map((key) => [key, {}]));
  function addSounds(bank) {
    Object.entries(bank).forEach(([key, variants]) => { if (SOUNDS[key]) Object.assign(SOUNDS[key], variants); });
  }
  function soundOf(pattern, key) {
    const name = pattern.sounds && pattern.sounds[key];
    return name && SOUNDS[key][name] ? SOUNDS[key][name] : null;
  }
  // The sound names a lane can pick, classic first, with their labels.
  function soundsFor(key) {
    return [{ id: 'classic', label: 'Classic' }].concat(Object.entries(SOUNDS[key] || {}).map(([id, s]) => ({ id, label: s.label || id })));
  }

  // The voices. Each plays one hit into `out` at `time`, `level` being the lane's loudness (0-1). `step`, `steps` and
  // `pattern` say where in the loop it is; `lift` is party mode's variation (0 or 1); `feel` the hit's per-hit feel.
  const voices = {
    // A kick: a sine diving from 160 to 48 Hz, a click on top, a touch of drive.
    kick(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) {
      const body = osc(ctx, 'sine', 160 * feel.pitch, time, 0.42);
      body.frequency.exponentialRampToValueAtTime(48 * feel.pitch, time + 0.11);
      const sat = drive(ctx);
      body.connect(sat);
      sat.connect(envelope(ctx, out, time, 1.05 * level, 0.002, 0.4));
      noiseBurst(ctx, out, time, 0.35 * level, 'white', 'highpass', 3000 * feel.tone, 0.7, 0.012, 0.001);
    },
    noiseHit(ctx, out, time, level, type, highpass, length) {
      noiseBurst(ctx, out, time, Math.max(0.05, 0.55 * level), type, 'highpass', highpass, 0.7, length);
    },
    // A snare: a tuned body under a bright crack.
    snare(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) {
      const body = osc(ctx, 'triangle', 220 * feel.pitch, time, 0.14);
      body.frequency.exponentialRampToValueAtTime(170 * feel.pitch, time + 0.08);
      body.connect(envelope(ctx, out, time, 0.45 * level, 0.002, 0.12));
      noiseBurst(ctx, out, time, 0.5 * level, 'white', 'bandpass', 3200 * feel.tone, 0.6, 0.2);
    },
    // A clap: three quick slaps and a tail, with an echo behind it.
    clap(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) {
      [0, 0.011, 0.023].forEach((d, i) => noiseBurst(ctx, out, time + d, (i === 2 ? 0.55 : 0.4) * level, 'white', 'bandpass', 1400 * feel.tone, 1.1, i === 2 ? 0.22 : 0.02));
      noiseBurst(ctx, out, time + 0.18, 0.12 * level, 'white', 'bandpass', 1600 * feel.tone, 1.2, 0.25);
    },
    // Closed hats: six square partials, metallic, cut short.
    hats(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) { voices.metal(ctx, out, time, 0.2 * level, 0.055 * feel.tone, feel.tone); },
    openhat(ctx, out, time, level) { voices.metal(ctx, out, time, 0.16 * level, 0.32); },
    metal(ctx, out, time, level, length, bright = 1) {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000 * bright;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000 * bright; bp.Q.value = 0.8;
      hp.connect(bp); bp.connect(envelope(ctx, out, time, level, 0.001, length));
      [2, 3, 4.16, 5.43, 6.79, 8.21].forEach((k) => osc(ctx, 'square', 40 * k * 10.3, time, length).connect(hp));
    },
    tone(ctx, out, time, freq, duration, type, level, filterFreq) {
      const o = osc(ctx, type, freq, time, duration);
      const filt = ctx.createBiquadFilter();
      filt.type = filterFreq ? 'lowpass' : 'allpass';
      filt.frequency.value = filterFreq || 20000;
      o.connect(filt); filt.connect(envelope(ctx, out, time, Math.max(0.001, level), 0.01, duration));
    },
    // The bass: a sub sine and a saw through a plucked filter. It ducks under a kick on the same step (the pump), and
    // with `lift` every fourth note jumps an octave.
    bass(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) {
      const notes = bassOf(pattern);
      let freq = noteFreq(notes[step % notes.length]);
      if (lift && step % 4 === 2) freq *= 2;
      const len = 0.2, start = time + (pumped ? 0.025 : 0);
      const sub = osc(ctx, 'sine', freq, start, len);
      sub.connect(envelope(ctx, out, start, 0.32 * level, 0.006, len));
      const saw = osc(ctx, 'sawtooth', freq, start, len), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 6;
      lp.frequency.setValueAtTime(1400 * feel.tone, start);
      lp.frequency.exponentialRampToValueAtTime(180, start + len * 0.8);
      saw.connect(lp); lp.connect(envelope(ctx, out, start, 0.16 * level, 0.004, len));
    },
    // Chords: a stab of three detuned saws a note, through a filter that opens wider in a lifted phrase, and two
    // softer echoes after it.
    chord(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) {
      const notes = chordAt(pattern, step, steps);
      const spb = pattern ? 60 / pattern.bpm : 0.5;
      [[0, 1], [spb * 0.75, 0.35], [spb * 1.5, 0.15]].forEach(([d, k]) => {
        const t = time + d, lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = 2;
        lp.frequency.setValueAtTime((lift ? 4200 : 2600) * feel.tone, t);
        lp.frequency.exponentialRampToValueAtTime(700, t + 0.32);
        lp.connect(envelope(ctx, out, t, 0.075 * level * k, 0.006, 0.38));
        notes.forEach((note) => [-9, 0, 9].forEach((cents) => {
          const o = osc(ctx, 'sawtooth', noteFreq(note), t, 0.4);
          o.detune.value = cents;
          o.connect(lp);
        }));
      });
    },
    // Perc: a conga, its pitch walking with the step.
    perc(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) {
      const o = osc(ctx, 'sine', (340 + (step % 4) * 45) * feel.pitch, time, 0.16);
      o.frequency.exponentialRampToValueAtTime((220 + (step % 4) * 30) * feel.pitch, time + 0.06);
      o.connect(envelope(ctx, out, time, 0.28 * level, 0.002, 0.15));
      noiseBurst(ctx, out, time, 0.06 * level, 'white', 'bandpass', 2500 * feel.tone, 1, 0.02);
    },
    // FX: a zap rising through a band filter.
    fx(ctx, out, time, level, step, steps, pattern, lift, pumped, feel = NO_FEEL) {
      const o = osc(ctx, 'sawtooth', 300 * feel.pitch, time, 0.2);
      o.frequency.exponentialRampToValueAtTime(1200 * feel.pitch, time + 0.14);
      const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1400; filter.Q.value = 3;
      o.connect(filter); filter.connect(envelope(ctx, out, time, 0.12 * level, 0.01, 0.18));
    },

    // Party mode's own sounds.
    crash(ctx, out, time, level) { noiseBurst(ctx, out, time, 0.32 * level, 'long', 'highpass', 4500, 0.5, 1.6, 0.003); },
    tom(ctx, out, time, level, pitch) {
      const o = osc(ctx, 'sine', pitch * 1.6, time, 0.25);
      o.frequency.exponentialRampToValueAtTime(pitch, time + 0.12);
      o.connect(envelope(ctx, out, time, 0.5 * level, 0.002, 0.24));
    },
    // A sweep of noise rising over `length` seconds, getting louder: the build-up.
    riser(ctx, out, time, level, length) {
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx, 'long');
      src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
      bp.frequency.setValueAtTime(400, time);
      bp.frequency.exponentialRampToValueAtTime(9000, time + length);
      const g = ctx.createGain();
      g.gain.setValueAtTime(QUIET, time);
      g.gain.exponentialRampToValueAtTime(0.22 * level, time + length);
      g.gain.exponentialRampToValueAtTime(QUIET, time + length + 0.05);
      src.connect(bp); bp.connect(g); g.connect(out);
      src.start(time); src.stop(time + length + 0.1);
    },
    // The drop: a sub boom and a crash.
    impact(ctx, out, time, level) {
      const o = osc(ctx, 'sine', 90, time, 1.2);
      o.frequency.exponentialRampToValueAtTime(32, time + 0.9);
      o.connect(envelope(ctx, out, time, 0.9 * level, 0.004, 1.1));
      voices.crash(ctx, out, time, level);
    },
    // The crowd shouting "Hey!": a short vowel of noise through two formants.
    hey(ctx, out, time, level) {
      [[700, 6, 0.5], [1750, 8, 0.35]].forEach(([f, q, k]) => noiseBurst(ctx, out, time, k * level, 'white', 'bandpass', f, q, 0.16, 0.01));
    },
  };

  // Solo wins over mute: with any lane soloed, only soloed lanes play.
  function audible(pattern, key) {
    const soloed = LANES.some((k) => pattern.lanes[k].solo);
    return soloed ? !!pattern.lanes[key].solo : !pattern.lanes[key].mute;
  }

  function laneLevel(pattern, key) {
    return (pattern.lanes[key].volume || 0) * (pattern.volume / 100);
  }

  // Party mode: how many bars each pattern has played, moved on as its steps come round to the start.
  const bars = new WeakMap();
  const partyOn = (pattern) => pattern.party !== false;
  function barOf(pattern, step) {
    const perLoop = Math.max(1, Math.round(pattern.steps / 16));
    if (step === 0) bars.set(pattern, (bars.get(pattern) ?? -1) + 1);
    return (bars.get(pattern) ?? 0) * perLoop + Math.floor(step / 16);
  }
  // Where a bar is in the phrase, by name.
  function sectionOf(bar) {
    const at = bar % PHRASE;
    if (BREAK_AT.includes(at)) return 'breakdown';
    if (BUILD_AT.includes(at)) return 'build-up';
    if (at === 0 && bar > 0) return 'drop';
    return Math.floor(bar / PHRASE) % 2 ? 'lift' : 'groove';
  }

  // What party mode does to one step of `bar`: the lanes it silences, and the extra hits it adds (each with the lane a
  // display should show it on). playStep plays this, and Beat Maker's grid draws it, so the two never disagree.
  const PLAIN = { section: 'loop', lift: 0, silent: [], extras: [] };
  function arrangement(pattern, bar, step) {
    if (!partyOn(pattern)) return PLAIN;
    const at = bar % PHRASE, inBar = step % 16, section = sectionOf(bar);
    const lift = section === 'lift' || section === 'drop' ? 1 : 0;
    // Breakdown: no kick, no bass, hats thinned. Last half bar of the build-up: everything holds its breath.
    const holding = BUILD_AT[1] === at && inBar >= 8;
    const silent = LANES.filter((key) => (section === 'breakdown' && (key === 'kick' || key === 'bass' || (key === 'hats' && inBar % 4)))
      || (holding && key !== 'snare' && key !== 'fx'));
    const extras = [];
    // A crash at the top of each phrase (and the drop's boom after a build-up).
    if (inBar === 0 && at === 0) extras.push(bar > 0 ? { voice: 'impact', lane: 'fx', level: 0.8 } : { voice: 'crash', lane: 'fx', level: 0.7 });
    // Lifted phrases: open hats on the off-beats, and a "Hey!" now and then.
    if (lift && inBar % 4 === 2 && !pattern.lanes.hats.steps[step]) extras.push({ voice: 'openhat', lane: 'hats', level: 0.8 });
    if (lift && at % 8 === 6 && inBar === 12) extras.push({ voice: 'hey', lane: 'clap', level: 0.9 });
    // A fill closing every fourth bar (not before a breakdown or in a build-up): toms down over the last beat.
    if ((at + 1) % FILL_EVERY === 0 && !BUILD_AT.includes(at) && at !== BREAK_AT[0] - 1 && inBar >= 12) {
      extras.push({ voice: 'tom', lane: 'perc', level: 0.9, arg: [200, 170, 140, 115][inBar - 12] });
    }
    // The build-up: a snare roll from quarters to sixteenths, and a sweep rising over both bars.
    if (BUILD_AT.includes(at)) {
      const pos = (at - BUILD_AT[0]) * 16 + inBar, gap = pos < 8 ? 4 : pos < 16 ? 2 : 1;
      if (pos % gap === 0) extras.push({ voice: 'snare', lane: 'snare', level: 0.35 + 0.5 * pos / 32 });
      if (pos === 0) extras.push({ voice: 'riser', lane: 'fx', level: 1, steps: 32 });
    }
    return { section, lift, silent, extras };
  }

  // Plays every lane that has `step` on, at `time` (already swung: see swingDelay), and in party mode what the phrase
  // adds or leaves out around it (arrangement).
  function playStep(ctx, out, pattern, step, time) {
    const party = partyOn(pattern), plan = party ? arrangement(pattern, barOf(pattern, step), step) : PLAIN;
    const silent = (key) => plan.silent.includes(key);
    const kickHere = pattern.lanes.kick.steps[step] && audible(pattern, 'kick') && !silent('kick');
    LANES.forEach((key) => {
      if (!pattern.lanes[key].steps[step] || !audible(pattern, key) || silent(key)) return;
      const level = laneLevel(pattern, key);
      if (level <= 0) return;
      const feel = feelOf(pattern, key, step), pumped = key === 'bass' && kickHere, sound = soundOf(pattern, key);
      if (sound) sound.play(ctx, out, time, level * feel.gain, { step, steps: pattern.steps, pattern, lift: plan.lift, pumped, feel });
      else voices[key](ctx, out, time, level * feel.gain, step, pattern.steps, pattern, plan.lift, pumped, feel);
    });
    const drums = pattern.volume / 100, spb = secondsPerStep(pattern);
    plan.extras.forEach((hit) => voices[hit.voice](ctx, out, time, drums * hit.level, hit.steps ? hit.steps * spb : hit.arg));
  }

  // Which bar of the phrase `step` of a pattern's loop belongs to, as it plays now.
  function barAt(pattern, step = 0) {
    const perLoop = Math.max(1, Math.round(pattern.steps / 16));
    return (bars.get(pattern) ?? 0) * perLoop + Math.floor(step / 16);
  }

  // Where a pattern is in party mode's phrase, for a display: { bar, section }, at `step` of its loop.
  function section(pattern, step = 0) {
    if (!partyOn(pattern)) return { bar: 0, section: 'loop' };
    const bar = barAt(pattern, step);
    return { bar, section: sectionOf(bar) };
  }

  // A sixteenth note.
  function secondsPerStep(pattern) { return 60 / pattern.bpm / 4; }

  // Swing pushes each off-beat step late without moving the beat: the grid keeps time, so the tempo holds.
  function swingDelay(pattern, step) {
    return step % 2 === 1 ? secondsPerStep(pattern) * (pattern.swing / 100) * SWING_REACH : 0;
  }

  // A full pattern from a short one: `lanes` lists the steps that are on, `mix` any lane volumes other than 0.8;
  // `bass` and `chords` its key, `party` false for a plain loop.
  function expand(short, length) {
    const size = length || MAX_STEPS;
    const lanes = {};
    LANES.forEach((key) => {
      const on = (short.lanes && short.lanes[key]) || [];
      lanes[key] = {
        steps: Array.from({ length: size }, (_, i) => on.includes(i)),
        volume: short.mix && short.mix[key] != null ? short.mix[key] : 0.8,
        mute: false,
        solo: false,
      };
    });
    const out = { bpm: short.bpm, swing: short.swing, volume: short.volume, steps: short.steps, lanes };
    if (short.bass) out.bass = short.bass.slice();
    if (short.chords) out.chords = short.chords.map((c) => c.slice());
    if (short.party === false) out.party = false;
    if (short.sounds) out.sounds = { ...short.sounds };
    if (short.variation != null) out.variation = short.variation;
    return out;
  }

  const every = (from, gap, until) => Array.from({ length: Math.ceil((until - from) / gap) }, (_, i) => from + i * gap);
  // Keys for the presets: eight bass notes and four chords each.
  const KEYS = {
    aMinor: { bass: ['A1', 'A1', 'A2', 'A1', 'F1', 'F1', 'G1', 'G1'], chords: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4']] },
    disco: { bass: ['E1', 'E2', 'E1', 'E2', 'A1', 'A2', 'B1', 'B2'], chords: [['E3', 'G#3', 'B3'], ['A3', 'C#4', 'E4'], ['B3', 'D#4', 'F#4'], ['A3', 'C#4', 'E4']] },
    fMinor: { bass: ['F1', 'F1', 'C#2', 'C#2', 'G#1', 'G#1', 'D#2', 'D#1'], chords: [['F3', 'G#3', 'C4'], ['C#3', 'F3', 'G#3'], ['G#3', 'C4', 'D#4'], ['D#3', 'G3', 'A#3']] },
    dMinor: { bass: ['D2', 'D2', 'A#1', 'A#1', 'F1', 'F1', 'C2', 'C2'], chords: [['D4', 'F4', 'A4'], ['A#3', 'D4', 'F4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4']] },
    swing: { bass: ['G1', 'B1', 'D2', 'E2', 'C2', 'E2', 'D2', 'B1'], chords: [['G3', 'B3', 'D4'], ['E3', 'G3', 'B3'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4']] },
  };

  const PRESETS = {
    'Neon Bounce': { bpm: 112, swing: 12, volume: 80, steps: 16, lanes: {
      kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14], clap: [12], bass: [0, 3, 5, 7, 8, 11, 13, 15],
      chord: [0, 4, 8, 12], perc: [7, 15], fx: [0, 8] } },
    'Lo-Fi Night': { bpm: 84, swing: 24, volume: 68, steps: 16, party: false, lanes: {
      kick: [0, 7, 10], snare: [4, 12], hats: [2, 3, 6, 8, 10, 11, 14], clap: [12], bass: [0, 2, 6, 8, 10, 14],
      chord: [0, 8], perc: [11, 15], fx: [8] } },
    'House Starter': { bpm: 124, swing: 6, volume: 86, steps: 16, lanes: {
      kick: [0, 4, 8, 12], snare: [4, 12], hats: every(0, 2, 16), clap: [4, 12], bass: [0, 2, 3, 6, 8, 10, 11, 14],
      chord: [0, 4, 8, 12], perc: [6, 14], fx: [15] } },
    'Trap Minimal': { bpm: 142, swing: 18, volume: 82, steps: 16, lanes: {
      kick: [0, 7, 10, 12], snare: [4, 12], hats: [1, 2, 3, 6, 7, 9, 10, 11, 13, 15], clap: [4, 12],
      bass: [0, 5, 7, 8, 10, 12, 15], chord: [0, 8], perc: [14], fx: [3, 11] } },
    'Synth Drive': { bpm: 128, swing: 10, volume: 84, steps: 32, lanes: {
      kick: every(0, 4, 32), snare: [4, 12, 20, 28], hats: every(0, 2, 32), clap: [12, 28],
      bass: [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30], chord: [0, 8, 16, 24], perc: [7, 15, 23, 31], fx: [0, 16, 31] } },
    // What Bottlefield's Party Yacht DJ plays: two bars of deck house, four to the floor, off-beat hats, claps on two
    // and four, a walking bass and a chord every half bar.
    'Party Yacht': { bpm: 124, swing: 6, volume: 86, steps: 32, mix: { hats: 0.6, perc: 0.6, fx: 0.5 }, lanes: {
      kick: every(0, 4, 32), clap: [4, 12, 20, 28], hats: every(2, 4, 32).concat([15, 31]),
      bass: [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30], chord: [0, 8, 16, 24], perc: [7, 23, 29], fx: [31] } },
    // Four to the floor, octave-jumping bass, open hats on every off-beat, string stabs.
    'Disco Fever': { bpm: 120, swing: 8, volume: 86, steps: 32, ...KEYS.disco, mix: { hats: 0.7, chord: 0.7 }, lanes: {
      kick: every(0, 4, 32), clap: [4, 12, 20, 28], hats: every(2, 4, 32), bass: every(0, 2, 32),
      chord: [0, 6, 12, 16, 22, 28], perc: [14, 30], fx: [31] } },
    // Festival: a pounding kick, claps, a big stab every beat in the second bar.
    'Big Room': { bpm: 128, swing: 0, volume: 90, steps: 32, ...KEYS.fMinor, mix: { chord: 0.9, hats: 0.5 }, lanes: {
      kick: every(0, 4, 32), clap: [4, 12, 20, 28], snare: [28, 30], hats: every(2, 4, 32),
      bass: [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30], chord: [0, 3, 6, 16, 20, 24, 28], fx: [15, 31] } },
    // Breakbeat at 174: kick and snare skipping round each other, rolling hats, a long sub line.
    'Drum & Bass': { bpm: 174, swing: 4, volume: 86, steps: 32, ...KEYS.dMinor, mix: { hats: 0.6, bass: 0.9 }, lanes: {
      kick: [0, 10, 16, 26], snare: [4, 12, 20, 28], hats: every(0, 2, 32).concat([7, 23]),
      bass: [0, 1, 6, 10, 16, 17, 22, 26], chord: [0, 16], perc: [14, 30], fx: [31] } },
    // The dembow: boom, ch-boom chick.
    'Reggaeton': { bpm: 95, swing: 6, volume: 84, steps: 16, ...KEYS.aMinor, lanes: {
      kick: [0, 4, 8, 12], snare: [3, 6, 11, 14], hats: every(0, 2, 16), clap: [6, 14],
      bass: [0, 3, 6, 8, 11, 14], chord: [0, 8], perc: [10], fx: [15] } },
    // Shuffled two-step: skippy kicks, a snare on two and four, swung hats.
    'UK Garage': { bpm: 132, swing: 34, volume: 84, steps: 16, ...KEYS.fMinor, lanes: {
      kick: [0, 7, 10], snare: [4, 12], hats: [2, 3, 6, 7, 10, 11, 14, 15], clap: [4, 12],
      bass: [0, 3, 7, 10, 12], chord: [0, 6, 10], perc: [9, 13], fx: [15] } },
    // Warehouse: a driving kick, rumbling bass on every off-beat sixteenth, sparse claps.
    'Techno Rave': { bpm: 135, swing: 0, volume: 88, steps: 32, ...KEYS.aMinor, mix: { chord: 0.5, perc: 0.7 }, lanes: {
      kick: every(0, 4, 32), clap: [12, 28], hats: every(2, 4, 32).concat(every(1, 8, 32)),
      bass: every(1, 4, 32).concat(every(3, 4, 32)), chord: [0, 22], perc: [6, 14, 18, 30], fx: [16] } },
    // Congas and shakers over a deep four-to-the-floor.
    'Afro House': { bpm: 122, swing: 14, volume: 84, steps: 32, ...KEYS.dMinor, mix: { perc: 0.9, hats: 0.6 }, lanes: {
      kick: every(0, 4, 32), clap: [12, 28], hats: every(1, 2, 32), bass: [0, 6, 10, 16, 22, 26],
      chord: [0, 16], perc: [3, 6, 7, 11, 14, 19, 22, 23, 27, 30], fx: [31] } },
    // Slowed-down dutch house with a dembow under it.
    'Moombahton': { bpm: 108, swing: 8, volume: 86, steps: 16, ...KEYS.fMinor, lanes: {
      kick: [0, 4, 8, 12], snare: [3, 6, 11, 14], hats: every(2, 4, 16), clap: [6, 14],
      bass: [0, 3, 6, 8, 11, 14], chord: [0, 3, 8, 11], perc: [7, 15], fx: [15] } },
    // Big swing: walking bass, off-beat chord stabs, brushed hats.
    'Electro Swing': { bpm: 124, swing: 42, volume: 84, steps: 16, ...KEYS.swing, mix: { chord: 0.75 }, lanes: {
      kick: [0, 4, 8, 12], snare: [4, 12], hats: every(0, 2, 16).concat([3, 11]), clap: [4, 12],
      bass: [0, 4, 8, 12], chord: [2, 6, 10, 14], perc: [7], fx: [15] } },
    // Hard and fast: a kick on every beat, off-beat bass, a screaming stab.
    'Hardstyle': { bpm: 150, swing: 0, volume: 90, steps: 16, ...KEYS.fMinor, mix: { chord: 0.85, hats: 0.5 }, lanes: {
      kick: [0, 4, 8, 12], clap: [4, 12], hats: every(2, 4, 16), bass: [2, 6, 10, 14],
      chord: [0, 2, 6, 8, 14], fx: [15] } },
  };

  root.BeatEngine = {
    LANES, MAX_STEPS, BASS_SCALE, CHORD_BANK, PRESETS,
    noteFreq, voices, audible, laneLevel, playStep, secondsPerStep, swingDelay, expand, section, arrangement, barAt,
    // Sound variants (beat-sounds.js) and the building blocks they are made of.
    addSounds, soundsFor, feelOf, NO_FEEL,
    synth: { osc, envelope, noiseBurst, noise, drive, bassAt, chordAt, QUIET },
    // Every preset as a full pattern, steps `length` long.
    presets: (length) => Object.fromEntries(Object.entries(PRESETS).map(([name, p]) => [name, expand(p, length)])),
  };
})(typeof window !== 'undefined' ? window : globalThis);
