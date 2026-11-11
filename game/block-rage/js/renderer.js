// Draws the well, the falling piece, its ghost, the hold and next boxes,
// and short-lived effects (line flashes, ember particles, rage burn).

import { COLS, ROWS, HIDDEN_ROWS, NEXT_PREVIEW_COUNT, RAGE_BURN_ROWS } from './config.js';
import { PIECE_COLORS, shapeOf } from './pieces.js';

const CELL = 32;
const PREVIEW_CELL = 18;
const EMBER_COLORS = ['#ffd166', '#ff8a4d', '#ff6136', '#ffb347'];

function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
    } else {
        ctx.rect(x, y, width, height);
    }
}

function drawBlock(ctx, x, y, size, color, alpha = 1) {
    const inset = Math.max(1, size * 0.05);
    const radius = size * 0.18;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    roundedRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
    ctx.fill();
    const shade = ctx.createLinearGradient(0, y, 0, y + size);
    shade.addColorStop(0, 'rgba(255,255,255,0.38)');
    shade.addColorStop(0.42, 'rgba(255,255,255,0.06)');
    shade.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawGhost(ctx, x, y, size, color) {
    const inset = size * 0.1;
    roundedRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, size * 0.16);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function readThemeColor(name, fallback) {
    const value = getComputedStyle(document.body).getPropertyValue(name).trim();
    return value || fallback;
}

export class Renderer {
    constructor({ boardCanvas, holdCanvas, nextCanvas }) {
        this.boardCanvas = boardCanvas;
        this.holdCanvas = holdCanvas;
        this.nextCanvas = nextCanvas;
        this.showGhost = true;
        this.flashes = [];
        this.particles = [];
        this.rageBurn = null;
        this.shake = 0;
        this.theme = {};
        this.refreshTheme();
        this.resize();
    }

    refreshTheme() {
        this.theme = {
            accent: readThemeColor('--tool-accent', '#ff8a4d'),
            line: readThemeColor('--tool-line', 'rgba(255,180,128,0.18)')
        };
    }

    resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        this.ratio = ratio;
        this.setupCanvas(this.boardCanvas, COLS * CELL, ROWS * CELL, ratio);
        this.setupCanvas(this.holdCanvas, PREVIEW_CELL * 5, PREVIEW_CELL * 4, ratio);
        this.setupCanvas(this.nextCanvas, PREVIEW_CELL * 5, PREVIEW_CELL * 3.4 * NEXT_PREVIEW_COUNT, ratio);
    }

    setupCanvas(canvas, width, height, ratio) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.dataset.logicalWidth = String(width);
        canvas.dataset.logicalHeight = String(height);
    }

    context(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
        return ctx;
    }

    // ---- effects ----------------------------------------------------------

    addLineClear(gridRows) {
        const now = performance.now();
        gridRows.forEach(gridRow => {
            const row = gridRow - HIDDEN_ROWS;
            this.flashes.push({ row, start: now, duration: 260 });
            for (let i = 0; i < 14; i++) this.spawnEmber((Math.random() * COLS) * CELL, (row + 0.5) * CELL, 1);
        });
        this.shake = Math.max(this.shake, gridRows.length >= 4 ? 7 : 2);
    }

    addRageBurn() {
        this.rageBurn = { start: performance.now(), duration: 520 };
        for (let i = 0; i < 70; i++) {
            const y = (ROWS - Math.random() * RAGE_BURN_ROWS) * CELL;
            this.spawnEmber(Math.random() * COLS * CELL, y, 1.8);
        }
        this.shake = 10;
    }

    addHardDrop() {
        this.shake = Math.max(this.shake, 2.5);
    }

    spawnEmber(x, y, power) {
        this.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 160 * power,
            vy: (-60 - Math.random() * 220) * power,
            life: 0,
            maxLife: 500 + Math.random() * 500,
            size: 2 + Math.random() * 3,
            color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)]
        });
    }

    stepEffects(deltaMs) {
        const seconds = deltaMs / 1000;
        this.particles = this.particles.filter(p => {
            p.life += deltaMs;
            p.x += p.vx * seconds;
            p.y += p.vy * seconds;
            p.vy += 420 * seconds;
            return p.life < p.maxLife;
        });
        this.shake = Math.max(0, this.shake - deltaMs * 0.03);
    }

    // ---- drawing ----------------------------------------------------------

    draw(game, deltaMs) {
        this.stepEffects(deltaMs);
        this.drawBoard(game);
        this.drawHold(game);
        this.drawNext(game);
    }

    drawBoard(game) {
        const ctx = this.context(this.boardCanvas);
        const width = COLS * CELL;
        const height = ROWS * CELL;
        const now = performance.now();

        ctx.save();
        ctx.clearRect(0, 0, width, height);
        if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);

        this.drawWell(ctx, width, height, game);

        // Locked blocks (only the visible rows).
        for (let r = HIDDEN_ROWS; r < game.board.rows; r++) {
            game.board.grid[r].forEach((type, c) => {
                if (type) drawBlock(ctx, c * CELL, (r - HIDDEN_ROWS) * CELL, CELL, PIECE_COLORS[type]);
            });
        }

        if (game.active) {
            const piece = game.active;
            const color = PIECE_COLORS[piece.type];
            if (this.showGhost && game.state === 'playing') {
                const ghostY = game.ghostY();
                if (ghostY !== piece.y) this.eachCell(piece.matrix, piece.x, ghostY, (x, y) => drawGhost(ctx, x, y, CELL, color));
            }
            this.eachCell(piece.matrix, piece.x, piece.y, (x, y) => drawBlock(ctx, x, y, CELL, color));
        }

        this.drawFlashes(ctx, width, now);
        this.drawRageBurn(ctx, width, height, now);
        this.drawParticles(ctx);
        ctx.restore();
    }

    drawWell(ctx, width, height, game) {
        ctx.fillStyle = 'rgba(8, 6, 6, 0.86)';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = this.theme.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 1; c < COLS; c++) {
            ctx.moveTo(c * CELL + 0.5, 0);
            ctx.lineTo(c * CELL + 0.5, height);
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.moveTo(0, r * CELL + 0.5);
            ctx.lineTo(width, r * CELL + 0.5);
        }
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Red glow at the top when the stack gets dangerously high.
        const danger = Math.max(0, (game.board.stackHeight() - HIDDEN_ROWS - ROWS * 0.6) / (ROWS * 0.4));
        if (danger > 0) {
            const glow = ctx.createLinearGradient(0, 0, 0, height * 0.45);
            glow.addColorStop(0, `rgba(255, 60, 40, ${0.38 * danger})`);
            glow.addColorStop(1, 'rgba(255, 60, 40, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height * 0.45);
        }
    }

    drawFlashes(ctx, width, now) {
        this.flashes = this.flashes.filter(flash => {
            const t = (now - flash.start) / flash.duration;
            if (t >= 1) return false;
            ctx.globalAlpha = 0.85 * (1 - t);
            ctx.fillStyle = '#fff3e0';
            ctx.fillRect(0, flash.row * CELL, width, CELL);
            ctx.globalAlpha = 1;
            return true;
        });
    }

    drawRageBurn(ctx, width, height, now) {
        if (!this.rageBurn) return;
        const t = (now - this.rageBurn.start) / this.rageBurn.duration;
        if (t >= 1) {
            this.rageBurn = null;
            return;
        }
        const flameHeight = height * (0.25 + 0.35 * Math.sin(t * Math.PI));
        const flame = ctx.createLinearGradient(0, height, 0, height - flameHeight);
        flame.addColorStop(0, `rgba(255, 210, 120, ${0.9 * (1 - t)})`);
        flame.addColorStop(0.4, `rgba(255, 97, 54, ${0.7 * (1 - t)})`);
        flame.addColorStop(1, 'rgba(255, 60, 40, 0)');
        ctx.fillStyle = flame;
        ctx.fillRect(0, height - flameHeight, width, flameHeight);
    }

    drawParticles(ctx) {
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1;
    }

    eachCell(matrix, originX, originY, draw) {
        matrix.forEach((row, r) => row.forEach((filled, c) => {
            const visibleRow = originY + r - HIDDEN_ROWS;
            if (filled && visibleRow >= 0) draw((originX + c) * CELL, visibleRow * CELL);
        }));
    }

    drawPreview(ctx, type, centerX, centerY, alpha) {
        const shape = shapeOf(type);
        const cells = [];
        shape.forEach((row, r) => row.forEach((filled, c) => { if (filled) cells.push([c, r]); }));
        const xs = cells.map(([c]) => c);
        const ys = cells.map(([, r]) => r);
        const widthCells = Math.max(...xs) - Math.min(...xs) + 1;
        const heightCells = Math.max(...ys) - Math.min(...ys) + 1;
        const offsetX = centerX - (widthCells * PREVIEW_CELL) / 2 - Math.min(...xs) * PREVIEW_CELL;
        const offsetY = centerY - (heightCells * PREVIEW_CELL) / 2 - Math.min(...ys) * PREVIEW_CELL;
        cells.forEach(([c, r]) => drawBlock(ctx, offsetX + c * PREVIEW_CELL, offsetY + r * PREVIEW_CELL, PREVIEW_CELL, PIECE_COLORS[type], alpha));
    }

    drawHold(game) {
        const ctx = this.context(this.holdCanvas);
        const width = Number(this.holdCanvas.dataset.logicalWidth);
        const height = Number(this.holdCanvas.dataset.logicalHeight);
        ctx.clearRect(0, 0, width, height);
        if (game.holdType) this.drawPreview(ctx, game.holdType, width / 2, height / 2, game.canHold ? 1 : 0.35);
    }

    drawNext(game) {
        const ctx = this.context(this.nextCanvas);
        const width = Number(this.nextCanvas.dataset.logicalWidth);
        const height = Number(this.nextCanvas.dataset.logicalHeight);
        ctx.clearRect(0, 0, width, height);
        const slot = height / NEXT_PREVIEW_COUNT;
        game.queue.slice(0, NEXT_PREVIEW_COUNT).forEach((type, index) => {
            this.drawPreview(ctx, type, width / 2, slot * index + slot / 2, index === 0 ? 1 : 0.7);
        });
    }
}
