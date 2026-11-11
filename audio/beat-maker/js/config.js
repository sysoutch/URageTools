// =========================================================
// CONFIGURATION & CONSTANTS
// =========================================================

const MAX_STEPS = 32;
const STORAGE_KEY = 'mini-studio-offline-v3';
const MEMORY_KEY = 'mini-studio-memory-v3';

const laneMeta = [
  { key: 'kick', label: 'Kick', icon: '🥁', hint: 'foundation', colorClass: 'kick' },
  { key: 'snare', label: 'Snare', icon: '💥', hint: 'backbeat', colorClass: 'snare' },
  { key: 'hats', label: 'Hi-Hat', icon: '✨', hint: 'rhythm sparkle', colorClass: 'hats' },
  { key: 'clap', label: 'Clap', icon: '👏', hint: 'extra snap', colorClass: 'clap' },
  { key: 'bass', label: 'Bass', icon: '🎸', hint: 'low groove', colorClass: 'bass' },
  { key: 'chord', label: 'Chord', icon: '🎹', hint: 'harmony layer', colorClass: 'chord' },
  { key: 'perc', label: 'Perc', icon: '🪘', hint: 'fill motion', colorClass: 'perc' },
  { key: 'fx', label: 'FX', icon: '🌫️', hint: 'air & accents', colorClass: 'fx' }
];

// Helper functions needed before PRESETS IIFE evaluation
const makeSteps = (active = [], length = MAX_STEPS) => Array.from({ length }, (_, i) => active.includes(i));
const defaultLaneState = () => Object.fromEntries(laneMeta.map(l => [l.key, { steps: makeSteps([], MAX_STEPS), volume: 0.8, mute: false, solo: false }]));
const freshPattern = () => ({ bpm: 112, swing: 12, volume: 80, steps: 16, lanes: defaultLaneState() });

// The presets come from beat-engine.js (shared with Bottlefield), as full patterns.
const PRESETS = BeatEngine.presets(MAX_STEPS);
