/* =========================================================
   ELEMENTS
========================================================= */

const originalCanvas =
    document.getElementById("originalCanvas");

const processedCanvas =
    document.getElementById("processedCanvas");

const originalCtx =
    originalCanvas.getContext(
        "2d",
        { willReadFrequently: true }
    );

const processedCtx =
    processedCanvas.getContext(
        "2d",
        { willReadFrequently: true }
    );

const comparison =
    document.getElementById("comparison");

const processedLayer =
    document.getElementById("processedLayer");

const comparisonLine =
    document.getElementById("comparisonLine");

const comparisonSlider =
    document.getElementById("comparisonSlider");

const fileInput =
    document.getElementById("file");

const empty =
    document.getElementById("empty");

const status =
    document.getElementById("status");

const preview =
    document.getElementById("preview");

const previewState =
    document.getElementById("previewState");


/* =========================================================
   STATE
========================================================= */

let original = null;
let processed = null;
let imageLoaded = false;


/* =========================================================
   CONTROLS
========================================================= */

const controls = {

    grain:
        document.getElementById("grain"),

    color:
        document.getElementById("color"),

    chroma:
        document.getElementById("chroma"),

    texture:
        document.getElementById("texture"),

    soft:
        document.getElementById("soft"),

    blend:
        document.getElementById("blend"),

    localColor:
        document.getElementById("localColor"),

    edgeProtect:
        document.getElementById("edgeProtect"),

    monochrome:
        document.getElementById("monochrome"),

    seed:
        document.getElementById("seed")
};


const values = {

    grain:
        document.getElementById("grainVal"),

    color:
        document.getElementById("colorVal"),

    chroma:
        document.getElementById("chromaVal"),

    texture:
        document.getElementById("textureVal"),

    soft:
        document.getElementById("softVal"),

    blend:
        document.getElementById("blendVal")
};


/* =========================================================
   SEEDED RANDOM
========================================================= */

function mulberry32(seed) {

    return function() {

        let t =
            seed += 0x6D2B79F5;

        t =
            Math.imul(
                t ^ (t >>> 15),
                t | 1
            );

        t ^=
            t +
            Math.imul(
                t ^ (t >>> 7),
                t | 61
            );

        return (
            (t ^ (t >>> 14)) >>> 0
        ) / 4294967296;
    };
}


/* =========================================================
   GAUSSIAN RANDOM
========================================================= */

function gaussian(random) {

    let u = 0;
    let v = 0;

    while (u === 0)
        u = random();

    while (v === 0)
        v = random();

    return Math.sqrt(
        -2 * Math.log(u)
    ) *
    Math.cos(
        2 * Math.PI * v
    );
}


/* =========================================================
   RGB → HSL
========================================================= */

function rgbToHsl(r, g, b) {

    r /= 255;
    g /= 255;
    b /= 255;

    const max =
        Math.max(r, g, b);

    const min =
        Math.min(r, g, b);

    let h = 0;
    let s = 0;

    const l =
        (max + min) / 2;

    if (max !== min) {

        const d =
            max - min;

        s =
            l > 0.5
                ? d / (2 - max - min)
                : d / (max + min);

        switch (max) {

            case r:

                h =
                    (g - b) / d +
                    (g < b ? 6 : 0);

                break;

            case g:

                h =
                    (b - r) / d +
                    2;

                break;

            case b:

                h =
                    (r - g) / d +
                    4;

                break;
        }

        h /= 6;
    }

    return [h, s, l];
}


/* =========================================================
   HSL → RGB
========================================================= */

function hue2rgb(p, q, t) {

    if (t < 0)
        t += 1;

    if (t > 1)
        t -= 1;

    if (t < 1 / 6)
        return p + (q - p) * 6 * t;

    if (t < 1 / 2)
        return q;

    if (t < 2 / 3)
        return p +
            (q - p) *
            (2 / 3 - t) *
            6;

    return p;
}


function hslToRgb(h, s, l) {

    let r;
    let g;
    let b;

    if (s === 0) {

        r = g = b = l;

    } else {

        const q =
            l < 0.5
                ? l * (1 + s)
                : l + s - l * s;

        const p =
            2 * l - q;

        r =
            hue2rgb(
                p,
                q,
                h + 1 / 3
            );

        g =
            hue2rgb(
                p,
                q,
                h
            );

        b =
            hue2rgb(
                p,
                q,
                h - 1 / 3
            );
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}


/* =========================================================
   NOISE
========================================================= */

function makeNoiseGrid(
    width,
    height,
    scale,
    random
) {

    const gw =
        Math.ceil(width / scale) + 2;

    const gh =
        Math.ceil(height / scale) + 2;

    const grid =
        new Float32Array(gw * gh);

    for (
        let i = 0;
        i < grid.length;
        i++
    ) {

        grid[i] =
            gaussian(random);
    }

    return {
        grid,
        gw,
        gh,
        scale
    };
}


function smooth(t) {

    return (
        t *
        t *
        (3 - 2 * t)
    );
}


function sampleNoise(
    noise,
    x,
    y
) {

    const fx =
        x / noise.scale;

    const fy =
        y / noise.scale;

    const x0 =
        Math.floor(fx);

    const y0 =
        Math.floor(fy);

    const tx =
        smooth(fx - x0);

    const ty =
        smooth(fy - y0);

    const ix =
        Math.max(
            0,
            Math.min(
                noise.gw - 1,
                x0
            )
        );

    const iy =
        Math.max(
            0,
            Math.min(
                noise.gh - 1,
                y0
            )
        );

    const ix1 =
        Math.min(
            noise.gw - 1,
            ix + 1
        );

    const iy1 =
        Math.min(
            noise.gh - 1,
            iy + 1
        );

    const a =
        noise.grid[
            iy * noise.gw + ix
        ];

    const b =
        noise.grid[
            iy * noise.gw + ix1
        ];

    const c =
        noise.grid[
            iy1 * noise.gw + ix
        ];

    const d =
        noise.grid[
            iy1 * noise.gw + ix1
        ];

    const ab =
        a + (b - a) * tx;

    const cd =
        c + (d - c) * tx;

    return (
        ab +
        (cd - ab) * ty
    );
}


/* =========================================================
   PROCESS IMAGE
========================================================= */

function process() {

    if (!imageLoaded || !original)
        return;


    const w =
        originalCanvas.width;

    const h =
        originalCanvas.height;

    const source =
        original.data;

    const output =
        new Uint8ClampedArray(source);


    const random =
        mulberry32(
            Number(controls.seed.value) || 1
        );


    const grainAmount =
        Number(controls.grain.value) / 100;

    const colorAmount =
        Number(controls.color.value) / 100;

    const chromaAmount =
        Number(controls.chroma.value) / 100;

    const textureAmount =
        Number(controls.texture.value) / 100;

    const softness =
        Number(controls.soft.value) / 100;

    const blend =
        Number(controls.blend.value) / 100;


    /*
        Multiple frequency layers.

        Fine = film grain
        Medium = material variation
        Large = broad organic variation
    */

    const fineNoise =
        makeNoiseGrid(
            w,
            h,
            Math.max(
                3,
                8 - softness * 4
            ),
            random
        );


    const mediumNoise =
        makeNoiseGrid(
            w,
            h,
            25 + softness * 25,
            random
        );


    const largeNoise =
        makeNoiseGrid(
            w,
            h,
            80 + softness * 100,
            random
        );


    for (
        let y = 0;
        y < h;
        y++
    ) {

        for (
            let x = 0;
            x < w;
            x++
        ) {

            const i =
                (y * w + x) * 4;


            const originalR =
                source[i];

            const originalG =
                source[i + 1];

            const originalB =
                source[i + 2];


            let r =
                originalR;

            let g =
                originalG;

            let b =
                originalB;


            /* =========================
               EDGE PROTECTION
            ========================= */

            let edge = 0;


            if (
                controls.edgeProtect.checked
            ) {

                const x1 =
                    Math.min(
                        w - 1,
                        x + 1
                    );

                const y1 =
                    Math.min(
                        h - 1,
                        y + 1
                    );


                const rightIndex =
                    (y * w + x1) * 4;

                const downIndex =
                    (y1 * w + x) * 4;


                const dx =
                    Math.abs(
                        source[rightIndex] -
                        originalR
                    ) +

                    Math.abs(
                        source[rightIndex + 1] -
                        originalG
                    ) +

                    Math.abs(
                        source[rightIndex + 2] -
                        originalB
                    );


                const dy =
                    Math.abs(
                        source[downIndex] -
                        originalR
                    ) +

                    Math.abs(
                        source[downIndex + 1] -
                        originalG
                    ) +

                    Math.abs(
                        source[downIndex + 2] -
                        originalB
                    );


                edge =
                    Math.min(
                        1,
                        (dx + dy) / 180
                    );
            }


            const protection =
                controls.edgeProtect.checked
                    ? 1 - edge * 0.8
                    : 1;


            /* =========================
               FINE GRAIN
            ========================= */

            const fine =
                sampleNoise(
                    fineNoise,
                    x,
                    y
                ) *
                grainAmount *
                16;


            /* =========================
               ORGANIC TEXTURE
            ========================= */

            const organic =
                (
                    sampleNoise(
                        mediumNoise,
                        x,
                        y
                    ) * 0.7 +

                    sampleNoise(
                        largeNoise,
                        x,
                        y
                    ) * 0.3
                ) *
                textureAmount *
                9;


            const luminanceNoise =
                (fine + organic) *
                protection;


            /* =========================
               LOCAL COLOR
            ========================= */

            if (
                controls.localColor.checked
            ) {

                let hsl =
                    rgbToHsl(
                        r,
                        g,
                        b
                    );


                hsl[2] =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            hsl[2] +
                            luminanceNoise / 255
                        )
                    );


                if (
                    colorAmount > 0
                ) {

                    const hueNoise =
                        sampleNoise(
                            mediumNoise,
                            x + 37,
                            y + 71
                        );


                    const satNoise =
                        sampleNoise(
                            fineNoise,
                            x + 91,
                            y + 19
                        );


                    hsl[0] +=
                        hueNoise *
                        colorAmount *
                        0.008 *
                        protection;


                    hsl[1] +=
                        satNoise *
                        colorAmount *
                        0.025 *
                        protection;


                    hsl[0] =
                        (
                            hsl[0] % 1 + 1
                        ) % 1;


                    hsl[1] =
                        Math.max(
                            0,
                            Math.min(
                                1,
                                hsl[1]
                            )
                        );
                }


                const rgb =
                    hslToRgb(
                        hsl[0],
                        hsl[1],
                        hsl[2]
                    );


                r = rgb[0];
                g = rgb[1];
                b = rgb[2];

            } else {

                r += luminanceNoise;
                g += luminanceNoise;
                b += luminanceNoise;
            }


            /* =========================
               CHROMATIC GRAIN
            ========================= */

            if (
                chromaAmount > 0
            ) {

                if (
                    controls.monochrome.checked
                ) {

                    const c =
                        gaussian(random) *
                        chromaAmount *
                        2 *
                        protection;

                    r += c;
                    g += c;
                    b += c;

                } else {

                    r +=
                        gaussian(random) *
                        chromaAmount *
                        2 *
                        protection;

                    g +=
                        gaussian(random) *
                        chromaAmount *
                        2 *
                        protection;

                    b +=
                        gaussian(random) *
                        chromaAmount *
                        2 *
                        protection;
                }
            }


            /* =========================
               FINAL BLEND
            ========================= */

            output[i] =
                originalR +
                (r - originalR) *
                blend;


            output[i + 1] =
                originalG +
                (g - originalG) *
                blend;


            output[i + 2] =
                originalB +
                (b - originalB) *
                blend;


            output[i + 3] =
                source[i + 3];
        }
    }


    processed =
        new ImageData(
            output,
            w,
            h
        );


    processedCtx.putImageData(
        processed,
        0,
        0
    );


    updateComparison();


    status.textContent =
        `${w.toLocaleString()} × ${h.toLocaleString()} · processed`;
}


/* =========================================================
   COMPARISON SLIDER
========================================================= */

function updateComparison() {

    if (!imageLoaded)
        return;


    const value =
        Number(
            comparisonSlider.value
        );


    /*
        The processed canvas is the same intrinsic size
        as the original, so it remains perfectly aligned.
    */

    processedLayer.style.width =
        value + "%";


    comparisonLine.style.left =
        value + "%";


    /*
        Important when CSS scales the image.

        Get the actual displayed size of the original canvas
        and scale the processed canvas to exactly match it.
    */

    const rect =
        originalCanvas.getBoundingClientRect();


    processedCanvas.style.width =
        rect.width + "px";


    processedCanvas.style.height =
        rect.height + "px";
}


comparisonSlider.addEventListener(
    "input",
    updateComparison
);


/* =========================================================
   PREVIEW ON / OFF
========================================================= */

preview.addEventListener(
    "change",
    () => {

        const enabled =
            preview.checked;


        previewState.textContent =
            enabled
                ? "ON"
                : "OFF";


        if (enabled) {

            processedLayer.style.display =
                "block";

            comparisonLine.style.display =
                "block";

        } else {

            /*
                Original image remains visible underneath.
            */

            processedLayer.style.display =
                "none";

            comparisonLine.style.display =
                "none";
        }
    }
);


/* =========================================================
   LOAD IMAGE
========================================================= */

function loadImageFile(file) {

    if (
        !file ||
        !file.type.startsWith("image/")
    )
        return;


    const img =
        new Image();


    img.onload = () => {

        originalCanvas.width =
            img.naturalWidth;

        originalCanvas.height =
            img.naturalHeight;


        processedCanvas.width =
            img.naturalWidth;

        processedCanvas.height =
            img.naturalHeight;


        originalCtx.clearRect(
            0,
            0,
            originalCanvas.width,
            originalCanvas.height
        );


        originalCtx.drawImage(
            img,
            0,
            0
        );


        original =
            originalCtx.getImageData(
                0,
                0,
                img.naturalWidth,
                img.naturalHeight
            );


        imageLoaded = true;


        comparison.hidden =
            false;

        empty.hidden =
            true;


        status.textContent =
            `${img.naturalWidth.toLocaleString()} × ${img.naturalHeight.toLocaleString()}`;


        process();


        requestAnimationFrame(
            updateComparison
        );
    };


    img.onerror = () => {

        status.textContent =
            "Could not load image";
    };


    img.src =
        URL.createObjectURL(file);
}


fileInput.addEventListener(
    "change",
    event => {

        loadImageFile(
            event.target.files[0]
        );
    }
);


/* =========================================================
   DRAG & DROP
========================================================= */

const canvasWrap =
    document.querySelector(
        ".canvas-wrap"
    );


canvasWrap.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        canvasWrap.style.backgroundColor =
            "#202531";
    }
);


canvasWrap.addEventListener(
    "dragleave",
    () => {

        canvasWrap.style.backgroundColor =
            "";
    }
);


canvasWrap.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        canvasWrap.style.backgroundColor =
            "";


        const file =
            event.dataTransfer.files[0];


        loadImageFile(file);
    }
);


/* =========================================================
   CONTROL EVENTS
========================================================= */

for (
    const [key, input]
    of Object.entries(controls)
) {

    if (
        input.type === "checkbox"
    ) {

        input.addEventListener(
            "change",
            process
        );

    } else {

        input.addEventListener(
            "input",
            () => {

                if (values[key]) {

                    values[key].textContent =
                        input.value;
                }


                process();
            }
        );
    }
}


/* =========================================================
   PRESETS
========================================================= */

const presets = {

    subtle: {

        grain: 7,
        color: 3,
        chroma: 1,
        texture: 5,
        soft: 45,
        blend: 45

    },

    photo: {

        grain: 14,
        color: 5,
        chroma: 4,
        texture: 12,
        soft: 35,
        blend: 65

    },

    strong: {

        grain: 22,
        color: 12,
        chroma: 7,
        texture: 18,
        soft: 30,
        blend: 75

    }
};


document.querySelectorAll(
    "[data-preset]"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const preset =
                presets[
                    button.dataset.preset
                ];


            if (!preset)
                return;


            for (
                const [key, value]
                of Object.entries(preset)
            ) {

                controls[key].value =
                    value;


                if (values[key]) {

                    values[key].textContent =
                        value;
                }
            }


            process();
        }
    );
});


/* =========================================================
   RANDOM SEED
========================================================= */

document.getElementById(
    "randomSeed"
).addEventListener(
    "click",
    () => {

        controls.seed.value =
            Math.floor(
                Math.random() *
                999999999
            );


        process();
    }
);


/* =========================================================
   RESET
========================================================= */

document.getElementById(
    "reset"
).addEventListener(
    "click",
    () => {

        controls.grain.value = 12;
        controls.color.value = 7;
        controls.chroma.value = 3;
        controls.texture.value = 8;
        controls.soft.value = 35;
        controls.blend.value = 65;

        controls.localColor.checked =
            true;

        controls.edgeProtect.checked =
            true;

        controls.monochrome.checked =
            false;

        controls.seed.value =
            48291;


        for (
            const key of Object.keys(values)
        ) {

            values[key].textContent =
                controls[key].value;
        }


        comparisonSlider.value =
            50;


        preview.checked =
            true;

        previewState.textContent =
            "ON";

        processedLayer.style.display =
            "block";

        comparisonLine.style.display =
            "block";


        process();
    }
);


/* =========================================================
   DOWNLOAD
========================================================= */

document.getElementById(
    "download"
).addEventListener(
    "click",
    () => {

        if (
            !imageLoaded ||
            !processed
        )
            return;


        /*
            Export the processed image at its original
            resolution, regardless of preview scaling.
        */

        const exportCanvas =
            document.createElement(
                "canvas"
            );


        exportCanvas.width =
            originalCanvas.width;

        exportCanvas.height =
            originalCanvas.height;


        const exportCtx =
            exportCanvas.getContext(
                "2d"
            );


        exportCtx.putImageData(
            processed,
            0,
            0
        );


        exportCanvas.toBlob(
            blob => {

                if (!blob)
                    return;


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href = url;

                link.download =
                    "naturalized-image.png";


                document.body.appendChild(
                    link
                );


                link.click();

                link.remove();


                URL.revokeObjectURL(
                    url
                );

            },
            "image/png"
        );
    }
);


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        requestAnimationFrame(
            updateComparison
        );
    }
);


/* =========================================================
   INITIAL VALUES
========================================================= */

for (
    const key of Object.keys(values)
) {

    values[key].textContent =
        controls[key].value;
}