// =========================================================
// BEAT SOUNDS - more sounds per lane, and kits that set all eight
// =========================================================
// Load after beat-engine.js. It registers extra voices with BeatEngine.addSounds; the engine's own voices stay the
// "Classic" sound of every lane, so a page that never loads this file (Bottlefield today) plays exactly as before.
//
// Every sound is play(ctx, out, time, level, hit): `hit` carries the step, the loop length, the pattern, party mode's
// `lift`, whether the bass is `pumped` under a kick, and the per-hit `feel` (pitch and tone multipliers near 1).

(function (root) {
  'use strict';

  const E = root.BeatEngine;
  if (!E || !E.addSounds) return;
  const { osc, envelope, noiseBurst, noise, drive, bassAt, chordAt, QUIET } = E.synth;
  const freqOf = E.noteFreq;

  function filter(ctx, type, freq, q = 0.7) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  // A sine dropping in pitch: the body of kicks, toms and some percussion.
  function drop(ctx, out, time, from, to, fall, length, peak, through) {
    const body = osc(ctx, 'sine', from, time, length);
    body.frequency.exponentialRampToValueAtTime(to, time + fall);
    const env = envelope(ctx, out, time, peak, 0.002, length);
    if (through) { body.connect(through); through.connect(env); } else body.connect(env);
  }

  // Metallic partials (square waves at inharmonic ratios), for hats and cowbells.
  function metal(ctx, out, time, level, length, base, ratios, hp, bp) {
    const high = filter(ctx, 'highpass', hp), band = filter(ctx, 'bandpass', bp, 0.8);
    high.connect(band);
    band.connect(envelope(ctx, out, time, level, 0.001, length));
    ratios.forEach((k) => osc(ctx, 'square', base * k, time, length).connect(high));
  }

  // A noise sweep through a moving band filter.
  function sweep(ctx, out, time, level, from, to, length) {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 'long');
    const band = filter(ctx, 'bandpass', from, 2.5);
    band.frequency.exponentialRampToValueAtTime(to, time + length);
    src.connect(band);
    band.connect(envelope(ctx, out, time, level, 0.02, length));
    src.start(time, Math.random() * 0.5);
    src.stop(time + length + 0.05);
  }

  const SOUNDS = {
    kick: {
      // A long, booming sub that holds its note.
      '808': { label: '808 boom', play(ctx, out, time, level, { feel }) {
        drop(ctx, out, time, 120 * feel.pitch, 42 * feel.pitch, 0.16, 0.9, 1.1 * level, drive(ctx));
        noiseBurst(ctx, out, time, 0.12 * level, 'white', 'highpass', 2500 * feel.tone, 0.7, 0.008, 0.001);
      } },
      // Short and hard, for techno and hardstyle.
      punch: { label: 'Punch', play(ctx, out, time, level, { feel }) {
        drop(ctx, out, time, 210 * feel.pitch, 55 * feel.pitch, 0.07, 0.24, 1.15 * level, drive(ctx));
        noiseBurst(ctx, out, time, 0.5 * level, 'white', 'highpass', 2500 * feel.tone, 0.7, 0.015, 0.001);
      } },
      // Rounded and muffled, like a sampled kick on an old record.
      soft: { label: 'Lo-fi soft', play(ctx, out, time, level, { feel }) {
        drop(ctx, out, time, 110 * feel.pitch, 50 * feel.pitch, 0.1, 0.32, 0.95 * level, filter(ctx, 'lowpass', 380 * feel.tone));
      } },
    },
    snare: {
      // High and short, a tight crack.
      tight: { label: 'Tight', play(ctx, out, time, level, { feel }) {
        drop(ctx, out, time, 300 * feel.pitch, 230 * feel.pitch, 0.04, 0.08, 0.35 * level);
        noiseBurst(ctx, out, time, 0.55 * level, 'white', 'bandpass', 5200 * feel.tone, 0.9, 0.11);
      } },
      // Low and wide, with a long wash of noise.
      fat: { label: 'Fat', play(ctx, out, time, level, { feel }) {
        drop(ctx, out, time, 190 * feel.pitch, 140 * feel.pitch, 0.1, 0.2, 0.5 * level);
        noiseBurst(ctx, out, time, 0.55 * level, 'white', 'bandpass', 2200 * feel.tone, 0.5, 0.3);
        noiseBurst(ctx, out, time, 0.2 * level, 'white', 'highpass', 6000 * feel.tone, 0.7, 0.05);
      } },
      // A rimshot: a short wooden click.
      rim: { label: 'Rimshot', play(ctx, out, time, level, { feel }) {
        const click = osc(ctx, 'square', 1700 * feel.pitch, time, 0.03), band = filter(ctx, 'bandpass', 2000 * feel.tone, 4);
        click.connect(band);
        band.connect(envelope(ctx, out, time, 0.55 * level, 0.001, 0.03));
        noiseBurst(ctx, out, time, 0.3 * level, 'white', 'bandpass', 3500 * feel.tone, 1.5, 0.02);
      } },
    },
    hats: {
      // Higher and shorter than the classic hat.
      bright: { label: 'Bright', play(ctx, out, time, level, { feel }) {
        metal(ctx, out, time, 0.18 * level, 0.035 * feel.tone, 470 * feel.pitch, [2, 3, 4.16, 5.43, 6.79, 8.21], 9000 * feel.tone, 12000 * feel.tone);
      } },
      // Plain noise, darker: a dusty sampled hat.
      dusty: { label: 'Dusty', play(ctx, out, time, level, { feel }) {
        noiseBurst(ctx, out, time, 0.24 * level, 'white', 'highpass', 6000 * feel.tone, 0.7, 0.05 * feel.tone);
      } },
      // A shaker: a soft attack and a short swish.
      shaker: { label: 'Shaker', play(ctx, out, time, level, { feel }) {
        noiseBurst(ctx, out, time, 0.3 * level, 'white', 'bandpass', 6500 * feel.tone, 1.2, 0.09, 0.012);
      } },
    },
    clap: {
      // Two slaps and no echo.
      tight: { label: 'Tight', play(ctx, out, time, level, { feel }) {
        [0, 0.008].forEach((d, i) => noiseBurst(ctx, out, time + d, (i ? 0.55 : 0.4) * level, 'white', 'bandpass', 1800 * feel.tone, 1.2, i ? 0.12 : 0.015));
      } },
      // A crowd of hands: four slaps, a long tail, an echo.
      big: { label: 'Big room', play(ctx, out, time, level, { feel }) {
        [0, 0.01, 0.021, 0.033].forEach((d, i) => noiseBurst(ctx, out, time + d, (i === 3 ? 0.6 : 0.38) * level, 'white', 'bandpass', 1200 * feel.tone, 1, i === 3 ? 0.35 : 0.02));
        noiseBurst(ctx, out, time + 0.2, 0.16 * level, 'white', 'bandpass', 1300 * feel.tone, 1.1, 0.3);
      } },
      // A finger snap.
      snap: { label: 'Snap', play(ctx, out, time, level, { feel }) {
        noiseBurst(ctx, out, time, 0.6 * level, 'white', 'bandpass', 2600 * feel.tone, 3, 0.045);
        const tick = osc(ctx, 'sine', 1800 * feel.pitch, time, 0.02);
        tick.connect(envelope(ctx, out, time, 0.12 * level, 0.001, 0.02));
      } },
    },
    bass: {
      // A clean sub, longer and rounder, with a soft triangle on top for small speakers.
      sub: { label: 'Sub', play(ctx, out, time, level, { step, pattern, lift, pumped }) {
        let freq = freqOf(bassAt(pattern, step));
        if (lift && step % 4 === 2) freq *= 2;
        const start = time + (pumped ? 0.025 : 0);
        osc(ctx, 'sine', freq, start, 0.32).connect(envelope(ctx, out, start, 0.42 * level, 0.008, 0.32));
        osc(ctx, 'triangle', freq * 2, start, 0.2).connect(envelope(ctx, out, start, 0.05 * level, 0.008, 0.2));
      } },
      // A squelchy, resonant saw with a fast filter sweep.
      acid: { label: 'Acid', play(ctx, out, time, level, { step, pattern, lift, pumped, feel }) {
        let freq = freqOf(bassAt(pattern, step));
        if (lift && step % 4 === 2) freq *= 2;
        const start = time + (pumped ? 0.025 : 0), len = 0.18, lp = filter(ctx, 'lowpass', 2600 * feel.tone, 14);
        lp.frequency.setValueAtTime(2600 * feel.tone, start);
        lp.frequency.exponentialRampToValueAtTime(220, start + len * 0.6);
        const sat = drive(ctx);
        osc(ctx, 'sawtooth', freq, start, len).connect(lp);
        lp.connect(sat);
        sat.connect(envelope(ctx, out, start, 0.3 * level, 0.003, len));
      } },
      // Two detuned saws beating against each other over a sub.
      reese: { label: 'Reese', play(ctx, out, time, level, { step, pattern, lift, pumped, feel }) {
        let freq = freqOf(bassAt(pattern, step));
        if (lift && step % 4 === 2) freq *= 2;
        const start = time + (pumped ? 0.025 : 0), len = 0.3, lp = filter(ctx, 'lowpass', 850 * feel.tone, 1.5);
        lp.connect(envelope(ctx, out, start, 0.13 * level, 0.01, len));
        [-14, 14].forEach((cents) => { const saw = osc(ctx, 'sawtooth', freq, start, len); saw.detune.value = cents; saw.connect(lp); });
        osc(ctx, 'sine', freq, start, len).connect(envelope(ctx, out, start, 0.25 * level, 0.01, len));
      } },
    },
    chord: {
      // A slow, soft pad.
      pad: { label: 'Pad', play(ctx, out, time, level, { step, steps, pattern, feel }) {
        const lp = filter(ctx, 'lowpass', 1800 * feel.tone, 0.8);
        lp.connect(envelope(ctx, out, time, 0.06 * level, 0.08, 0.9));
        chordAt(pattern, step, steps).forEach((note) => [-7, 7].forEach((cents) => {
          const o = osc(ctx, 'triangle', freqOf(note), time, 0.95);
          o.detune.value = cents;
          o.connect(lp);
        }));
      } },
      // A short square pluck with one echo.
      pluck: { label: 'Pluck', play(ctx, out, time, level, { step, steps, pattern, feel }) {
        const spb = 60 / pattern.bpm;
        [[0, 1], [spb * 0.75, 0.3]].forEach(([d, k]) => {
          const t = time + d, lp = filter(ctx, 'lowpass', 3200 * feel.tone, 3);
          lp.frequency.setValueAtTime(3200 * feel.tone, t);
          lp.frequency.exponentialRampToValueAtTime(400, t + 0.12);
          lp.connect(envelope(ctx, out, t, 0.09 * level * k, 0.003, 0.2));
          chordAt(pattern, step, steps).forEach((note) => osc(ctx, 'square', freqOf(note), t, 0.22).connect(lp));
        });
      } },
      // An organ: each note with its octave and twelfth.
      organ: { label: 'Organ', play(ctx, out, time, level, { step, steps, pattern }) {
        const env = envelope(ctx, out, time, 0.07 * level, 0.01, 0.32);
        chordAt(pattern, step, steps).forEach((note) => [[1, 1], [2, 0.5], [3, 0.25]].forEach(([k, g]) => {
          const part = ctx.createGain();
          part.gain.value = g;
          osc(ctx, 'sine', freqOf(note) * k, time, 0.34).connect(part);
          part.connect(env);
        }));
      } },
    },
    perc: {
      // A cowbell: two square tones through a band filter.
      cowbell: { label: 'Cowbell', play(ctx, out, time, level, { feel }) {
        metal(ctx, out, time, 0.22 * level, 0.12, 270 * feel.pitch, [2, 2.96], 400, 800 * feel.tone);
      } },
      // A woodblock, alternating two pitches.
      woodblock: { label: 'Woodblock', play(ctx, out, time, level, { step, feel }) {
        drop(ctx, out, time, (step % 2 ? 1200 : 1000) * feel.pitch, (step % 2 ? 1100 : 900) * feel.pitch, 0.02, 0.06, 0.35 * level);
        noiseBurst(ctx, out, time, 0.08 * level, 'white', 'bandpass', 3000 * feel.tone, 2, 0.01);
      } },
      // A low tom walking down with the step.
      tom: { label: 'Low tom', play(ctx, out, time, level, { step, feel }) {
        const pitch = (140 - (step % 4) * 15) * feel.pitch;
        drop(ctx, out, time, pitch * 1.6, pitch, 0.12, 0.25, 0.45 * level);
      } },
    },
    fx: {
      // A laser zapping down.
      laser: { label: 'Laser', play(ctx, out, time, level, { feel }) {
        const o = osc(ctx, 'square', 1800 * feel.pitch, time, 0.17);
        o.frequency.exponentialRampToValueAtTime(180 * feel.pitch, time + 0.15);
        const band = filter(ctx, 'bandpass', 1200 * feel.tone, 2);
        o.connect(band);
        band.connect(envelope(ctx, out, time, 0.1 * level, 0.005, 0.17));
      } },
      // A bright blip, a fifth higher on odd steps.
      blip: { label: 'Blip', play(ctx, out, time, level, { step, feel }) {
        osc(ctx, 'sine', 1320 * (step % 2 ? 1.5 : 1) * feel.pitch, time, 0.08).connect(envelope(ctx, out, time, 0.15 * level, 0.003, 0.08));
      } },
      // A whoosh of noise rising.
      sweep: { label: 'Noise sweep', play(ctx, out, time, level, { feel }) {
        sweep(ctx, out, time, 0.3 * level, 600 * feel.tone, 7000 * feel.tone, 0.35);
      } },
    },
  };
  E.addSounds(SOUNDS);

  // Kits: one sound per lane. `variation` is the per-hit feel a kit starts with.
  const KITS = {
    Classic: { variation: 25, sounds: {} },
    '808': { variation: 30, sounds: { kick: '808', snare: 'fat', hats: 'bright', clap: 'big', bass: 'sub', chord: 'pad', perc: 'cowbell', fx: 'blip' } },
    Techno: { variation: 20, sounds: { kick: 'punch', snare: 'tight', hats: 'bright', clap: 'tight', bass: 'acid', chord: 'pluck', perc: 'woodblock', fx: 'laser' } },
    'Lo-fi': { variation: 45, sounds: { kick: 'soft', snare: 'rim', hats: 'dusty', clap: 'snap', bass: 'sub', chord: 'pad', perc: 'classic', fx: 'sweep' } },
    Live: { variation: 50, sounds: { kick: 'classic', snare: 'fat', hats: 'shaker', clap: 'tight', bass: 'classic', chord: 'organ', perc: 'tom', fx: 'sweep' } },
    Bass: { variation: 25, sounds: { kick: '808', snare: 'tight', hats: 'dusty', clap: 'tight', bass: 'reese', chord: 'pluck', perc: 'woodblock', fx: 'laser' } },
  };

  // Which kit each preset starts with.
  const PRESET_KITS = {
    'Neon Bounce': 'Classic', 'Lo-Fi Night': 'Lo-fi', 'House Starter': 'Classic', 'Trap Minimal': '808', 'Synth Drive': 'Classic',
    'Party Yacht': 'Classic', 'Disco Fever': 'Live', 'Big Room': '808', 'Drum & Bass': 'Bass', 'Reggaeton': '808',
    'UK Garage': 'Bass', 'Techno Rave': 'Techno', 'Afro House': 'Live', 'Moombahton': '808', 'Electro Swing': 'Live', 'Hardstyle': 'Techno',
  };

  // The kit whose sounds match a pattern's, or null for a mix of kits.
  function kitOf(pattern) {
    const sounds = pattern.sounds || {};
    const picked = (key) => sounds[key] || 'classic';
    return Object.keys(KITS).find((name) => E.LANES.every((key) => picked(key) === (KITS[name].sounds[key] || 'classic'))) || null;
  }

  // Puts a kit's sounds (and its per-hit feel) on a pattern.
  function applyKit(pattern, name) {
    const kit = KITS[name];
    if (!kit) return pattern;
    pattern.sounds = { ...kit.sounds };
    pattern.variation = kit.variation;
    return pattern;
  }

  root.BeatSounds = { SOUNDS, KITS, PRESET_KITS, kitOf, applyKit };
})(typeof window !== 'undefined' ? window : globalThis);
