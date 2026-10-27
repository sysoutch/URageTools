(() => {
  'use strict';

  const SR = 44100;
  const TAU = Math.PI * 2;
  const MAX_SECONDS = 35;
  const ANIM_FPS = 60;
  const FRAME = SR / ANIM_FPS;
  const MOODS = ['idle', 'meow', 'purr', 'hiss', 'growl', 'chirp'];
  const KIND_MOODS = { meow: 1, word: 1, mew: 1, nyan: 1, yowl: 1, trill: 1, purr: 2, hiss: 3, growl: 4, chirp: 5, chatter: 5 };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, t) => {
    const z = clamp((t - a) / (b - a), 0, 1);
    return z * z * (3 - 2 * z);
  };

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function random(seed) {
    let x = seed || 1234567;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  // A cat's vocal tract is roughly 6-8 cm long, so its formants sit about twice as high
  // as an adult human's. `tract` scales the human-referenced vowel table below.
  const VOICES = {
    // A baby kitten: tiny tract, very high and unsteady pitch, breathy, short calls.
    kitten: { f0: 980, tract: 3.1, breath: .14, rough: .02, jitter: .022, shimmer: .12, purr: 28, growl: 185, nasal: .22, length: .78 },
    house: { f0: 560, tract: 2.35, breath: .06, rough: .04, jitter: .01, shimmer: .07, purr: 25, growl: 115, nasal: .25 },
    siamese: { f0: 610, tract: 2.25, breath: .05, rough: .13, jitter: .009, shimmer: .06, purr: 25, growl: 120, nasal: .45 },
    tom: { f0: 370, tract: 2, breath: .08, rough: .14, jitter: .015, shimmer: .1, purr: 22, growl: 85, nasal: .2 }
  };

  // Human-scale formants (F1-F4), lip opening, loudness, and nasal/rolled/breathy flags.
  const SHAPES = {
    m: { f: [260, 1150, 2300, 3300], lip: 0, amp: .34, nasal: 1 },
    n: { f: [270, 1550, 2500, 3400], lip: .15, amp: .38, nasal: 1 },
    i: { f: [310, 2150, 2950, 3700], lip: .55, amp: .8 },
    e: { f: [470, 1900, 2650, 3600], lip: .72, amp: .9 },
    a: { f: [780, 1300, 2550, 3500], lip: 1, amp: 1 },
    o: { f: [640, 1050, 2500, 3400], lip: .85, amp: .95 },
    u: { f: [350, 800, 2350, 3300], lip: .32, amp: .6 },
    r: { f: [430, 1250, 1750, 3200], lip: .45, amp: .62, roll: 1 },
    l: { f: [380, 1050, 2900, 3500], lip: .5, amp: .6 },
    h: { f: [700, 1300, 2550, 3500], lip: .9, amp: .35, breath: 1 },
    stop: { f: [300, 1200, 2400, 3400], lip: 0, amp: .03 }
  };
  const SHAPE_WEIGHTS = { m: .5, n: .45, i: .6, e: .6, a: 1, o: .95, u: .75, r: .4, l: .45, h: .35, stop: .12 };
  const LETTER_SHAPES = {
    m: 'm', n: 'n', i: 'i', y: 'i', e: 'e', a: 'a', o: 'o', u: 'u', w: 'u', r: 'r', l: 'l', h: 'h',
    p: 'stop', b: 'stop', t: 'stop', d: 'stop', k: 'stop', g: 'stop', c: 'stop', q: 'stop'
  };

  const KINDS = {
    meow: { unit: .2, pitch: 1, level: .9 },
    word: { unit: .17, pitch: 1, level: .85 },
    mew: { unit: .15, pitch: 1.32, level: .75 },
    nyan: { unit: .17, pitch: 1.08, level: .85 },
    yowl: { unit: .36, pitch: .8, level: 1 },
    trill: { unit: .2, pitch: .95, level: .6 },
    chirp: { pitch: 1.45, level: .62 },
    chatter: { pitch: 1.5, level: .55 },
    growl: { level: .8 },
    purr: { level: .5 },
    hiss: { level: .62 }
  };

  function classify(w) {
    if (/^(p+u*r{2,}|r{3,})$/.test(w)) return 'purr';
    if (/^(g+r+|growl+)/.test(w)) return 'growl';
    if (/^(h+i*s{2,}|p*s{3,}|pf{2,}t?|ps+t)$/.test(w)) return 'hiss';
    if (/^(chatter|(?:e?k)(?:e?k)+e?|(?:ack){2,})$/.test(w)) return 'chatter';
    if (/^(chirp+|chi?r+p|tweet|cheep|eep|chirr+up?)$/.test(w)) return 'chirp';
    if (/^(trill+|m+r+[pt]?|b+r+[pt]?|pr{2,}t|r+p)$/.test(w)) return 'trill';
    if (/^(yowl+|y+[ae]+o+w+l*|ra+o+w+|wa+o+w*l*|ma+o+w+l+)$/.test(w)) return 'yowl';
    if (/^n+y+a+/.test(w)) return 'nyan';
    if (/^m+(e+w+|i+e*u+w*|e+u+)$/.test(w)) return 'mew';
    if (/^m/.test(w) && /[aeiouy]/.test(w)) return 'meow';
    if (/[aeiouy]/.test(w) && w.length <= 14) return 'word';
    return null;
  }

  // Spelling drives articulation: each run of letters becomes a mouth shape, and repeated
  // letters stretch that shape, so "meeeow" lingers on the ee and "miaaau" on the aa.
  function lettersToSegments(word) {
    const segments = [];
    for (const letter of word) {
      const shape = LETTER_SHAPES[letter] || 'h';
      const last = segments[segments.length - 1];
      if (last && last.shape === shape) last.count++;
      else segments.push({ shape, count: 1 });
    }
    return segments.map(s => ({ shape: s.shape, w: SHAPE_WEIGHTS[s.shape] * (1 + .85 * (s.count - 1)) }));
  }

  function parse(script) {
    const tokens = script.match(/[A-Za-z]+|[^A-Za-z]+/g) || [];
    const items = [];
    const lastVocal = () => {
      for (let i = items.length - 1; i >= 0; i--) if (items[i].kind !== 'pause') return items[i];
      return null;
    };
    for (const token of tokens) {
      if (!/^[A-Za-z]+$/.test(token)) {
        const last = lastVocal();
        if (last && token.includes('?')) last.question = true;
        if (last && token.includes('!')) last.excited = true;
        const strong = /[,;.!?\n]/.test(token);
        items.push({ kind: 'pause', soft: !strong, duration: /[.!?\n]/.test(token) ? .34 : strong ? .2 : .035 });
        continue;
      }
      const word = token.toLowerCase();
      const kind = classify(word);
      if (!kind) {
        items.push({ kind: 'pause', soft: true, duration: .035 });
        continue;
      }
      items.push({ kind, word, text: token, demand: token.length > 1 && token === token.toUpperCase(), seed: hash(word) });
    }
    return items;
  }

  function baseDuration(ev) {
    const count = (re) => (ev.word.match(re) || []).length;
    switch (ev.kind) {
      case 'purr': return clamp(2.2 + .35 * Math.max(0, count(/r/g) - 2), 1.2, 6);
      case 'hiss': return clamp(.7 + .12 * Math.max(0, count(/s/g) - 2), .4, 3);
      case 'growl': return clamp(1 + .22 * Math.max(0, count(/r/g) - 2), .6, 4);
      case 'chatter': return clamp(.55 + .12 * Math.max(0, count(/k/g) - 3), .3, 3);
      case 'chirp': return clamp(.15 + .02 * Math.max(0, ev.word.length - 5), .12, .4);
      default: {
        const units = lettersToSegments(ev.word).reduce((sum, s) => sum + s.w, 0);
        return clamp(units * KINDS[ev.kind].unit, .14, 3.5);
      }
    }
  }

  function makeResonator() {
    return { a: 1, b: 0, c: 0, y1: 0, y2: 0 };
  }

  // Klatt-style two-pole resonator, normalized to unity gain at DC so it stays stable and
  // bounded while its frequency glides.
  function tuneResonator(r, f, bw) {
    const e = Math.exp(-Math.PI * bw / SR);
    r.c = -e * e;
    r.b = 2 * e * Math.cos(TAU * Math.min(f, SR * .45) / SR);
    r.a = 1 - r.b - r.c;
  }

  function runResonator(r, x) {
    const y = r.a * x + r.b * r.y1 + r.c * r.y2;
    r.y2 = r.y1;
    r.y1 = y;
    return y;
  }

  // Rosenberg glottal flow: smooth opening, faster closing, closed for the rest of the cycle.
  function glottalFlow(phase, openQuotient) {
    const opening = openQuotient * .62;
    if (phase < opening) return .5 * (1 - Math.cos(Math.PI * phase / opening));
    if (phase < openQuotient) return Math.cos(.5 * Math.PI * (phase - opening) / (openQuotient - opening));
    return 0;
  }

  function buildTrack(segments) {
    const total = segments.reduce((sum, s) => sum + s.w, 0);
    let acc = 0;
    return segments.map(s => {
      const start = acc / total;
      acc += s.w;
      const len = s.w / total;
      return { shape: SHAPES[s.shape], holdA: start + len * .3, holdB: start + len * .7 };
    });
  }

  function shapeAt(track, u, out) {
    let a = track[0].shape, b = a, t = 0;
    if (u > track[0].holdA) {
      for (let j = 0; j < track.length; j++) {
        const seg = track[j], next = track[j + 1];
        if (u <= seg.holdB || !next) {
          a = b = seg.shape;
          break;
        }
        if (u < next.holdA) {
          a = seg.shape;
          b = next.shape;
          t = smooth(seg.holdB, next.holdA, u);
          break;
        }
      }
    }
    for (let k = 0; k < 4; k++) out.f[k] = a.f[k] + (b.f[k] - a.f[k]) * t;
    for (const key of ['lip', 'amp', 'nasal', 'roll', 'breath']) out[key] = (a[key] || 0) + ((b[key] || 0) - (a[key] || 0)) * t;
    return out;
  }

  // Zero-phase RMS envelope, used to give each cry a deliberate loudness contour regardless
  // of how much the moving formants boost or cut the raw spectrum.
  function rmsEnvelope(x, seconds) {
    const k = 1 - Math.exp(-1 / (seconds * SR));
    const env = new Float32Array(x.length);
    let s = 0;
    for (let i = 0; i < x.length; i++) env[i] = s += k * (x[i] * x[i] - s);
    s = env[x.length - 1] || 0;
    for (let i = x.length - 1; i >= 0; i--) env[i] = s += k * (env[i] - s);
    for (let i = 0; i < x.length; i++) env[i] = Math.sqrt(env[i]);
    return env;
  }

  function pitchContour(ev, u) {
    const v = ev.vary, vv = ev.amount;
    let c;
    if (ev.kind === 'chirp') c = .92 + .42 * smooth(0, .55, u) - .2 * smooth(.55, 1, u);
    else if (ev.kind === 'trill') c = .82 + .36 * smooth(.05, .85, u);
    else if (ev.kind === 'yowl') c = 1 + .1 * Math.sin(TAU * (u * 1.7 + v.onset * .2)) + .06 * smooth(0, .25, u) - .22 * smooth(.72, 1, u);
    else if (ev.kind === 'growl') c = 1 + .08 * Math.sin(TAU * u * 2.3) - .1 * smooth(.6, 1, u);
    else {
      // The classic meow arch: rises through the opening vowel, then sags as the mouth closes.
      const peak = clamp(.4 + v.onset * .12 * vv, .22, .6);
      const rise = .3 + v.pitch * .06 * vv;
      const fall = .42 + v.ending * .1 * vv;
      c = .82 + rise * smooth(0, peak, u) - fall * smooth(peak, 1, u);
    }
    if (ev.question) c += .42 * smooth(.62, 1, u);
    if (ev.excited) c *= 1 + .08 * smooth(.1, .5, u);
    return c;
  }

  function renderVoiced(ev, voice, options) {
    const dur = options.duration;
    const n = Math.max(1, Math.ceil(dur * SR));
    const raw = new Float32Array(n);
    const target = new Float32Array(n);
    // Per-frame mouth opening for the animated cat, taken from the same articulation as the sound.
    const lips = new Float32Array(Math.ceil(n / FRAME) + 1);
    const rng = random(ev.seed ^ hash(options.salt || ''));
    const track = buildTrack(options.segments);
    const shape = { f: [0, 0, 0, 0] };
    const tract = voice.tract * (1 + ev.vary.timbre * .06 * ev.amount);
    const formants = [makeResonator(), makeResonator(), makeResonator(), makeResonator()];
    const nasalRes = makeResonator();
    tuneResonator(nasalRes, 290 * tract, 120 * tract);
    const bandwidths = [70, 90, 140, 220];
    const isMeowLike = ['meow', 'mew', 'nyan', 'word'].includes(ev.kind);
    const demand = ev.demand || ev.excited;
    let f0Base = options.f0 * (1 + ev.vary.pitch * .13 * ev.amount) * (demand ? 1.1 : 1);
    let phase = rng(), flowPrev = 0, jitter = 1, shimmer = 1, alt = false;
    let drift = 0, driftTarget = 0, lip = 0, breathLP = 0, roughness = 0;
    let lipK = 0, breath = 0, nasal = 0, body = 0;
    // A cat has almost no chest resonance; stripping the low body keeps it from sounding like a crying infant.
    const bodyK = 1 - Math.exp(-TAU * 380 / SR);

    for (let i = 0; i < n; i++) {
      const t = i / SR, u = i / n;
      if ((i & 31) === 0) {
        shapeAt(track, u, shape);
        for (let k = 0; k < 4; k++) tuneResonator(formants[k], shape.f[k] * tract, bandwidths[k] * tract * (1.25 - .25 * shape.lip));
        lipK = 1 - Math.exp(-TAU * (650 * tract + Math.pow(shape.lip, 1.5) * 9000) / SR);
        nasal = clamp(shape.nasal + (voice.nasal || 0), 0, 1);
        breath = voice.breath * (1 + 5 * shape.breath) * options.breath + (isMeowLike ? .025 * smooth(.75, 1, u) : 0) + (demand ? .03 : 0);
        roughness = options.rough(u);
      }
      if ((i % 2205) === 0) driftTarget = (rng() * 2 - 1) * .018;
      drift += (driftTarget - drift) * .0006;

      const f0 = f0Base * pitchContour(ev, u) * (1 + drift + Math.sin(TAU * 5.6 * t) * options.vibrato * smooth(.3, .7, u));
      phase += f0 * jitter * (alt ? 1 + roughness * .08 : 1 - roughness * .08) / SR;
      if (phase >= 1) {
        phase -= 1;
        alt = !alt;
        jitter = 1 + (rng() * 2 - 1) * voice.jitter;
        shimmer = (1 + (rng() * 2 - 1) * voice.shimmer) * (alt ? 1 - roughness : 1);
      }
      const flow = glottalFlow(phase, options.openQuotient);
      const pulse = (flow - flowPrev) * SR / f0 * .12;
      flowPrev = flow;

      // Aspiration is gated by the open glottis, so breath rides on the voice instead of hissing beside it.
      const white = rng() * 2 - 1;
      breathLP += .3 * (white - breathLP);
      const air = (white - breathLP) * breath * (.3 + .7 * flow);
      const source = pulse * shimmer + air;

      let y = source;
      for (let k = 0; k < 4; k++) y = runResonator(formants[k], y);
      lip += lipK * (y - lip);
      const voiced = lip * (1 - .7 * nasal) + runResonator(nasalRes, source) * nasal * .8;
      body += bodyK * (voiced - body);
      raw[i] = ev.kind === 'growl' ? voiced : voiced - body;

      const attack = smooth(0, options.attack, t);
      const release = 1 - smooth(dur - options.release, dur, t);
      target[i] = shape.amp * options.effort(u) * attack * release * (1 - .55 * shape.roll * (.5 + .5 * Math.cos(TAU * options.rollRate * t)));
      if (i % FRAME < 1) lips[Math.floor(i / FRAME)] = shape.lip * attack * release;
    }

    const env = rmsEnvelope(raw, .008);
    let maxEnv = 0;
    for (let i = 0; i < n; i++) maxEnv = Math.max(maxEnv, env[i]);
    const floor = maxEnv * .02 + 1e-9;
    for (let i = 0; i < n; i++) raw[i] = raw[i] / Math.max(env[i], floor) * target[i];
    raw.lips = lips;
    return raw;
  }

  function renderHiss(ev, voice, dur) {
    const n = Math.ceil(dur * SR), out = new Float32Array(n), rng = random(ev.seed + 77);
    const r1 = makeResonator(), r2 = makeResonator();
    tuneResonator(r1, 1700 * voice.tract, 1800);
    tuneResonator(r2, 3500 * voice.tract, 3000);
    const spit = /^p/.test(ev.word) ? 2.4 : 1.6;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, u = i / n, white = rng() * 2 - 1;
      lp += .25 * (white - lp);
      const body = (white - lp) * .5 + runResonator(r1, white) * .6 + runResonator(r2, white) * .5;
      // A cat's hiss opens with a sharp spit, then settles into a forced exhale.
      const burst = spit * Math.exp(-t / .012);
      const env = smooth(0, .05, t) * (1 - smooth(dur * .7, dur, t)) * (.88 + .12 * Math.sin(TAU * 5.5 * t)) * (1 + .15 * (1 - u));
      out[i] = body * env + white * burst * .6;
    }
    return out;
  }

  function renderPurr(ev, voice, dur) {
    const n = Math.ceil(dur * SR), out = new Float32Array(n), rng = random(ev.seed + 31);
    const tract = voice.tract;
    const res = [makeResonator(), makeResonator(), makeResonator()];
    [[260, 140], [1150, 200], [2300, 300]].forEach(([f, bw], k) => tuneResonator(res[k], f * tract * .9, bw * tract));
    const lipK = 1 - Math.exp(-TAU * 620 * tract / SR);
    const cycle = 2.1 * (1 + ev.vary.length * .1 * ev.amount), exhaleFrac = .56;
    let phase = 0, flowPrev = 0, pulseGain = 1, jitter = 1, noiseLP = 0, lip = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const c = (t / cycle + .02) % 1, exhale = c < exhaleFrac;
      const local = exhale ? c / exhaleFrac : (c - exhaleFrac) / (1 - exhaleFrac);
      const breathEnv = smooth(0, .12, local) * (1 - smooth(.82, 1, local)) * (exhale ? 1 : .68);
      const rate = voice.purr * (exhale ? 1 : 1.07) * (1 + .03 * Math.sin(TAU * .7 * t)) * jitter;
      phase += rate / SR;
      if (phase >= 1) {
        phase -= 1;
        pulseGain = .8 + rng() * .3;
        jitter = 1 + (rng() * 2 - 1) * .04;
      }
      // Each purr pulse is a brief glottal snap repeated ~25 times per second on both breaths.
      const flow = glottalFlow(phase, .3);
      const pulse = (flow - flowPrev) * SR / rate * .05 * pulseGain;
      flowPrev = flow;
      const white = rng() * 2 - 1;
      noiseLP += .08 * (white - noiseLP);
      let y = pulse + noiseLP * (.25 + .75 * flow) * .6;
      for (const r of res) y = runResonator(r, y);
      lip += lipK * (y - lip);
      out[i] = lip * breathEnv * smooth(0, .06, t) * (1 - smooth(dur - .08, dur, t));
    }
    return out;
  }

  function renderChatter(ev, voice, dur) {
    const n = Math.ceil(dur * SR), out = new Float32Array(n), rng = random(ev.seed + 13);
    let t = .01, k = 0;
    while (t < dur - .06) {
      const sub = { ...ev, seed: ev.seed + k * 101, kind: 'chirp' };
      const click = renderVoiced(sub, voice, {
        duration: .045, segments: [{ shape: 'stop', w: .1 }, { shape: 'e', w: .6 }, { shape: 'stop', w: .2 }],
        f0: voice.f0 * KINDS.chatter.pitch * (1 + (rng() * 2 - 1) * .06), openQuotient: .5, breath: 1.4,
        rough: () => 0, effort: () => 1, attack: .002, release: .008, vibrato: 0, rollRate: 0
      });
      const start = Math.floor(t * SR);
      for (let i = 0; i < click.length && start + i < n; i++) out[start + i] += click[i] + (i < 130 ? (rng() * 2 - 1) * .5 * (1 - i / 130) : 0);
      t += (1 / 11) * (1 + (rng() * 2 - 1) * .18);
      k++;
    }
    return out;
  }

  function renderEvent(ev, voice, dur) {
    if (ev.kind === 'hiss') return renderHiss(ev, voice, dur);
    if (ev.kind === 'purr') return renderPurr(ev, voice, dur);
    if (ev.kind === 'chatter') return renderChatter(ev, voice, dur);
    if (ev.kind === 'growl') {
      return renderVoiced(ev, voice, {
        duration: dur, segments: [{ shape: 'u', w: .4 }, { shape: 'r', w: 1 }, { shape: 'u', w: .5 }],
        f0: voice.growl, openQuotient: .8, breath: 3, rough: () => .55, effort: u => .8 + .2 * Math.sin(TAU * u * 3.1),
        attack: .05, release: .12, vibrato: 0, rollRate: 17
      });
    }
    const chirpSegments = [{ shape: 'm', w: .2 }, { shape: 'i', w: .5 }, { shape: 'e', w: .4 }, { shape: 'a', w: .2 }];
    const segments = ev.kind === 'chirp' ? chirpSegments : lettersToSegments(ev.word);
    const isYowl = ev.kind === 'yowl';
    const fryEnd = ['meow', 'word', 'nyan'].includes(ev.kind) && dur > .45;
    const endsInStop = segments[segments.length - 1].shape === 'stop';
    return renderVoiced(ev, voice, {
      duration: dur,
      segments,
      f0: voice.f0 * KINDS[ev.kind].pitch,
      openQuotient: ev.demand ? .5 : .62,
      breath: isYowl ? 1.6 : 1,
      rough: u => voice.rough * (isYowl ? 1.6 : 1) * (fryEnd ? .5 + .8 * smooth(.75, 1, u) : 1) + (isYowl ? .04 : 0) + (ev.demand ? .06 : 0),
      effort: u => (.72 + .28 * smooth(.05, .42, u)) * (isYowl ? .85 + .15 * Math.sin(TAU * u * 2.4) : 1),
      attack: ev.kind === 'chirp' ? .006 : .018,
      release: endsInStop ? .012 : ev.kind === 'chirp' ? .03 : .06,
      vibrato: isYowl ? .025 : 0,
      rollRate: ev.kind === 'trill' ? 28 : 24
    });
  }

  function addRoom(buffer, amount) {
    if (amount <= 0) return;
    const combs = [1116, 1188, 1277, 1356].map(d => ({ buf: new Float32Array(Math.round(d * .55)), i: 0, lp: 0 }));
    const passes = [556, 441].map(d => ({ buf: new Float32Array(Math.round(d * .55)), i: 0 }));
    const wet = .3 * amount;
    for (let n = 0; n < buffer.length; n++) {
      const x = buffer[n];
      let y = 0;
      for (const c of combs) {
        const d = c.buf[c.i];
        c.lp += .35 * (d - c.lp);
        c.buf[c.i] = x + c.lp * .72;
        c.i = (c.i + 1) % c.buf.length;
        y += d;
      }
      y *= .25;
      for (const p of passes) {
        const d = p.buf[p.i];
        p.buf[p.i] = y + d * .5;
        p.i = (p.i + 1) % p.buf.length;
        y = d - y * .5;
      }
      buffer[n] = x + y * wet;
    }
  }

  function recordAnimation(anim, ev, index, part, peak, pos) {
    const first = Math.round(pos / FRAME), count = Math.ceil(part.length / FRAME);
    const scale = { purr: 0, growl: .35, hiss: 1, chatter: 1 }[ev.kind];
    for (let k = 0; k < count && first + k < anim.open.length; k++) {
      let open;
      if (part.lips && scale === undefined) open = part.lips[k] || 0;
      else {
        let level = 0;
        for (let i = Math.floor(k * FRAME), end = Math.min(part.length, Math.floor((k + 1) * FRAME)); i < end; i++) level = Math.max(level, Math.abs(part[i]));
        open = peak > 0 ? Math.min(1, level / peak * 1.4) * scale : 0;
      }
      const f = first + k;
      anim.open[f] = Math.max(anim.open[f], open);
      anim.mood[f] = KIND_MOODS[ev.kind];
      anim.word[f] = index;
      anim.question[f] = ev.question ? 1 : 0;
    }
  }

  function render(script, settings) {
    const text = String(script || '').trim().slice(0, 600);
    if (!text) throw Error('Type a meow first.');
    const items = parse(text);
    if (!items.some(t => t.kind !== 'pause')) throw Error('Try meow, purr, hiss, chirp or yowl.');
    const voice = { ...VOICES[settings.voice] || VOICES.house };
    voice.f0 *= settings.pitch;
    voice.growl *= Math.sqrt(settings.pitch);
    const variation = settings.variation, gap = settings.gap, gapVariation = settings.gapVariation, speed = settings.speed;

    const durations = items.map((ev, n) => {
      const r = random(hash(text + '|' + settings.voice + '|' + n + '|' + (ev.word || '')));
      ev.vary = { pitch: r() * 2 - 1, length: r() * 2 - 1, level: r() * 2 - 1, timbre: r() * 2 - 1, onset: r() * 2 - 1, ending: r() * 2 - 1, spacing: r() * 2 - 1 };
      ev.amount = variation;
      ev.seed = (ev.seed || 0) ^ hash(String(n));
      if (ev.kind === 'pause') {
        return ev.soft
          ? Math.max(.003, gap * (1 + ev.vary.spacing * .85 * gapVariation))
          : ev.duration / speed * (1 + ev.vary.spacing * .42 * gapVariation);
      }
      const stretch = ['purr', 'hiss', 'growl', 'chatter'].includes(ev.kind) ? 1 : 1 + ev.vary.length * .22 * variation;
      return baseDuration(ev) / speed * stretch * (ev.demand ? 1.2 : 1) * (voice.length || 1);
    });
    const total = durations.reduce((a, b) => a + b, 0) + .45;
    if (total > MAX_SECONDS) throw Error('Too many cat sounds. Shorten the script.');

    const out = new Float32Array(Math.ceil(total * SR));
    const frames = Math.ceil(out.length / FRAME);
    const anim = { fps: ANIM_FPS, moods: MOODS, open: new Float32Array(frames), mood: new Uint8Array(frames), word: new Int16Array(frames).fill(-1), question: new Uint8Array(frames), words: items.map(ev => ev.text || '') };
    let pos = Math.floor(.02 * SR);
    items.forEach((ev, n) => {
      const count = Math.floor(durations[n] * SR);
      if (ev.kind !== 'pause') {
        const part = renderEvent(ev, voice, durations[n]);
        let peak = 0;
        for (const s of part) peak = Math.max(peak, Math.abs(s));
        const gain = peak > 0 ? KINDS[ev.kind].level * (1 + ev.vary.level * .2 * variation) * (ev.demand ? 1.15 : 1) / peak : 0;
        for (let i = 0; i < part.length && pos + i < out.length; i++) out[pos + i] += part[i] * gain;
        recordAnimation(anim, ev, n, part, peak, pos);
      }
      pos += count;
    });

    out.anim = anim;
    addRoom(out, settings.room);
    let peak = 0;
    for (const s of out) peak = Math.max(peak, Math.abs(s));
    if (peak > 0) {
      const scale = .89 / peak;
      for (let i = 0; i < out.length; i++) out[i] *= scale;
    }
    return out;
  }

  function encodeWav(samples) {
    const bytes = 44 + samples.length * 2, buffer = new ArrayBuffer(bytes), view = new DataView(buffer);
    const write = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
    write(0, 'RIFF'); view.setUint32(4, bytes - 8, true); write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, SR, true); view.setUint32(28, SR * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const v = clamp(samples[i], -1, 1);
      view.setInt16(44 + i * 2, v < 0 ? v * 32768 : v * 32767, true);
    }
    return buffer;
  }

  const engine = { SR, VOICES, render, parse, classify, encodeWav };
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (typeof document === 'undefined') return;


  // ---- UI ----
  const $ = id => document.getElementById(id);
  const SCRIPT_KEY = 'urage.catVoiceSynth.script';
  const SETTINGS_KEY = 'urage.catVoiceSynth.settings';
  const TOKEN_RE = /[A-Za-z]+|[^A-Za-z]+/g;
  const BREEDS = [
    { id: 'kitten', name: 'Baby kitten', note: 'Squeaky, wobbly mews' },
    { id: 'house', name: 'House cat', note: 'Classic grey tabby' },
    { id: 'siamese', name: 'Siamese', note: 'Loud and nasal' },
    { id: 'tom', name: 'Tomcat', note: 'Low, grumpy, rough' }
  ];
  const KIND_CLASS = { meow: 'meow', word: 'meow', mew: 'meow', nyan: 'meow', yowl: 'growl', growl: 'growl', trill: 'trill', chirp: 'chirp', chatter: 'chirp', purr: 'purr', hiss: 'hiss' };
  const KIND_LABEL = { word: 'talk' };
  const PHRASES = [
    ['Greet', ['mrrp?', 'mrrrow', 'brrt mew']],
    ['Ask', ['meeeooow?', 'mew? mew?', 'nyaaa?']],
    ['Demand', ['MEOW! MEOW!', 'MEEEOOOW!', 'meow meow meow meow']],
    ['Content', ['purrrrrr', 'mrrp purrrr']],
    ['Hunt', ['ekekekekek', 'chirp chirp eep']],
    ['Angry', ['grrrrr. hiss!', 'psssst', 'yowl']]
  ];
  const SLIDERS = {
    pitch: { value: 1, format: v => (+v).toFixed(2) + '×' },
    speed: { value: 1, format: v => (+v).toFixed(2) + '×' },
    variation: { value: 65, format: v => v + '%' },
    gap: { value: 35, format: v => v + ' ms' },
    gapVariation: { value: 75, format: v => v + '%' },
    room: { value: 15, format: v => v + '%' }
  };
  const ui = {
    text: $('catText'), play: $('play'), timeline: $('timeline'), wave: $('wave'), playhead: $('playhead'),
    time: $('time'), tokens: $('tokens'), summary: $('summary'), status: $('status'), picker: $('catPicker'),
    figure: $('catFigure'), mouth: $('catMouth'), tongue: $('catTongue'), bubble: $('catBubble'), badge: $('moodBadge')
  };
  let voice = 'house', audioCtx = null, playing = null, lastSamples = null, lastUrl = null;
  let renderTimer = 0, peaks = null, colors = null, animFrame = 0, mouthOpen = 0, shownWord = -1;

  const formatTime = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function readSettings() {
    return {
      voice,
      pitch: +$('pitch').value,
      variation: +$('variation').value / 100,
      gap: +$('gap').value / 1000,
      gapVariation: +$('gapVariation').value / 100,
      speed: +$('speed').value,
      room: +$('room').value / 100
    };
  }

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  }

  function saveSettings() {
    const values = { voice };
    for (const name of Object.keys(SLIDERS)) values[name] = $(name).value;
    store(SETTINGS_KEY, JSON.stringify(values));
  }

  function setStatus(text, isError) {
    ui.status.textContent = text;
    ui.status.classList.toggle('is-error', !!isError);
  }

  // ---- Rendering ----
  function make() {
    clearTimeout(renderTimer);
    renderTimer = 0;
    lastSamples = render(ui.text.value, readSettings());
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(new Blob([encodeWav(lastSamples)], { type: 'audio/wav' }));
    peaks = null;
    const sounds = ui.tokens.querySelectorAll('.mm-token').length;
    ui.summary.textContent = `${sounds} sound${sounds === 1 ? '' : 's'} · ${formatTime(lastSamples.length / SR)}`;
    setStatus('');
    drawWave(0);
    updateTime(0);
    return lastSamples;
  }

  function tryMake() {
    try {
      make();
      return true;
    } catch (e) {
      renderTimer = 0;
      setStatus(e.message, true);
      return false;
    }
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(tryMake, 320);
  }

  // ---- Script strip: shows how each word is understood ----
  function renderTokens() {
    // Same trimming and tokenizing as parse(), so token indexes match the animation's word indexes.
    const tokens = ui.text.value.trim().slice(0, 600).match(TOKEN_RE) || [];
    const parts = [];
    tokens.forEach((token, index) => {
      if (!/^[A-Za-z]+$/.test(token)) {
        if (/[,;.!?\n]/.test(token)) parts.push('<span class="mm-pause" title="pause"></span>');
        return;
      }
      const kind = classify(token.toLowerCase());
      if (!kind) {
        parts.push(`<span class="mm-ignored" title="Not a cat sound">${escapeHtml(token)}</span>`);
        return;
      }
      const mark = (tokens[index + 1] || '').match(/[?!]/);
      parts.push(`<button type="button" class="mm-token k-${KIND_CLASS[kind]}" data-index="${index}" data-say="${token}${mark ? mark[0] : ''}">${token}<small>${KIND_LABEL[kind] || kind}</small></button>`);
    });
    ui.tokens.innerHTML = parts.join('') || '<span class="mm-meta">Type meow, purr, mrrp, hiss…</span>';
  }

  // ---- Waveform timeline ----
  function readColors() {
    const style = getComputedStyle(document.body);
    const get = name => style.getPropertyValue(name).trim();
    colors = {
      accent: get('--cat-accent') || '#ff9ac4',
      idle: get('--cat-line-strong') || '#4a5170',
      moods: [null, get('--k-meow'), get('--k-purr'), get('--k-hiss'), get('--k-growl'), get('--k-chirp')]
    };
  }

  function drawWave(progress) {
    if (!lastSamples) return;
    const canvas = ui.wave, ctx = canvas.getContext('2d'), ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(100, Math.round(rect.width * ratio)), h = Math.max(20, Math.round(rect.height * ratio));
    if (canvas.width !== w || canvas.height !== h || !peaks) {
      canvas.width = w;
      canvas.height = h;
      const step = Math.max(2, Math.round(3 * ratio));
      peaks = [];
      for (let x = 0; x < w; x += step) {
        const a0 = Math.floor(x * lastSamples.length / w), a1 = Math.min(lastSamples.length, Math.floor((x + step) * lastSamples.length / w));
        let peak = 0;
        for (let j = a0; j < a1; j++) peak = Math.max(peak, Math.abs(lastSamples[j]));
        peaks.push([x, step, peak]);
      }
    }
    if (!colors) readColors();
    const anim = lastSamples.anim, lane = Math.round(3 * ratio), mid = (h - lane) / 2, cut = progress * w;
    ctx.clearRect(0, 0, w, h);
    for (const [x, step, peak] of peaks) {
      const bar = Math.max(ratio, peak * (mid - 2 * ratio));
      ctx.fillStyle = x < cut ? colors.accent : colors.idle;
      ctx.fillRect(x, mid - bar, Math.max(1, step - ratio), bar * 2);
      const mood = anim.mood[Math.floor(x / w * anim.mood.length)];
      if (mood) {
        ctx.fillStyle = colors.moods[mood];
        ctx.fillRect(x, h - lane, step, lane);
      }
    }
  }

  function updateTime(position) {
    const total = lastSamples ? lastSamples.length / SR : 0;
    ui.time.textContent = playing && playing.main ? `${formatTime(position)} / ${formatTime(total)}` : formatTime(total);
  }

  // ---- Playback ----
  function clock() {
    return audioCtx.currentTime - playing.startedAt + playing.offset - (audioCtx.outputLatency || 0);
  }

  async function playSamples(samples, offset, main) {
    stop();
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error('This browser does not support Web Audio.');
    audioCtx = audioCtx || new Context();
    await audioCtx.resume();
    const buffer = audioCtx.createBuffer(1, samples.length, SR);
    buffer.getChannelData(0).set(samples);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    const startedAt = audioCtx.currentTime + .02;
    source.start(startedAt, offset);
    // A replaced source still fires onended after its successor starts; only the current one may finish playback.
    source.onended = () => { if (playing && playing.source === source) stop(); };
    playing = { source, samples, startedAt, offset, main };
    ui.play.classList.add('is-playing');
    ui.play.setAttribute('aria-label', 'Stop');
    ui.timeline.classList.toggle('is-playing', main);
    if (!animFrame) animFrame = requestAnimationFrame(animate);
  }

  function stop() {
    if (!playing) return;
    const { source } = playing;
    playing = null;
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
    ui.play.classList.remove('is-playing');
    ui.play.setAttribute('aria-label', 'Play');
    ui.timeline.classList.remove('is-playing');
    drawWave(0);
    updateTime(0);
    if (!animFrame) animFrame = requestAnimationFrame(animate);
  }

  async function playMain(offset) {
    try {
      if (!lastSamples || renderTimer) make();
      await playSamples(lastSamples, offset || 0, true);
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  async function playSnippet(text) {
    try {
      await playSamples(render(text, readSettings()), 0, false);
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  function togglePlay() {
    if (playing) stop();
    else void playMain(0);
  }

  // ---- Animated cat: follows the rendered mouth/mood timeline ----
  function poseCat(mood, open, question, word, words) {
    mouthOpen += (open - mouthOpen) * .5;
    const ry = .6 + mouthOpen * 9.5;
    ui.mouth.setAttribute('ry', ry.toFixed(2));
    ui.mouth.setAttribute('rx', (6 + mouthOpen * 3.5).toFixed(2));
    ui.mouth.setAttribute('cy', (106 + ry).toFixed(2));
    ui.tongue.setAttribute('ry', (mouthOpen > .35 ? ry * .38 : 0).toFixed(2));
    ui.tongue.setAttribute('cy', (106 + ry * 1.55).toFixed(2));
    if (ui.figure.dataset.mood !== mood) {
      ui.figure.dataset.mood = mood;
      ui.badge.dataset.mood = mood;
      ui.badge.textContent = mood;
    }
    ui.figure.dataset.question = question ? '1' : '0';
    if (word !== shownWord) {
      shownWord = word;
      const text = word >= 0 && words ? words[word] : '';
      if (text) ui.bubble.textContent = text + (question ? '?' : '');
      ui.bubble.classList.toggle('show', !!text);
      for (const el of ui.tokens.querySelectorAll('.is-active')) el.classList.remove('is-active');
      const active = playing && playing.main && word >= 0 && ui.tokens.querySelector(`[data-index="${word}"]`);
      if (active) active.classList.add('is-active');
    }
  }

  function animate() {
    animFrame = 0;
    let mood = 'idle', open = 0, question = 0, word = -1, words = null;
    if (playing) {
      const t = clock(), anim = playing.samples.anim, f = Math.floor(t * anim.fps);
      if (f >= 0 && f < anim.open.length) {
        mood = anim.moods[anim.mood[f]];
        open = anim.open[f];
        question = anim.question[f];
        word = anim.word[f];
        words = anim.words;
      }
      if (playing.main) {
        const progress = clamp(t / (playing.samples.length / SR), 0, 1);
        ui.playhead.style.left = (progress * 100) + '%';
        drawWave(progress);
        updateTime(Math.max(0, t));
      }
    }
    poseCat(mood, open, question, word, words);
    if (playing || mouthOpen > .01) animFrame = requestAnimationFrame(animate);
  }

  // ---- Cat picker ----
  function avatar(id) {
    const big = id === 'kitten';
    const eye = cx => `<ellipse class="eye-ball" cx="${cx}" cy="86" rx="${big ? 12 : 9.5}" ry="${big ? 13 : 10.5}" /><ellipse class="pupil" cx="${cx}" cy="87" rx="${big ? 5 : 3.2}" ry="${big ? 10 : 8}" /><circle class="glint" cx="${cx - 3}" cy="82" r="${big ? 3 : 2}" />`;
    return `<svg class="cat-avatar cat-art" viewBox="62 24 116 92" data-voice="${id}" aria-hidden="true">`
      + '<path class="ear-fur" d="M78 78 L83 30 L114 62 Z" /><path class="ear-inner" d="M85 70 L87 44 L104 63 Z" />'
      + '<path class="ear-fur" d="M162 78 L157 30 L126 62 Z" /><path class="ear-inner" d="M155 70 L153 44 L136 63 Z" />'
      + '<ellipse class="fur" cx="120" cy="92" rx="52" ry="42" /><path class="stripes" d="M120 52 V66 M106 55 L110 67 M134 55 L130 67" />'
      + `<ellipse class="mask" cx="120" cy="108" rx="25" ry="19" />${eye(100)}${eye(140)}`
      + '<path class="nose" d="M114.5 100 L125.5 100 L120 106 Z" /><path class="line" d="M120 106 Q115 112 108 108 M120 106 Q125 112 132 108" /></svg>';
  }

  function updateBreedMeta() {
    const hz = Math.round(VOICES[voice].f0 * +$('pitch').value / 10) * 10;
    $('breedMeta').textContent = `~${hz} Hz voice`;
  }

  function selectVoice(id, audition) {
    voice = id;
    for (const card of ui.picker.children) {
      const on = card.dataset.voice === id;
      card.setAttribute('aria-checked', on ? 'true' : 'false');
      card.tabIndex = on ? 0 : -1;
    }
    ui.figure.dataset.voice = id;
    updateBreedMeta();
    saveSettings();
    if (tryMake() && audition) void playSnippet(id === 'kitten' ? 'mew mew' : 'meow');
  }

  ui.picker.innerHTML = BREEDS.map(b => `<button type="button" class="mm-cat" role="radio" data-voice="${b.id}" aria-checked="false">${avatar(b.id)}<strong>${b.name}</strong><small>${b.note}</small></button>`).join('');
  ui.picker.addEventListener('click', e => {
    const card = e.target.closest('.mm-cat');
    if (card) selectVoice(card.dataset.voice, true);
  });
  ui.picker.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const index = (BREEDS.findIndex(b => b.id === voice) + step + BREEDS.length) % BREEDS.length;
    selectVoice(BREEDS[index].id, true);
    ui.picker.children[index].focus();
  });

  // ---- Sliders ----
  function syncSlider(name) {
    const input = $(name), spec = SLIDERS[name];
    $(name + 'Val').textContent = spec.format(input.value);
    input.style.setProperty('--fill', ((input.value - input.min) / (input.max - input.min) * 100) + '%');
    input.closest('.mm-slider').classList.toggle('is-modified', +input.value !== spec.value);
  }

  for (const name of Object.keys(SLIDERS)) {
    const input = $(name);
    input.addEventListener('input', () => {
      syncSlider(name);
      if (name === 'pitch') updateBreedMeta();
      saveSettings();
      scheduleRender();
    });
    input.addEventListener('dblclick', () => {
      input.value = SLIDERS[name].value;
      input.dispatchEvent(new Event('input'));
    });
  }
  $('resetAll').addEventListener('click', () => {
    for (const [name, spec] of Object.entries(SLIDERS)) {
      $(name).value = spec.value;
      syncSlider(name);
    }
    updateBreedMeta();
    saveSettings();
    tryMake();
  });

  // ---- Phrase library ----
  $('phrases').innerHTML = PHRASES.map(([group, list]) => `<div class="mm-phrase-group"><span>${group}</span><div>${list.map(p => `<button type="button" class="mm-phrase" data-phrase="${p}">${p}</button>`).join('')}</div></div>`).join('');
  $('phrases').addEventListener('click', e => {
    const chip = e.target.closest('[data-phrase]');
    if (!chip) return;
    const phrase = chip.dataset.phrase, el = ui.text;
    const start = el.selectionStart ?? el.value.length, end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start), after = el.value.slice(end);
    const insert = (before && !/\s$/.test(before) ? ' ' : '') + phrase + (after && !/^\s/.test(after) ? ' ' : '');
    el.value = before + insert + after;
    el.selectionStart = el.selectionEnd = before.length + insert.length;
    el.dispatchEvent(new Event('input'));
    void playSnippet(phrase);
  });

  // ---- Wiring ----
  ui.text.addEventListener('input', () => {
    store(SCRIPT_KEY, ui.text.value);
    renderTokens();
    scheduleRender();
  });
  ui.tokens.addEventListener('click', e => {
    const token = e.target.closest('[data-say]');
    if (token) void playSnippet(token.dataset.say);
  });
  ui.play.addEventListener('click', togglePlay);
  ui.timeline.addEventListener('click', e => {
    if (!lastSamples && !tryMake()) return;
    const rect = ui.timeline.getBoundingClientRect();
    void playMain(clamp((e.clientX - rect.left) / rect.width, 0, .999) * lastSamples.length / SR);
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'Escape') {
      stop();
    } else if (e.key === ' ' && !e.target.closest('textarea, input, button, select')) {
      e.preventDefault();
      togglePlay();
    }
  });
  $('save').addEventListener('click', () => {
    if (!tryMake()) return;
    const a = document.createElement('a');
    a.href = lastUrl;
    a.download = 'meow-machine.wav';
    document.body.append(a);
    a.click();
    a.remove();
    setStatus('WAV exported.');
  });
  window.addEventListener('resize', () => { peaks = null; drawWave(0); });
  // Dashboard themes arrive after load and can change live; repaint with the new colors.
  const themeObserver = new MutationObserver(() => { colors = null; drawWave(0); });
  for (const host of [document.documentElement, document.body]) themeObserver.observe(host, { attributes: true, attributeFilter: ['style', 'data-dashboard-theme'] });

  // ---- Dashboard bridge ----
  function wavDataUrl(samples) {
    const bytes = new Uint8Array(encodeWav(samples));
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  function describeCurrentAssets() {
    if (!lastSamples) return [];
    const dataUrl = wavDataUrl(lastSamples);
    return [{
      kind: 'audio',
      resourceKind: 'audio',
      fileName: 'meow-machine.wav',
      mimeType: 'audio/wav',
      dataUrl,
      previewUrl: dataUrl,
      title: 'Meow Machine: ' + ui.text.value.trim().slice(0, 60),
      metadata: { script: ui.text.value, settings: readSettings() }
    }];
  }

  function loadAssetPayload(payload) {
    const text = payload && (payload.textContent || (payload.metadata && payload.metadata.script));
    if (typeof text !== 'string' || !text.trim()) throw Error('Meow Machine accepts text: send it a cat script.');
    ui.text.value = text.slice(0, 600);
    renderTokens();
    tryMake();
  }

  window.describeCurrentAssets = describeCurrentAssets;
  if (typeof window.registerDashboardToolBridge === 'function') {
    window.registerDashboardToolBridge({ onLoadAsset: loadAssetPayload, onDescribeCurrentAssets: describeCurrentAssets });
  }

  // ---- Restore ----
  try {
    const savedScript = localStorage.getItem(SCRIPT_KEY);
    if (savedScript) ui.text.value = savedScript;
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    for (const name of Object.keys(SLIDERS)) if (saved[name] != null) $(name).value = saved[name];
    if (VOICES[saved.voice]) voice = saved.voice;
  } catch { /* storage unavailable */ }
  for (const name of Object.keys(SLIDERS)) syncSlider(name);
  renderTokens();
  selectVoice(voice, false);
})();
