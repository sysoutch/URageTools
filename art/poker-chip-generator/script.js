/* =========================================================
   PIXEL POKER CHIP GENERATOR
   ========================================================= */

const STANDARD_VALUES = [
    "$1", "$5", "$25", "$100",
    "$500", "$1K", "$5K", "$25K"
];

const MONEY_VALUES = [
    "$1", "$5", "$10", "$20",
    "$50", "$100", "$500", "$1K"
];

const CASINO_VALUES = [
    "1", "5", "25", "100",
    "500", "1K", "5K", "10K"
];

const RANDOM_VALUES = [
    "1", "5", "10", "25",
    "50", "100", "250", "500",
    "1K", "5K", "10K", "25K"
];

const PALETTES = {
    classic: [
        ["#d92c3d", "#7e1321", "#f5e6c8"],
        ["#2474d9", "#103c76", "#f3e6c7"],
        ["#2fa35b", "#135d32", "#f1e8d0"],
        ["#eee8d5", "#aaa17e", "#17191d"],
        ["#b738d8", "#59127a", "#f4dfff"]
    ],

    neon: [
        ["#ff246f", "#65002d", "#00ffd5"],
        ["#00eaff", "#00445a", "#fffb00"],
        ["#8b5cff", "#28136d", "#ff55e9"],
        ["#4cff36", "#135d0b", "#00ffff"]
    ],

    arcade: [
        ["#ef3e2e", "#68170f", "#f9d94c"],
        ["#3155ff", "#15216d", "#ffcf35"],
        ["#20c997", "#075743", "#fff16b"],
        ["#f58a24", "#73350a", "#fff4ce"]
    ],

    royal: [
        ["#671bc2", "#26065c", "#f5cf54"],
        ["#b11d43", "#500819", "#f7d66a"],
        ["#075c75", "#032f3c", "#e7ce75"],
        ["#14204f", "#080e27", "#e3bd53"]
    ],

    cyber: [
        ["#e900ff", "#45004c", "#00f7ff"],
        ["#00f0ff", "#003c4a", "#ff00a8"],
        ["#72ff00", "#163900", "#00eaff"],
        ["#ff6a00", "#5b2100", "#ffe600"]
    ],

    mono: [
        ["#d8d8d8", "#505050", "#ffffff"],
        ["#999999", "#282828", "#eeeeee"],
        ["#eeeeee", "#606060", "#111111"]
    ],

    gold: [
        ["#d69b18", "#69470b", "#fff0a3"],
        ["#e3b53a", "#76550e", "#fff5b8"],
        ["#bc7e0c", "#513400", "#ffe58a"]
    ]
};

let chips = [];
let globalSeed = "";

/* Triads extracted from an uploaded image (empty = off) */
let customPalette = [];

/* =========================================================
   SEEDED RANDOM
   ========================================================= */

function hashString(str) {
    let h = 2166136261;

    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) +
             (h << 8) + (h << 24);
    }

    return h >>> 0;
}

function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;

        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);

        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function randomSeed() {
    globalSeed =
        Math.random().toString(36).substring(2) +
        Date.now().toString(36);

    document.getElementById("seed").value = globalSeed;
    generateAll();
}

/* =========================================================
   UTILITIES
   ========================================================= */

function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}

function hexToRgb(hex) {
    hex = hex.replace("#", "");

    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
    };
}

function shade(hex, amount) {
    const c = hexToRgb(hex);

    c.r = Math.max(0, Math.min(255, c.r + amount));
    c.g = Math.max(0, Math.min(255, c.g + amount));
    c.b = Math.max(0, Math.min(255, c.b + amount));

    return `rgb(${c.r},${c.g},${c.b})`;
}

function getValues() {
    const mode = document.getElementById("values").value;

    if (mode === "money") return MONEY_VALUES;
    if (mode === "casino") return CASINO_VALUES;
    if (mode === "random") return RANDOM_VALUES;

    return STANDARD_VALUES;
}

/* =========================================================
   CHIP GENERATION
   ========================================================= */

function createChip(index, seedOverride = null) {

    const styleChoice = document.getElementById("style").value;
    const patternChoice = document.getElementById("pattern").value;

    const seed =
        (seedOverride || globalSeed || "pixelcasino") +
        "|" + index;

    const rng = mulberry32(hashString(seed));

    let style = styleChoice;

    if (style === "random") {
        style = pick(rng, [
            "classic",
            "neon",
            "arcade",
            "royal",
            "cyber",
            "mono",
            "gold"
        ]);
    }

    /* Image palette (if active) overrides the style palettes */
    const palette = customPalette.length
        ? pick(rng, customPalette)
        : pick(rng, PALETTES[style]);

    let pattern = patternChoice;

    if (pattern === "random") {
        pattern = pick(rng, [
            "dots",
            "diamonds",
            "stars",
            "bars",
            "cross",
            "none"
        ]);
    }

    const values = getValues();

    const value = pick(rng, values);

    const chip = {
        index,
        seed,
        rng,
        style,
        pattern,
        base: palette[0],
        dark: palette[1],
        accent: palette[2],
        value,
        /* even count keeps the edge marks mirrored on both axes */
        notches: 8 + 2 * Math.floor(rng() * 3),
        innerRing: rng() > .25,
        stars: rng() > .6,
        borderPixels: rng() > .5
    };

    return chip;
}

/* =========================================================
   DRAW CHIP
   ========================================================= */

function drawChip(canvas, chip) {

    const size = parseInt(
        document.getElementById("resolution").value
    );

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, size, size);

    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);

    const fm = chipFaceMetrics(chip, size);

    /* rim — the chip side visible from directly above */
    ctx.fillStyle = chip.dark;
    circle(ctx, cx, cy, fm.R);

    /* base face — flat, no lighting */
    ctx.fillStyle = chip.base;
    circle(ctx, cx, cy, fm.R - 2);

    /* edge notches */
    drawNotches(ctx, chip, cx, cy, fm.R);

    /* outer ring */
    ctx.strokeStyle = chip.accent;
    ctx.lineWidth = fm.outerStroke;

    circleStroke(
        ctx,
        cx,
        cy,
        fm.outerR
    );

    /* pattern */
    drawPattern(
        ctx,
        chip,
        cx,
        cy,
        Math.floor(fm.R * .78),
        size
    );

    if (fm.discR > 0) {

        /* center disc — flat base color */
        ctx.fillStyle = chip.base;

        circle(ctx, cx, cy, fm.discR);

        /* center ring */
        ctx.strokeStyle = chip.accent;
        ctx.lineWidth = fm.ringStroke;

        circleStroke(
            ctx,
            cx,
            cy,
            fm.ringR
        );
    }

    /* value */
    drawPixelText(
        ctx,
        chip.value,
        cx,
        cy,
        chip.accent,
        size,
        fm.scale
    );

    /* k-means palette quantization */
    chip.palette = quantizeChip(canvas, chip);

    /* enforce pixel-exact mirror symmetry on both axes — the value
       text is masked out so the denomination stays readable */
    symmetrize(
        canvas,
        "xy",
        valueTextMask(size, size, tctx => drawPixelText(
            tctx,
            chip.value,
            cx,
            cy,
            "#fff",
            size,
            fm.scale
        ))
    );
}

/* =========================================================
   PERSPECTIVE VIEWS — diagonal front + dead-front edge-on
   Flat-color 3/4 rendering: no gradients, no lighting.
   The top face is the exact circle from the top view under a
   vertical squash transform; the rim shows the chip's real
   thickness with accent stripes at the notch positions.
   ========================================================= */

function chipMetrics(size) {

    const R = Math.floor(size * .44);

    return {
        size,
        R,
        ry: Math.round(R * .5),
        T: Math.max(3, Math.floor(size * .16))
    };
}

/* face layout that guarantees the value text clears every ring */
function chipFaceMetrics(chip, size) {

    const R = Math.floor(size * .44);

    /* long values drop to the small font so they fit inside the rings */
    const scale = (size >= 60 && chip.value.length <= 3) ? 2 : 1;

    /* value text half-width in px (4px advance per char) */
    const textHalfW = chip.value.length * 2 * scale;

    const outerR = Math.floor(R * .75);
    const outerStroke = Math.max(1, Math.floor(size / 18));
    const ringStroke = Math.max(1, Math.floor(size / 20));

    /* center ring must clear the value text by at least 2px */
    const fitR = textHalfW + 2 + Math.ceil(ringStroke / 2);

    /* ...and stay inside the outer ring with a gap to spare */
    const maxRing =
        outerR -
        Math.ceil(outerStroke / 2) -
        1 -
        Math.ceil(ringStroke / 2);

    if (fitR > maxRing) {

        /* no room for both — drop the center ring; the value stays clear of the outer one */
        return {
            R, scale, textHalfW,
            outerR, outerStroke, ringStroke,
            discR: 0, ringR: 0
        };
    }

    const ringR = Math.min(
        Math.max(fitR, Math.floor(R * .45)),
        maxRing
    );

    return {
        R, scale, textHalfW,
        outerR, outerStroke, ringStroke,
        discR: ringR + Math.ceil(ringStroke / 2) + 1,
        ringR
    };
}

function drawChipFace(ctx, chip, cx, cy, R, size) {

    const fm = chipFaceMetrics(chip, size);

    /* base face — flat, no lighting */
    ctx.fillStyle = chip.base;

    circle(ctx, cx, cy, R);

    /* outer ring */
    ctx.strokeStyle = chip.accent;
    ctx.lineWidth = fm.outerStroke;

    circleStroke(ctx, cx, cy, fm.outerR);

    /* pattern */
    drawPattern(ctx, chip, cx, cy, Math.floor(R * .78), size);

    if (fm.discR > 0) {

        /* center disc — flat base color */
        ctx.fillStyle = chip.base;

        circle(ctx, cx, cy, fm.discR);

        /* center ring */
        ctx.strokeStyle = chip.accent;
        ctx.lineWidth = fm.ringStroke;

        circleStroke(ctx, cx, cy, fm.ringR);
    }

    /* value */
    drawPixelText(ctx, chip.value, cx, cy, chip.accent, size, fm.scale);
}

function drawChipDiagonal(canvas, chip) {

    const size = parseInt(
        document.getElementById("resolution").value
    );

    const m = chipMetrics(size);

    canvas.width = m.size;
    canvas.height = m.ry * 2 + m.T;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, m.size, canvas.height);

    const cx = Math.floor(m.size / 2);
    const cyTop = m.ry;

    /* side wall — front half of the rim */
    ctx.fillStyle = chip.dark;

    ctx.beginPath();

    ctx.moveTo(cx - m.R, cyTop);

    ctx.ellipse(
        cx, cyTop, m.R, m.ry, 0,
        Math.PI, 0, true
    );

    ctx.lineTo(cx + m.R, cyTop + m.T);

    ctx.ellipse(
        cx, cyTop + m.T, m.R, m.ry, 0,
        0, Math.PI, false
    );

    ctx.closePath();
    ctx.fill();

    /* edge stripes on the visible rim — exact mirror pairs */
    const stripe = notchLength(chip, m.R);

    if (stripe > 0) {

        for (let i = 0; i <= chip.notches / 4; i++) {

            const a = Math.PI * 2 * i / chip.notches;

            if (Math.sin(a) <= .15) continue;

            ctx.fillStyle = chip.accent;

            const dx = symRound(Math.cos(a) * m.R);
            const dy = Math.round(Math.sin(a) * m.ry);

            if (dx === 0) {
                /* self-mirror center stripe — even width */
                const w = stripe % 2 ? stripe + 1 : stripe;
                ctx.fillRect(cx - w / 2, cyTop + dy, w, m.T);
            } else {
                /* odd width centered on the notch column keeps the
                   mirror pair exact */
                const w = stripe % 2 ? stripe : Math.max(1, stripe - 1);
                const x = cx + dx - (w - 1) / 2;
                ctx.fillRect(x, cyTop + dy, w, m.T);
                ctx.fillRect(m.size - x - w, cyTop + dy, w, m.T);
            }
        }
    }

    const fm = chipFaceMetrics(chip, size);

    /* top face — exact circle under vertical squash */
    ctx.save();

    ctx.translate(cx, cyTop);
    ctx.scale(1, m.ry / m.R);

    drawChipFace(ctx, chip, 0, 0, m.R, size);

    ctx.restore();

    quantizeChip(canvas, chip);

    /* keep the perspective view mirrored on its vertical axis — the
       value text is masked out so it stays readable */
    symmetrize(
        canvas,
        "x",
        valueTextMask(m.size, canvas.height, tctx => {
            tctx.save();
            tctx.translate(cx, cyTop);
            tctx.scale(1, m.ry / m.R);
            drawPixelText(tctx, chip.value, 0, 0, "#fff", size, fm.scale);
            tctx.restore();
        })
    );
}

function drawChipFront(canvas, chip) {

    const size = parseInt(
        document.getElementById("resolution").value
    );

    const m = chipMetrics(size);

    canvas.width = m.size;
    canvas.height = m.T;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, m.size, m.T);

    /* edge slab */
    ctx.fillStyle = chip.dark;

    ctx.fillRect(0, 0, m.size, m.T);

    /* edge stripes facing the viewer — exact mirror pairs */
    const cx = Math.floor(m.size / 2);

    const stripe = notchLength(chip, m.R);

    if (stripe > 0) {

        for (let i = 0; i <= chip.notches / 4; i++) {

            const a = Math.PI * 2 * i / chip.notches;

            if (Math.sin(a) <= .15) continue;

            ctx.fillStyle = chip.accent;

            const dx = symRound(Math.cos(a) * m.R);

            if (dx === 0) {
                /* self-mirror center stripe — even width */
                const w = stripe % 2 ? stripe + 1 : stripe;
                ctx.fillRect(cx - w / 2, 0, w, m.T);
            } else {
                /* odd width centered on the notch column keeps the
                   mirror pair exact */
                const w = stripe % 2 ? stripe : Math.max(1, stripe - 1);
                const x = cx + dx - (w - 1) / 2;
                ctx.fillRect(x, 0, w, m.T);
                ctx.fillRect(m.size - x - w, 0, w, m.T);
            }
        }
    }

    quantizeChip(canvas, chip);

    /* keep the edge-on slab mirrored on its vertical axis */
    symmetrize(canvas, "x");
}

/* =========================================================
   BASIC SHAPES
   ========================================================= */

function circle(ctx, x, y, r) {

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function circleStroke(ctx, x, y, r) {

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
}

/* round half-integers away from zero so mirrored positions stay exact */
function symRound(v) {

    return v >= 0 ? Math.floor(v + .5) : -Math.floor(-v + .5);
}

/* =========================================================
   EDGE NOTCHES
   ========================================================= */

/* tangential length (px) of each edge notch from the slider.
   0 = off; 100% fills the arc slot between two adjacent notches,
   leaving only ~1px of rim between them */
function notchLength(chip, R) {

    const pct = parseInt(
        document.getElementById("notchThickness").value, 10
    );

    if (!pct || pct <= 0) return 0;

    /* chord between two adjacent notch anchors on the R-1 orbit */
    const chord =
        2 * (R - 1) * Math.sin(Math.PI / chip.notches);

    const maxL = Math.max(1, Math.floor(chord) - 1);

    return Math.min(
        maxL,
        Math.max(1, Math.round((pct / 100) * maxL))
    );
}

function drawNotches(ctx, chip, cx, cy, R) {

    const count = chip.notches;

    const len = notchLength(chip, R);

    if (!count || len <= 0) return;

    /* place each notch orbit from a single trig eval so the marks are
       mirrored exactly on both axes — mirror copies use true
       reflections (scale -1), never rotations, so x and y symmetry
       stays pixel-exact */
    const seen = new Set();

    for (let i = 0; i <= count / 4; i++) {

        const a = Math.PI * 2 * i / count;

        const dx = symRound(
            Math.cos(a) * (R - 1)
        );

        const dy = symRound(
            Math.sin(a) * (R - 1)
        );

        for (const [mx, my, sx, sy] of [
            [dx, dy, 1, 1],
            [-dx, dy, -1, 1],
            [dx, -dy, 1, -1],
            [-dx, -dy, -1, -1]
        ]) {

            const key = mx + "," + my;

            if (seen.has(key)) continue;

            seen.add(key);

            ctx.save();

            /* translate → reflect → rotate: local x runs radially,
               local y along the rim */
            ctx.translate(cx + mx, cy + my);
            ctx.scale(sx, sy);
            ctx.rotate(a);

            ctx.fillStyle = chip.accent;

            /* 4px radial band centered on R-1, `len` px wide along
               the rim and centered on the tangent so odd lengths
               stay exactly symmetric */
            ctx.fillRect(
                -2,
                -len / 2,
                4,
                len
            );

            ctx.restore();
        }
    }
}

/* =========================================================
   PATTERNS
   ========================================================= */

function drawPattern(ctx, chip, cx, cy, radius, size) {

    ctx.save();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = chip.accent;

    if (chip.pattern === "dots") {

        const step = 5;
        const max = Math.floor(radius / step) * step;

        for (let dy = -max; dy <= max; dy += step) {

            for (let dx = -max; dx <= max; dx += step) {

                if (dx * dx + dy * dy < radius * radius) {
                    /* shifted half a pixel so each 2x2 dot straddles the
                       mirror axis and every pair lands on exact mirrors */
                    ctx.fillRect(cx + dx - 1, cy + dy - 1, 2, 2);
                }
            }
        }
    }

    else if (chip.pattern === "diamonds") {

        const step = 7;
        const max = Math.floor(radius / step) * step;

        /* anchor on a quarter of the grid and draw each diamond together
           with its exact pixel mirrors so both axes stay symmetric */
        const seen = new Set();

        for (let dy = 0; dy <= max; dy += step) {

            for (let dx = 0; dx <= max; dx += step) {

                if (dx * dx + dy * dy >= radius * radius) continue;

                const x = cx + dx;
                const y = cy + dy;

                for (const [sx, sy] of [
                    [x, y],
                    [size - 1 - x, y],
                    [x, size - 1 - y],
                    [size - 1 - x, size - 1 - y]
                ]) {

                    const key = sx + "," + sy;

                    if (seen.has(key)) continue;

                    seen.add(key);

                    drawDiamond(ctx, sx, sy);
                }
            }
        }
    }

    else if (chip.pattern === "bars") {

        const step = 7;
        const max = Math.floor(radius / step) * step;

        /* even height centered on the mirror axis */
        const y0 = cy - radius + 1;
        const h = radius * 2 - 2;

        for (let dx = 0; dx <= max; dx += step) {

            if (dx === 0) {
                /* self-mirror center bar — even width */
                ctx.fillRect(cx - 1, y0, 2, h);
            } else {
                const x = cx + dx - 1;
                ctx.fillRect(x, y0, 3, h);
                ctx.fillRect(size - x - 3, y0, 3, h);
            }
        }
    }

    else if (chip.pattern === "cross") {

        /* even extents centered on the mirror axis keep both mirrors exact */
        ctx.fillRect(
            cx - radius + 1,
            cy - 1,
            radius * 2 - 2,
            2
        );

        ctx.fillRect(
            cx - 1,
            cy - radius + 1,
            2,
            radius * 2 - 2
        );
    }

    else if (chip.pattern === "stars") {

        const r = radius * .62;

        /* each orbit anchor is drawn with its exact pixel mirrors */
        const seen = new Set();

        for (let i = 0; i <= 3; i++) {

            const a = Math.PI / 6 * i;

            const x = cx + symRound(Math.cos(a) * r);
            const y = cy + symRound(Math.sin(a) * r);

            for (const [sx, sy] of [
                [x, y],
                [size - 1 - x, y],
                [x, size - 1 - y],
                [size - 1 - x, size - 1 - y]
            ]) {

                const key = sx + "," + sy;

                if (seen.has(key)) continue;

                seen.add(key);

                drawStar(ctx, sx, sy, 2);
            }
        }
    }

    ctx.restore();
}

function drawDiamond(ctx, x, y) {

    /* symmetric diamond centered on the grid point */
    ctx.fillRect(x, y - 2, 1, 1);
    ctx.fillRect(x - 1, y - 1, 3, 1);
    ctx.fillRect(x - 2, y, 5, 1);
    ctx.fillRect(x - 1, y + 1, 3, 1);
    ctx.fillRect(x, y + 2, 1, 1);
}

function drawStar(ctx, x, y, r) {

    ctx.fillRect(x - r, y, r * 2 + 1, 1);
    ctx.fillRect(x, y - r, 1, r * 2 + 1);
}

/* =========================================================
   TEXT
   ========================================================= */

const FONT = {
    "0": [
        "111",
        "101",
        "101",
        "101",
        "111"
    ],
    "1": [
        "010",
        "110",
        "010",
        "010",
        "111"
    ],
    "2": [
        "111",
        "001",
        "111",
        "100",
        "111"
    ],
    "3": [
        "111",
        "001",
        "111",
        "001",
        "111"
    ],
    "4": [
        "101",
        "101",
        "111",
        "001",
        "001"
    ],
    "5": [
        "111",
        "100",
        "111",
        "001",
        "111"
    ],
    "6": [
        "111",
        "100",
        "111",
        "101",
        "111"
    ],
    "7": [
        "111",
        "001",
        "010",
        "010",
        "010"
    ],
    "8": [
        "111",
        "101",
        "111",
        "101",
        "111"
    ],
    "9": [
        "111",
        "101",
        "111",
        "001",
        "111"
    ],
    "$": [
        "010",
        "111",
        "100",
        "111",
        "010"
    ],
    "K": [
        "101",
        "110",
        "100",
        "110",
        "101"
    ]
};

function drawPixelText(
    ctx,
    text,
    cx,
    cy,
    color,
    size,
    scale
) {

    text = text.toUpperCase();

    if (!scale) scale = size >= 60 ? 2 : 1;

    const charWidth = 4 * scale;

    const totalWidth =
        text.length * charWidth;

    let startX =
        Math.floor(cx - totalWidth / 2);

    const startY =
        Math.floor(cy - Math.floor(5 * scale / 2));

    ctx.fillStyle = color;

    for (const char of text) {

        const glyph = FONT[char];

        if (!glyph) {
            startX += charWidth;
            continue;
        }

        for (let y = 0; y < glyph.length; y++) {

            for (let x = 0; x < glyph[y].length; x++) {

                if (glyph[y][x] === "1") {

                    ctx.fillRect(
                        startX + x * scale,
                        startY + y * scale,
                        scale,
                        scale
                    );
                }
            }
        }

        startX += charWidth;
    }
}

/* =========================================================
   GENERIC RGB K-MEANS + IMAGE PALETTE TRIADS
   Used by the "Image Palette" feature to cluster an uploaded
   image's colors into 6 centroids and turn them into chip
   triads. Deterministic (fixed seed) per image.
   ========================================================= */

function kmeans(samples, k, rng) {

    if (!samples.length) return [];

    if (samples.length <= k) return samples.map(p => p.slice());

    /* --- k-means++ seeding --- */

    const centroids = [
        samples[Math.floor(rng() * samples.length)].slice()
    ];

    while (centroids.length < k) {

        let total = 0;

        const weights = new Array(samples.length);

        for (let s = 0; s < samples.length; s++) {

            let best = Infinity;

            for (const c of centroids) {
                const dr = samples[s][0] - c[0];
                const dg = samples[s][1] - c[1];
                const db = samples[s][2] - c[2];
                const d = dr * dr + dg * dg + db * db;
                if (d < best) best = d;
            }

            weights[s] = best;
            total += best;
        }

        let t = rng() * total;

        for (let s = 0; s < samples.length; s++) {
            t -= weights[s];
            if (t <= 0) {
                centroids.push(samples[s].slice());
                break;
            }
        }
    }

    /* --- iterate to convergence --- */

    for (let iter = 0; iter < 40; iter++) {

        let changed = false;

        const sums = centroids.map(() => [0, 0, 0, 0]);

        for (const p of samples) {

            let best = Infinity;
            let bi = 0;

            for (let c = 0; c < centroids.length; c++) {
                const dr = p[0] - centroids[c][0];
                const dg = p[1] - centroids[c][1];
                const db = p[2] - centroids[c][2];
                const d = dr * dr + dg * dg + db * db;
                if (d < best) { best = d; bi = c; }
            }

            sums[bi][0] += p[0];
            sums[bi][1] += p[1];
            sums[bi][2] += p[2];
            sums[bi][3]++;
        }

        for (let c = 0; c < centroids.length; c++) {

            if (!sums[c][3]) {
                centroids[c] = samples[Math.floor(rng() * samples.length)].slice();
                changed = true;
                continue;
            }

            const n = sums[c][3];

            const nc = [
                Math.round(sums[c][0] / n),
                Math.round(sums[c][1] / n),
                Math.round(sums[c][2] / n)
            ];

            if (
                nc[0] !== centroids[c][0] ||
                nc[1] !== centroids[c][1] ||
                nc[2] !== centroids[c][2]
            ) changed = true;

            centroids[c] = nc;
        }

        if (!changed) break;
    }

    /* brightest first — used to build base/dark/accent triads */

    centroids.sort((a, b) =>
        (b[0] * .299 + b[1] * .587 + b[2] * .114) -
        (a[0] * .299 + a[1] * .587 + a[2] * .114));

    return centroids;
}

function buildCustomTriads(centroids) {

    const toHex = c =>
        "#" + c.map(v =>
            Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")
        ).join("");

    if (!centroids.length) return [];

    if (centroids.length < 3) {

        const c = centroids[0];

        return [[
            toHex(c),
            toHex([c[0] * .45 | 0, c[1] * .45 | 0, c[2] * .45 | 0]),
            toHex([Math.min(255, c[0] + 90), Math.min(255, c[1] + 90), Math.min(255, c[2] + 90)])
        ]];
    }

    const bright = centroids[0];
    const dark = centroids[centroids.length - 1];

    if (centroids.length < 6) {

        const mid = centroids[Math.floor(centroids.length / 2)];

        return [
            [toHex(bright), toHex(dark), toHex(mid)],
            [toHex(mid), toHex(dark), toHex(bright)]
        ];
    }

    const [c0, c1, c2, c3, c4, c5] = centroids;

    return [
        [toHex(c0), toHex(c5), toHex(c2)],
        [toHex(c1), toHex(c4), toHex(c3)],
        [toHex(c2), toHex(c5), toHex(c0)]
    ];
}

/* =========================================================
   K-MEANS PALETTE QUANTIZATION
   Snaps the anti-aliased chip render to a small flat-color
   palette (k-means++ init, seeded per chip so results are
   reproducible). Returns { used, colors } or null when off.
   ========================================================= */

function quantizeChip(canvas, chip) {

    const k = parseInt(
        document.getElementById("palette").value, 10
    );

    if (!k || k < 2) return null;

    const ctx = canvas.getContext("2d");

    const w = canvas.width;
    const h = canvas.height;

    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;

    /* visible pixels only — drop the invisible AA fringe */
    const samples = [];

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] >= 16) samples.push(i);
    }

    if (!samples.length) return null;

    const rng = mulberry32(hashString(chip.seed + "|kmeans"));

    /* --- k-means++ seeding --- */

    const centroids = [];

    let first = samples[Math.floor(rng() * samples.length)];

    centroids.push([
        data[first], data[first + 1],
        data[first + 2], data[first + 3]
    ]);

    while (centroids.length < k) {

        const weights = new Float64Array(samples.length);
        let total = 0;

        for (let s = 0; s < samples.length; s++) {

            const i = samples[s];
            let best = Infinity;

            for (const c of centroids) {
                const dr = data[i] - c[0];
                const dg = data[i + 1] - c[1];
                const db = data[i + 2] - c[2];
                const da = data[i + 3] - c[3];
                const d = dr * dr + dg * dg + db * db + da * da;
                if (d < best) best = d;
            }

            weights[s] = best;
            total += best;
        }

        let t = rng() * total;
        let picked = samples[0];

        for (let s = 0; s < samples.length; s++) {
            t -= weights[s];
            if (t <= 0) { picked = samples[s]; break; }
        }

        centroids.push([
            data[picked], data[picked + 1],
            data[picked + 2], data[picked + 3]
        ]);
    }

    /* --- iterate to convergence --- */

    for (let iter = 0; iter < 40; iter++) {

        let changed = false;

        const sums = centroids.map(() => [0, 0, 0, 0, 0]);

        for (let s = 0; s < samples.length; s++) {

            const i = samples[s];
            let best = Infinity;
            let bi = 0;

            for (let c = 0; c < centroids.length; c++) {
                const dr = data[i] - centroids[c][0];
                const dg = data[i + 1] - centroids[c][1];
                const db = data[i + 2] - centroids[c][2];
                const da = data[i + 3] - centroids[c][3];
                const d = dr * dr + dg * dg + db * db + da * da;
                if (d < best) { best = d; bi = c; }
            }

            sums[bi][0] += data[i];
            sums[bi][1] += data[i + 1];
            sums[bi][2] += data[i + 2];
            sums[bi][3] += data[i + 3];
            sums[bi][4]++;
        }

        for (let c = 0; c < centroids.length; c++) {

            if (!sums[c][4]) {

                const i = samples[Math.floor(rng() * samples.length)];
                centroids[c] = [
                    data[i], data[i + 1],
                    data[i + 2], data[i + 3]
                ];
                changed = true;
                continue;
            }

            const n = sums[c][4];
            const nc = [
                Math.round(sums[c][0] / n),
                Math.round(sums[c][1] / n),
                Math.round(sums[c][2] / n),
                Math.round(sums[c][3] / n)
            ];

            if (
                nc[0] !== centroids[c][0] ||
                nc[1] !== centroids[c][1] ||
                nc[2] !== centroids[c][2] ||
                nc[3] !== centroids[c][3]
            ) changed = true;

            centroids[c] = nc;
        }

        if (!changed) break;
    }

/* --- remap every pixel to its nearest centroid --- */

    const counts = new Array(centroids.length).fill(0);

    for (let i = 0; i < data.length; i += 4) {

        if (data[i + 3] === 0) continue;

        /* harden the AA fringe into a crisp edge */
        if (data[i + 3] < 16) {
            data[i] = data[i + 1] = data[i + 2] = 0;
            data[i + 3] = 0;
            continue;
        }

        let best = Infinity;
        let bi = 0;

        for (let c = 0; c < centroids.length; c++) {
            const dr = data[i] - centroids[c][0];
            const dg = data[i + 1] - centroids[c][1];
            const db = data[i + 2] - centroids[c][2];
            const da = data[i + 3] - centroids[c][3];
            const d = dr * dr + dg * dg + db * db + da * da;
            if (d < best) { best = d; bi = c; }
        }

        counts[bi]++;

        data[i] = centroids[bi][0];
        data[i + 1] = centroids[bi][1];
        data[i + 2] = centroids[bi][2];
        data[i + 3] = centroids[bi][3];
    }

    ctx.putImageData(img, 0, 0);

    /* palette report — used colors, most pixels first */

    const colors = [];

    for (let c = 0; c < centroids.length; c++) {
        if (!counts[c]) continue;
        colors.push({
            r: centroids[c][0],
            g: centroids[c][1],
            b: centroids[c][2],
            a: centroids[c][3],
            count: counts[c]
        });
    }

    colors.sort((a, b) => b.count - a.count);

    return { used: colors.length, colors };
}

/* =========================================================
   PALETTE UI HELPERS
   ========================================================= */

/* =========================================================
    MIRROR SYMMETRIZATION
    Guarantees the finished chip is mirrored pixel-exactly on its
    axes: every pixel becomes identical to its mirror partners.
    Runs after quantization so anti-aliased fringe and palette
    snapping can never break the symmetry. The more opaque pixel
    of each pair wins, keeping flat colors flat and edges crisp.
    The value text is excluded via an alpha mask — it must stay
    readable, never mirrored.
    ========================================================= */

/* render the chip's value text to an offscreen buffer so that
   symmetrize() can skip those pixels; `draw` receives a 2d ctx of
   exactly w x h and draws the text (with any transforms) opaque */
function valueTextMask(w, h, draw) {

    const tmp = document.createElement("canvas");

    tmp.width = w;
    tmp.height = h;

    const tctx = tmp.getContext(
        "2d",
        { willReadFrequently: true }
    );

    tctx.imageSmoothingEnabled = false;

    draw(tctx);

    return tctx.getImageData(0, 0, w, h).data;
}

function symmetrize(canvas, axes, mask) {

    const w = canvas.width;
    const h = canvas.height;

    if (axes.includes("x") && w % 2) return;
    if (axes.includes("y") && h % 2) return;

    const ctx = canvas.getContext("2d");

    const img = ctx.getImageData(0, 0, w, h);

    const d = img.data;

    const idx = (x, y) => (y * w + x) << 2;

    const mergePair = (a, b) => {

        /* never mirror the value text — keep it readable */
        if (mask && (mask[a + 3] > 0 || mask[b + 3] > 0)) return;

        if (d[a + 3] >= d[b + 3]) {
            d[b] = d[a];
            d[b + 1] = d[a + 1];
            d[b + 2] = d[a + 2];
            d[b + 3] = d[a + 3];
        } else {
            d[a] = d[b];
            d[a + 1] = d[b + 1];
            d[a + 2] = d[b + 2];
            d[a + 3] = d[b + 3];
        }
    };

    /* mirror about the horizontal axis: row y <-> h-1-y */
    if (axes.includes("y")) {

        for (let y = 0; y < h / 2; y++) {

            const y2 = h - 1 - y;

            for (let x = 0; x < w; x++) {
                mergePair(idx(x, y), idx(x, y2));
            }
        }
    }

    /* mirror about the vertical axis: column x <-> w-1-x */
    if (axes.includes("x")) {

        for (let y = 0; y < h; y++) {

            for (let x = 0; x < w / 2; x++) {
                mergePair(idx(x, y), idx(w - 1 - x, y));
            }
        }
    }

    ctx.putImageData(img, 0, 0);
}

function styleLabel(chip) {
    return `${chip.style} • ${chip.pattern}` +
        (chip.palette ? ` • ${chip.palette.used} colors` : "");
}

function renderPaletteRow(chip) {

    const row = chip.card.querySelector(".palette-row");

    if (!row) return;

    row.innerHTML = "";

    let swatches;

    if (chip.palette) {
        swatches = chip.palette.colors.map(
            c => `rgba(${c.r},${c.g},${c.b},${(c.a / 255).toFixed(3)})`
        );
    } else {
        swatches = [chip.base, chip.dark, chip.accent];
    }

    swatches.forEach(color => {
        const s = document.createElement("span");
        s.style.background = color;
        row.appendChild(s);
    });
}

/* =========================================================
   UI
   ========================================================= */

function updateNotchLabel() {

    const input = document.getElementById("notchThickness");
    const label = document.getElementById("notchThicknessLabel");

    if (!input || !label) return;

    const v = parseInt(input.value, 10);

    label.textContent =
        "Notch Thickness" + (v ? ` · ${v}%` : " · Off");
}

function generateAll() {

    const seedInput =
        document.getElementById("seed");

    globalSeed =
        seedInput.value.trim() ||
        "pixel-" + Math.random().toString(36).slice(2);

    seedInput.value = globalSeed;

    const count =
        Math.max(
            1,
            Math.min(
                20,
                parseInt(
                    document.getElementById("count").value
                ) || 8
            )
        );

    chips = [];

    const container =
        document.getElementById("chips");

    container.innerHTML = "";

    for (let i = 0; i < count; i++) {

        const chip =
            createChip(i);

        chips.push(chip);

        addChipCard(chip);
    }

    document.getElementById("status").textContent =
        `${count} chips generated • seed: ${globalSeed}` +
        (customPalette.length ? " • image palette active" : "");

    syncShareState();
}

function addChipCard(chip) {

    const card =
        document.createElement("div");

    card.className = "chip-card";

    chip.card = card;

    let current = chip;

    /* exact top view */
    const wrap =
        document.createElement("div");

    wrap.className = "chip-wrap";

    const canvas =
        document.createElement("canvas");

    drawChip(canvas, chip);

    wrap.appendChild(canvas);

    /* diagonal + front views */
    const viewsRow =
        document.createElement("div");

    viewsRow.className = "views-row";

    const diagCanvas =
        addView(viewsRow, "Diagonal", () => current.value);

    const frontCanvas =
        addView(viewsRow, "Front", () => current.value);

    drawChipDiagonal(diagCanvas, chip);
    drawChipFront(frontCanvas, chip);

    const paletteRow =
        document.createElement("div");

    paletteRow.className = "palette-row";

    renderPaletteRow(chip);

    const style =
        document.createElement("div");

    style.className = "style-name";

    style.textContent = styleLabel(chip);

    const buttons =
        document.createElement("div");

    buttons.className = "chip-buttons";

    const regen =
        document.createElement("button");

    regen.textContent = "↻ Reroll";

    regen.onclick = () => {

        const newChip =
            createChip(
                current.index,
                globalSeed +
                "|reroll|" +
                Date.now()
            );

        chips[current.index] = newChip;

        newChip.card = card;

        current = newChip;

        drawChip(canvas, newChip);
        drawChipDiagonal(diagCanvas, newChip);
        drawChipFront(frontCanvas, newChip);

        renderPaletteRow(newChip);

        style.textContent = styleLabel(newChip);
    };

    const download =
        document.createElement("button");

    download.textContent = "PNG";

    download.onclick = () =>
        downloadChip(canvas, current.value, "top");

    buttons.appendChild(regen);
    buttons.appendChild(download);

    card.appendChild(wrap);
    card.appendChild(viewsRow);
    card.appendChild(paletteRow);
    card.appendChild(style);
    card.appendChild(buttons);

    document
        .getElementById("chips")
        .appendChild(card);
}

function addView(parent, label, getValue) {

    const view =
        document.createElement("div");

    view.className = "view";

    const canvas =
        document.createElement("canvas");

    const foot =
        document.createElement("div");

    foot.className = "view-foot";

    const name =
        document.createElement("span");

    name.className = "view-label";

    name.textContent = label;

    const btn =
        document.createElement("button");

    btn.textContent = "PNG";

    btn.onclick = () =>
        downloadChip(canvas, getValue(), label.toLowerCase());

    foot.appendChild(name);
    foot.appendChild(btn);

    view.appendChild(canvas);
    view.appendChild(foot);

    parent.appendChild(view);

    return canvas;
}

/* =========================================================
   DOWNLOAD
   ========================================================= */

function downloadChip(canvas, value, view) {

    const link =
        document.createElement("a");

    const v = String(value || "chip").replace("$", "");

    link.download =
        `pixel-chip-${v}-${view}.png`;

    link.href =
        canvas.toDataURL("image/png");

    link.click();
}

function downloadSheet() {

    if (!chips.length) return;

    const size =
        parseInt(
            document.getElementById("resolution").value
        );

    const scale =
        parseInt(
            document.getElementById("sheetScale").value, 10
        ) || 1;

    const transparent =
        document.getElementById("transparentSheet").checked;

    const gap = 8 * scale;

    const cell = size * scale;

    const columns = 4;

    const rows =
        Math.ceil(chips.length / columns);

    const sheet =
        document.createElement("canvas");

    sheet.width =
        columns * (cell + gap) + gap;

    sheet.height =
        rows * (cell + gap) + gap;

    const ctx =
        sheet.getContext("2d");

    ctx.imageSmoothingEnabled = false;

    if (!transparent) {

        ctx.fillStyle = "#10131a";

        ctx.fillRect(
            0,
            0,
            sheet.width,
            sheet.height
        );
    }

    chips.forEach((chip, i) => {

        const c =
            document.createElement("canvas");

        drawChip(c, chip);

        const x =
            gap +
            (i % columns) *
            (cell + gap);

        const y =
            gap +
            Math.floor(i / columns) *
            (cell + gap);

        ctx.drawImage(
            c,
            x,
            y,
            cell,
            cell
        );
    });

    const link =
        document.createElement("a");

    link.download =
        "pixel-poker-chip-sheet.png";

    link.href =
        sheet.toDataURL("image/png");

    link.click();
}

/* =========================================================
   SHARE LINK + PERSISTENCE
   Settings live in the URL hash (shareable) and localStorage
   (survives reloads). Only control settings + seed are shared —
   an uploaded image palette is not.
   ========================================================= */

const SETTINGS_KEY = "pokerChipGenerator.v1";

const CONTROL_IDS = [
    ["count", "value"],
    ["resolution", "value"],
    ["style", "value"],
    ["pattern", "value"],
    ["notchThickness", "value"],
    ["values", "value"],
    ["palette", "value"],
    ["sheetScale", "value"],
    ["transparentSheet", "checked"]
];

function readControls() {

    const state = {};

    for (const [id, prop] of CONTROL_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        state[id] = el[prop];
    }

    return state;
}

function applyControls(state) {

    for (const [id, prop] of CONTROL_IDS) {
        const el = document.getElementById(id);
        if (!el || !(id in state)) continue;
        if (prop === "checked") el.checked = state[id] === true || state[id] === "true";
        else el[prop] = state[id];
    }
}

function syncShareState() {

    const params = new URLSearchParams();

    for (const [id, prop] of CONTROL_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        params.set(id, String(el[prop]));
    }

    const seed = document.getElementById("seed").value.trim();

    if (seed) params.set("seed", seed);

    history.replaceState(null, "", "#" + params.toString());

    try {
        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify({ ...readControls(), seed })
        );
    } catch (_error) { /* private mode — ignore */ }
}

function copyShareLink() {

    syncShareState();

    const text = location.href;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
            () => toast("Share link copied!"),
            () => fallbackCopy(text)
        );
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {

    const ta = document.createElement("textarea");

    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";

    document.body.appendChild(ta);
    ta.select();

    try {
        document.execCommand("copy");
        toast("Share link copied!");
    } catch (_error) {
        toast("Copy failed — use the address bar");
    }

    ta.remove();
}

let toastTimer = null;

function toast(message) {

    const el = document.getElementById("toast");

    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(
        () => el.classList.remove("show"),
        2600
    );
}
/* =========================================================
   IMAGE PALETTE EXTRACTION (K-MEANS)
   ========================================================= */

function onPaletteFileChange(event) {

    const file = event.target.files && event.target.files[0];

    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {

        try {
            customPalette = extractPaletteFromImage(img);
        } catch (_error) {
            customPalette = [];
        }

        URL.revokeObjectURL(url);
        renderSwatches();
        generateAll();
    };

    img.onerror = () => {
        URL.revokeObjectURL(url);
        toast("Could not read that image.");
    };

    img.src = url;

    event.target.value = ""; /* allow re-selecting the same file */
}

function extractPaletteFromImage(img) {

    const maxDim = 48;

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));

    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const c = document.createElement("canvas");

    c.width = w;
    c.height = h;

    const ctx = c.getContext("2d", { willReadFrequently: true });

    ctx.drawImage(img, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h).data;
    const samples = [];

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        samples.push([data[i], data[i + 1], data[i + 2]]);
    }

    if (!samples.length) throw new Error("no pixels");

    /* Fixed seed: the palette depends only on the image, not the chip seed. */
    const centroids = kmeans(samples, 6, mulberry32(0xC0FFEE));

    return buildCustomTriads(centroids);
}

function renderSwatches() {

    const bar = document.getElementById("paletteBar");
    const styleSelect = document.getElementById("style");

    bar.innerHTML = "";

    if (!customPalette.length) {
        bar.hidden = true;
        styleSelect.disabled = false;
        return;
    }

    /* Show the distinct centroid colors used across all triads. */
    const seen = new Set();

    for (const [base, dark, accent] of customPalette) {

        for (const color of [base, dark, accent]) {

            if (seen.has(color)) continue;

            seen.add(color);

            const s = document.createElement("span");

            s.className = "swatch";
            s.style.background = color;
            s.title = color;

            bar.appendChild(s);
        }
    }

    const clearBtn = document.createElement("button");

    clearBtn.type = "button";
    clearBtn.className = "clear-btn";
    clearBtn.textContent = "✕ Clear";

    clearBtn.onclick = () => {
        customPalette = [];
        renderSwatches();
        generateAll();
    };

    bar.appendChild(clearBtn);

    bar.hidden = false;
    styleSelect.disabled = true;
}

/* =========================================================
   INITIALIZE
   Restore settings from the URL hash (shared link) or
   localStorage, wire up the image palette input, then
   generate.
   ========================================================= */

(function init() {

    const seedInput = document.getElementById("seed");

    if (location.hash.length > 1) {

        const params = new URLSearchParams(location.hash.slice(1));

        applyControls(Object.fromEntries(params.entries()));

        if (params.has("seed")) seedInput.value = params.get("seed");

    } else {

        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (saved && typeof saved === "object") applyControls(saved);
        } catch (_error) { /* corrupt storage — ignore */ }
    }

    globalSeed = seedInput.value.trim() ||
        "casino-" + Math.random().toString(36).substring(2, 9);

    seedInput.value = globalSeed;

    document.getElementById("paletteFile").addEventListener(
        "change",
        onPaletteFileChange
    );

    const notchInput = document.getElementById("notchThickness");

    if (notchInput) {

        updateNotchLabel();

        /* live feedback: redraw the set while dragging */
        notchInput.addEventListener("input", () => {
            updateNotchLabel();
            generateAll();
        });
    }

    renderSwatches();
    generateAll();
})();