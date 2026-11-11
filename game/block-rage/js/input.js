// Keyboard, on-screen buttons and board gestures, all mapped to the same
// named actions. Held movement keys auto-repeat (DAS/ARR) in update().

import { DAS_MS, ARR_MS, SOFT_DROP_MS } from './config.js';

const KEY_ACTIONS = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowUp: 'rotateCW',
    KeyX: 'rotateCW',
    KeyW: 'rotateCW',
    KeyZ: 'rotateCCW',
    ControlLeft: 'rotateCCW',
    ControlRight: 'rotateCCW',
    Space: 'hardDrop',
    KeyC: 'hold',
    ShiftLeft: 'hold',
    ShiftRight: 'hold',
    KeyR: 'rage',
    KeyP: 'pause',
    Escape: 'pause',
    Enter: 'start'
};

const REPEATING = new Set(['left', 'right', 'down']);

function isTextField(target) {
    return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export class InputController {
    // perform(action) runs one action; it is called again for repeats.
    constructor(perform) {
        this.perform = perform;
        this.held = new Map();
        this.lastHorizontal = null;
    }

    press(action) {
        if (REPEATING.has(action)) {
            if (this.held.has(action)) return;
            this.held.set(action, { elapsed: 0, repeats: 0 });
            if (action !== 'down') this.lastHorizontal = action;
        }
        this.perform(action);
    }

    release(action) {
        this.held.delete(action);
        if (this.lastHorizontal === action) {
            this.lastHorizontal = this.held.has('left') ? 'left' : this.held.has('right') ? 'right' : null;
        }
    }

    releaseAll() {
        this.held.clear();
        this.lastHorizontal = null;
    }

    update(deltaMs) {
        this.held.forEach((state, action) => {
            if (action !== 'down' && action !== this.lastHorizontal) return;
            state.elapsed += deltaMs;
            const delay = action === 'down' ? SOFT_DROP_MS : DAS_MS;
            const interval = action === 'down' ? SOFT_DROP_MS : ARR_MS;
            if (state.elapsed < delay) return;
            const due = Math.floor((state.elapsed - delay) / interval) + 1;
            while (state.repeats < due) {
                state.repeats += 1;
                this.perform(action);
            }
        });
    }

    bindKeyboard(target = window) {
        target.addEventListener('keydown', event => {
            const action = KEY_ACTIONS[event.code];
            if (!action || isTextField(event.target) || event.metaKey || event.altKey) return;
            event.preventDefault();
            if (event.repeat) return;
            this.press(action);
        });
        target.addEventListener('keyup', event => {
            const action = KEY_ACTIONS[event.code];
            if (action) this.release(action);
        });
        window.addEventListener('blur', () => this.releaseAll());
    }

    // Buttons carry data-action; holding one repeats like a held key.
    bindButtons(root) {
        root.querySelectorAll('[data-action]').forEach(button => {
            const action = button.dataset.action;
            button.addEventListener('pointerdown', event => {
                event.preventDefault();
                button.setPointerCapture?.(event.pointerId);
                this.press(action);
            });
            const stop = () => this.release(action);
            button.addEventListener('pointerup', stop);
            button.addEventListener('pointercancel', stop);
            button.addEventListener('lostpointercapture', stop);
            button.addEventListener('contextmenu', event => event.preventDefault());
        });
    }

    // Tap the board to rotate, swipe sideways to move, swipe down to drop.
    bindBoardGestures(canvas, columns) {
        let start = null;
        canvas.addEventListener('pointerdown', event => {
            start = { x: event.clientX, y: event.clientY, time: performance.now() };
        });
        canvas.addEventListener('pointerup', event => {
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            const cellWidth = canvas.getBoundingClientRect().width / columns;
            start = null;
            if (dy > cellWidth * 2.5 && Math.abs(dy) > Math.abs(dx)) {
                this.perform('hardDrop');
            } else if (Math.abs(dx) > cellWidth * 0.8) {
                const steps = Math.round(dx / cellWidth);
                for (let i = 0; i < Math.abs(steps); i++) this.perform(steps > 0 ? 'right' : 'left');
            } else {
                this.perform('tap');
            }
        });
        canvas.addEventListener('pointercancel', () => { start = null; });
    }
}
