// The seven four-cell pieces, their colours, rotation and a bag randomiser
// that deals every piece once per round of seven.

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
};

// An ember palette that stays readable on the dark fire theme.
export const PIECE_COLORS = {
    I: '#ffb347',
    O: '#ffd166',
    T: '#ef476f',
    S: '#2ec4a6',
    Z: '#ff6b35',
    J: '#4cc9f0',
    L: '#b388ff'
};

// Offsets tried in order when a rotation collides (stay, sideways, up).
export const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];

export function createPiece(type) {
    return { type, matrix: SHAPES[type].map(row => row.slice()), x: 0, y: 0 };
}

export function shapeOf(type) {
    return SHAPES[type];
}

// direction 1 = clockwise, -1 = counter-clockwise.
export function rotateMatrix(matrix, direction) {
    const size = matrix.length;
    return matrix.map((row, y) => row.map((_, x) => (
        direction > 0 ? matrix[size - 1 - x][y] : matrix[x][size - 1 - y]
    )));
}

export function firstFilledRow(matrix) {
    const index = matrix.findIndex(row => row.some(Boolean));
    return index < 0 ? 0 : index;
}

export class PieceBag {
    constructor(random = Math.random) {
        this.random = random;
        this.pool = [];
    }

    next() {
        if (this.pool.length === 0) this.pool = this.shuffled();
        return this.pool.pop();
    }

    shuffled() {
        const pieces = PIECE_TYPES.slice();
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        return pieces;
    }
}
