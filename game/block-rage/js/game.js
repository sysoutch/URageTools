// Game rules and state. Has no DOM access: main.js feeds it input and
// time, the renderer reads its state, and it reports what happened
// through onEvent so sound and effects can react.

import {
    COLS, ROWS, HIDDEN_ROWS, QUEUE_SIZE,
    LOCK_DELAY_MS, MAX_LOCK_RESETS,
    LINES_PER_LEVEL, LINE_SCORES, COMBO_BONUS, SOFT_DROP_POINTS, HARD_DROP_POINTS,
    RAGE_MAX, RAGE_PER_LINE, RAGE_QUAD_BONUS, RAGE_BURN_ROWS, RAGE_BURN_POINTS_PER_ROW,
    gravityIntervalMs
} from './config.js';
import { Board } from './board.js';
import { PieceBag, KICKS, createPiece, rotateMatrix, firstFilledRow } from './pieces.js';

export class Game {
    constructor(onEvent = () => {}) {
        this.onEvent = onEvent;
        this.reset();
    }

    reset() {
        this.board = new Board(COLS, ROWS + HIDDEN_ROWS);
        this.bag = new PieceBag();
        this.queue = [];
        this.fillQueue();
        this.active = null;
        this.holdType = null;
        this.canHold = true;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.rage = 0;
        this.combo = -1;
        this.state = 'ready';
        this.gravityClock = 0;
        this.lockClock = 0;
        this.lockResets = 0;
    }

    start() {
        this.reset();
        this.state = 'playing';
        this.emit('start');
        this.spawn();
    }

    emit(type, detail = {}) {
        this.onEvent({ type, ...detail });
    }

    fillQueue() {
        while (this.queue.length < QUEUE_SIZE) this.queue.push(this.bag.next());
    }

    get isPlaying() {
        return this.state === 'playing' && this.active !== null;
    }

    get rageReady() {
        return this.rage >= RAGE_MAX;
    }

    // ---- piece lifecycle -------------------------------------------------

    spawn(type = null) {
        const nextType = type ?? this.queue.shift();
        this.fillQueue();
        const piece = createPiece(nextType);
        piece.x = Math.floor((COLS - piece.matrix.length) / 2);
        piece.y = HIDDEN_ROWS - firstFilledRow(piece.matrix);
        this.active = piece;
        this.gravityClock = 0;
        this.lockClock = 0;
        this.lockResets = 0;

        // Blocked spawn: try lifting into the hidden rows before giving up.
        for (let lift = 0; lift <= HIDDEN_ROWS; lift++) {
            if (!this.collides(piece, 0, -lift)) {
                piece.y -= lift;
                return;
            }
        }
        this.gameOver();
    }

    lock() {
        const piece = this.active;
        this.board.merge(piece.matrix, piece.x, piece.y, piece.type);
        this.active = null;
        if (this.board.hasBlocksAbove(HIDDEN_ROWS)) {
            this.gameOver();
            return;
        }
        const rows = this.board.clearFullRows();
        this.emit('lock', { cleared: rows.length });
        this.scoreClear(rows);
        this.canHold = true;
        this.spawn();
    }

    scoreClear(rows) {
        const count = rows.length;
        if (count === 0) {
            this.combo = -1;
            return;
        }
        this.combo += 1;
        const points = (LINE_SCORES[count] + this.combo * COMBO_BONUS) * this.level;
        this.score += points;
        this.lines += count;
        this.rage = Math.min(RAGE_MAX, this.rage + count * RAGE_PER_LINE + (count === 4 ? RAGE_QUAD_BONUS : 0));
        this.emit('clear', { rows, count, points, combo: this.combo });

        const level = 1 + Math.floor(this.lines / LINES_PER_LEVEL);
        if (level > this.level) {
            this.level = level;
            this.emit('level', { level });
        }
    }

    gameOver() {
        this.state = 'over';
        this.active = null;
        this.emit('over', { score: this.score });
    }

    // ---- player actions ---------------------------------------------------

    collides(piece, dx = 0, dy = 0, matrix = piece.matrix) {
        return this.board.collides(matrix, piece.x + dx, piece.y + dy);
    }

    isGrounded() {
        return this.collides(this.active, 0, 1);
    }

    move(dx) {
        if (!this.isPlaying || this.collides(this.active, dx, 0)) return false;
        this.active.x += dx;
        this.extendLockDelay();
        this.emit('move');
        return true;
    }

    rotate(direction) {
        if (!this.isPlaying || this.active.type === 'O') return false;
        const matrix = rotateMatrix(this.active.matrix, direction);
        for (const [kx, ky] of KICKS) {
            if (!this.collides(this.active, kx, ky, matrix)) {
                this.active.matrix = matrix;
                this.active.x += kx;
                this.active.y += ky;
                this.extendLockDelay();
                this.emit('rotate');
                return true;
            }
        }
        return false;
    }

    // Moving or rotating on the ground buys a little more time, but only a
    // limited number of times so a piece cannot stall forever.
    extendLockDelay() {
        if (this.isGrounded() && this.lockResets < MAX_LOCK_RESETS) {
            this.lockClock = 0;
            this.lockResets += 1;
        }
    }

    softDrop() {
        if (!this.isPlaying || this.isGrounded()) return false;
        this.active.y += 1;
        this.score += SOFT_DROP_POINTS;
        this.gravityClock = 0;
        return true;
    }

    hardDrop() {
        if (!this.isPlaying) return;
        const distance = this.ghostY() - this.active.y;
        this.active.y += distance;
        this.score += distance * HARD_DROP_POINTS;
        this.emit('drop', { distance });
        this.lock();
    }

    hold() {
        if (!this.isPlaying || !this.canHold) return;
        const current = this.active.type;
        const swap = this.holdType;
        this.holdType = current;
        this.canHold = false;
        this.emit('hold');
        this.spawn(swap);
    }

    unleashRage() {
        if (!this.isPlaying || !this.rageReady) return false;
        const burnedRows = this.board.burnBottom(RAGE_BURN_ROWS);
        const points = burnedRows * RAGE_BURN_POINTS_PER_ROW * this.level;
        this.score += points;
        this.rage = 0;
        // Overhanging blocks shift down with the stack; lift the piece clear.
        while (this.collides(this.active) && this.active.y > 0) this.active.y -= 1;
        this.emit('rage', { rows: RAGE_BURN_ROWS, points });
        return true;
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.emit('pause');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.emit('resume');
        }
    }

    pause() {
        if (this.state === 'playing') this.togglePause();
    }

    ghostY() {
        let y = this.active.y;
        while (!this.board.collides(this.active.matrix, this.active.x, y + 1)) y += 1;
        return y;
    }

    // ---- time -------------------------------------------------------------

    update(deltaMs) {
        if (!this.isPlaying) return;
        if (this.isGrounded()) {
            this.lockClock += deltaMs;
            if (this.lockClock >= LOCK_DELAY_MS) this.lock();
            return;
        }
        this.lockClock = 0;
        this.gravityClock += deltaMs;
        const interval = gravityIntervalMs(this.level);
        while (this.gravityClock >= interval) {
            this.gravityClock -= interval;
            if (this.isGrounded()) break;
            this.active.y += 1;
        }
    }
}
