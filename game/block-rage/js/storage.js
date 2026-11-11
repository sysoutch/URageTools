// Best score and settings, kept in this browser only. Storage can be
// blocked (private windows, previews), so every access is guarded.

const KEY = 'urage.blockRage.v1';
const DEFAULTS = { best: 0, sound: true, ghost: true };

export function loadSaved() {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(KEY) || '{}');
        return { ...DEFAULTS, ...parsed };
    } catch {
        return { ...DEFAULTS };
    }
}

export function saveSaved(values) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(values));
    } catch {
        // Storage unavailable: the game still works, it just forgets.
    }
}
