// Tuning values for Block Rage. Everything gameplay-related lives here so
// balance changes never require touching the game logic.

export const COLS = 10;
export const ROWS = 20;
// Rows above the visible field where pieces may poke out while spawning.
export const HIDDEN_ROWS = 2;

export const QUEUE_SIZE = 5;
export const NEXT_PREVIEW_COUNT = 3;

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;

// Keyboard auto-repeat: delay before repeating, then the repeat interval.
export const DAS_MS = 150;
export const ARR_MS = 45;
export const SOFT_DROP_MS = 35;

export const LINES_PER_LEVEL = 10;
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const COMBO_BONUS = 50;
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

// Rage meter: clearing lines fills it; when full, the player can burn
// the bottom rows of the stack.
export const RAGE_MAX = 100;
export const RAGE_PER_LINE = 12;
export const RAGE_QUAD_BONUS = 20;
export const RAGE_BURN_ROWS = 4;
export const RAGE_BURN_POINTS_PER_ROW = 150;

export function gravityIntervalMs(level) {
    return Math.max(55, Math.round(800 * Math.pow(0.82, level - 1)));
}
