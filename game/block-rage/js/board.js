// The well: a grid of cells holding a piece type, or null when empty.
// Row 0 is the top (inside the hidden spawn rows).

export class Board {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.grid = Array.from({ length: rows }, () => this.emptyRow());
    }

    emptyRow() {
        return Array(this.cols).fill(null);
    }

    collides(matrix, x, y) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (!matrix[r][c]) continue;
                const bx = x + c;
                const by = y + r;
                if (bx < 0 || bx >= this.cols || by >= this.rows) return true;
                if (by >= 0 && this.grid[by][bx]) return true;
            }
        }
        return false;
    }

    merge(matrix, x, y, type) {
        matrix.forEach((row, r) => row.forEach((filled, c) => {
            const by = y + r;
            if (filled && by >= 0) this.grid[by][x + c] = type;
        }));
    }

    // Removes full rows and returns their indexes (before removal).
    clearFullRows() {
        const full = [];
        this.grid.forEach((row, index) => {
            if (row.every(Boolean)) full.push(index);
        });
        if (full.length > 0) {
            this.grid = this.grid.filter((_, index) => !full.includes(index));
            this.refillTop();
        }
        return full;
    }

    // Burns the bottom rows away. Returns how many of them held blocks.
    burnBottom(count) {
        const removed = this.grid.splice(this.rows - count, count);
        this.refillTop();
        return removed.filter(row => row.some(Boolean)).length;
    }

    refillTop() {
        while (this.grid.length < this.rows) this.grid.unshift(this.emptyRow());
    }

    hasBlocksAbove(rowIndex) {
        for (let r = 0; r < rowIndex; r++) {
            if (this.grid[r].some(Boolean)) return true;
        }
        return false;
    }

    // Height of the stack in rows, used for the danger glow.
    stackHeight() {
        const top = this.grid.findIndex(row => row.some(Boolean));
        return top < 0 ? 0 : this.rows - top;
    }
}
