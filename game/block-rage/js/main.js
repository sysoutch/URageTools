// Wires the game to the page: the frame loop, controls, HUD, overlay,
// sound, saved settings and the URage dashboard hooks.

import { COLS } from './config.js';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { InputController } from './input.js';
import { SoundEffects } from './audio.js';
import { loadSaved, saveSaved } from './storage.js';

const $ = id => document.getElementById(id);

const els = {
    board: $('board-canvas'),
    hold: $('hold-canvas'),
    next: $('next-canvas'),
    overlay: $('overlay'),
    overlayTitle: $('overlay-title'),
    overlayText: $('overlay-text'),
    overlayButton: $('overlay-button'),
    rageFill: document.querySelectorAll('[data-rage-fill]'),
    rageMeters: document.querySelectorAll('[data-rage-meter]'),
    rageButton: $('rage-button'),
    newGameButton: $('new-game-button'),
    pauseButton: $('pause-button'),
    soundToggle: $('sound-toggle'),
    ghostToggle: $('ghost-toggle'),
    touchControls: $('touch-controls')
};

const saved = loadSaved();
const sound = new SoundEffects();
sound.enabled = saved.sound;

const renderer = new Renderer({ boardCanvas: els.board, holdCanvas: els.hold, nextCanvas: els.next });
renderer.showGhost = saved.ghost;

let isNewBest = false;
const game = new Game(handleGameEvent);

// ---- game events ----------------------------------------------------------

function handleGameEvent(event) {
    switch (event.type) {
        case 'start':
            isNewBest = false;
            break;
        case 'clear':
            renderer.addLineClear(event.rows);
            sound.play('clear', event);
            break;
        case 'lock':
            if (event.cleared === 0) sound.play('lock');
            break;
        case 'drop':
            renderer.addHardDrop();
            sound.play('drop');
            break;
        case 'rage':
            renderer.addRageBurn();
            sound.play('rage');
            break;
        case 'over':
            if (game.score > saved.best) {
                saved.best = game.score;
                isNewBest = true;
                saveSaved(saved);
            }
            sound.play('over');
            break;
        default:
            sound.play(event.type);
    }
}

// ---- actions --------------------------------------------------------------

const playActions = {
    left: () => game.move(-1),
    right: () => game.move(1),
    down: () => game.softDrop(),
    rotateCW: () => game.rotate(1),
    rotateCCW: () => game.rotate(-1),
    hardDrop: () => game.hardDrop(),
    hold: () => game.hold(),
    rage: () => game.unleashRage(),
    pause: () => game.togglePause(),
    tap: () => game.rotate(1)
};

function perform(action) {
    sound.ensureContext();
    if (game.state === 'ready' || game.state === 'over') {
        if (action === 'start' || action === 'hardDrop' || action === 'tap') game.start();
        return;
    }
    if (game.state === 'paused') {
        if (action === 'start' || action === 'pause' || action === 'tap') game.togglePause();
        return;
    }
    playActions[action]?.();
}

const input = new InputController(perform);
input.bindKeyboard();
input.bindButtons(els.touchControls);
input.bindBoardGestures(els.board, COLS);

els.overlayButton.addEventListener('click', () => perform('start'));
els.newGameButton.addEventListener('click', () => {
    sound.ensureContext();
    game.start();
    els.newGameButton.blur();
});
els.pauseButton.addEventListener('click', () => {
    if (game.state === 'playing' || game.state === 'paused') game.togglePause();
    els.pauseButton.blur();
});
els.rageButton.addEventListener('click', () => {
    perform('rage');
    els.rageButton.blur();
});

function bindToggle(checkbox, key, apply) {
    checkbox.checked = saved[key];
    checkbox.addEventListener('change', () => {
        saved[key] = checkbox.checked;
        apply(checkbox.checked);
        saveSaved(saved);
        checkbox.blur();
    });
}
bindToggle(els.soundToggle, 'sound', value => { sound.enabled = value; });
bindToggle(els.ghostToggle, 'ghost', value => { renderer.showGhost = value; });

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        game.pause();
        input.releaseAll();
    }
});
window.addEventListener('resize', () => renderer.resize());

// ---- HUD ------------------------------------------------------------------

const hudCache = {};

function setText(name, value) {
    if (hudCache[name] === value) return;
    hudCache[name] = value;
    document.querySelectorAll(`[data-hud="${name}"]`).forEach(node => { node.textContent = value; });
}

const OVERLAY = {
    ready: { title: 'Block Rage', text: 'Clear lines to fill your rage meter. When it is full, burn away the bottom of the stack.', button: 'Play' },
    paused: { title: 'Paused', text: 'Take a breath.', button: 'Resume' },
    over: { title: 'Game over', text: '', button: 'Play again' }
};

function updateHud() {
    setText('score', game.score.toLocaleString());
    setText('best', Math.max(saved.best, game.score).toLocaleString());
    setText('lines', String(game.lines));
    setText('level', String(game.level));

    const rage = `${Math.round(game.rage)}%`;
    if (hudCache.rage !== rage) {
        hudCache.rage = rage;
        els.rageFill.forEach(node => { node.style.width = rage; });
        els.rageMeters.forEach(node => node.setAttribute('aria-valuenow', String(Math.round(game.rage))));
    }
    const ready = game.rageReady && game.state === 'playing';
    document.body.classList.toggle('rage-ready', ready);
    els.rageButton.disabled = !ready;

    els.pauseButton.textContent = game.state === 'paused' ? 'Resume' : 'Pause';
    els.pauseButton.disabled = game.state === 'ready' || game.state === 'over';

    const overlay = OVERLAY[game.state];
    els.overlay.hidden = !overlay;
    if (overlay && hudCache.overlay !== game.state) {
        hudCache.overlay = game.state;
        els.overlayTitle.textContent = overlay.title;
        els.overlayText.textContent = game.state === 'over'
            ? `${isNewBest ? 'New best! ' : ''}Score ${game.score.toLocaleString()} · ${game.lines} lines · level ${game.level}`
            : overlay.text;
        els.overlayButton.textContent = overlay.button;
    } else if (!overlay) {
        hudCache.overlay = null;
    }
}

// ---- frame loop -----------------------------------------------------------

let last = performance.now();
let themeClock = 0;

function frame(now) {
    const delta = Math.min(100, now - last);
    last = now;
    if (game.state === 'playing') {
        input.update(delta);
        game.update(delta);
    }
    themeClock += delta;
    if (themeClock > 1000) {
        themeClock = 0;
        renderer.refreshTheme();
    }
    renderer.draw(game, delta);
    updateHud();
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- URage dashboard hooks ------------------------------------------------

window.__urageToolDescribeCurrentAsset = function describeCurrentAsset() {
    return {
        kind: 'image',
        label: `Block Rage board (score ${game.score})`,
        fileName: 'block-rage-board.png',
        dataUrl: els.board.toDataURL('image/png')
    };
};

window.__urageToolLoadAssetPayload = function loadAssetPayload() {
    return { accepted: false, reason: 'Block Rage is a game and does not take files.' };
};
