// The cut-out itself, with no page attached: colour keying with a soft edge.
// Every pixel's alpha comes from its distance (in RGB) to the nearest key
// colour: closer than `tolerance` is fully transparent, farther than
// `tolerance + softness` stays opaque, in between it fades.

const MAX_DISTANCE = Math.sqrt(3 * 255 * 255);

// Distance from a pixel to the nearest key colour, and which colour that was.
function nearestKey(r, g, b, keys) {
    let best = Infinity;
    let index = 0;
    for (let k = 0; k < keys.length; k++) {
        const dr = r - keys[k][0];
        const dg = g - keys[k][1];
        const db = b - keys[k][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < best) {
            best = d;
            index = k;
        }
    }
    return { distance: Math.sqrt(best), index };
}

// Marks the pixels that are background-like AND connected to the image border,
// so matching colours inside the subject (white eyes, a white shirt) survive.
function edgeConnected(width, height, isCandidate) {
    const reached = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;
    const visit = (i) => {
        if (!reached[i] && isCandidate[i]) {
            reached[i] = 1;
            queue[tail++] = i;
        }
    };
    for (let x = 0; x < width; x++) {
        visit(x);
        visit((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
        visit(y * width);
        visit(y * width + width - 1);
    }
    while (head < tail) {
        const i = queue[head++];
        const x = i % width;
        if (x > 0) visit(i - 1);
        if (x < width - 1) visit(i + 1);
        if (i >= width) visit(i - width);
        if (i < width * (height - 1)) visit(i + width);
    }
    return reached;
}

/**
 * Removes the key colours from an image.
 * @param {ImageData} source
 * @param {object} options
 * @param {number[][]} options.colors   key colours as [r, g, b]
 * @param {number} options.tolerance    0-1, share of the largest RGB distance
 * @param {number} options.softness     0-1, width of the fade beyond the tolerance
 * @param {boolean} options.edgesOnly   only remove background touching the border
 * @param {boolean} options.despill     un-mix the key colour from fading edge pixels
 * @returns {ImageData}
 */
export function keyImage(source, { colors, tolerance, softness, edgesOnly, despill }) {
    const { width, height, data } = source;
    const out = new ImageData(new Uint8ClampedArray(data), width, height);
    if (!colors.length) return out;

    const tol = tolerance * MAX_DISTANCE;
    const soft = Math.max(1, softness * MAX_DISTANCE);
    const pixels = width * height;
    const distance = new Float32Array(pixels);
    const keyIndex = new Uint8Array(pixels);
    const candidate = new Uint8Array(pixels);

    for (let i = 0, p = 0; i < pixels; i++, p += 4) {
        const near = nearestKey(data[p], data[p + 1], data[p + 2], colors);
        distance[i] = near.distance;
        keyIndex[i] = near.index;
        candidate[i] = near.distance < tol + soft ? 1 : 0;
    }

    const allowed = edgesOnly ? edgeConnected(width, height, candidate) : candidate;
    const o = out.data;

    for (let i = 0, p = 0; i < pixels; i++, p += 4) {
        if (!allowed[i]) continue;
        const keep = Math.min(1, Math.max(0, (distance[i] - tol) / soft));
        if (despill && keep > 0 && keep < 1) {
            // The pixel is a mix of subject and background: take the background back out.
            const key = colors[keyIndex[i]];
            o[p] = (o[p] - key[0] * (1 - keep)) / keep;
            o[p + 1] = (o[p + 1] - key[1] * (1 - keep)) / keep;
            o[p + 2] = (o[p + 2] - key[2] * (1 - keep)) / keep;
        }
        o[p + 3] = Math.round(o[p + 3] * keep);
    }
    return out;
}

/**
 * Suggests key colours from the image border: the four corners and the middle
 * of each side, merged when they are close to each other.
 * @returns {number[][]} up to three colours
 */
export function suggestKeyColors(source, mergeDistance = 40) {
    const { width, height, data } = source;
    const at = (x, y) => {
        const p = (Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))) * 4;
        return [data[p], data[p + 1], data[p + 2]];
    };
    const inset = Math.max(1, Math.round(Math.min(width, height) * 0.01));
    const samples = [
        at(inset, inset), at(width - 1 - inset, inset), at(inset, height - 1 - inset), at(width - 1 - inset, height - 1 - inset),
        at(width >> 1, inset), at(width >> 1, height - 1 - inset), at(inset, height >> 1), at(width - 1 - inset, height >> 1),
    ];
    const picked = [];
    samples.forEach((color) => {
        const close = picked.some((c) => Math.hypot(c[0] - color[0], c[1] - color[1], c[2] - color[2]) < mergeDistance);
        if (!close) picked.push(color);
    });
    return picked.slice(0, 3);
}

/** The smallest rectangle holding every pixel that is not fully transparent. */
export function opaqueBounds(image) {
    const { width, height, data } = image;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
