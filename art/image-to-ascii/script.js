/* =========================================
   ELEMENTS
========================================= */

const fileInput = document.getElementById("file");

const widthInput = document.getElementById("width");
const widthValue = document.getElementById("widthValue");

const charsetInput = document.getElementById("charset");

const contrastInput = document.getElementById("contrast");
const contrastValue = document.getElementById("contrastValue");

const brightnessInput = document.getElementById("brightness");
const brightnessValue = document.getElementById("brightnessValue");

const colorInput = document.getElementById("color");

const removeInput = document.getElementById("remove");

const emptyCharInput = document.getElementById("emptyChar");

const removeSettings = document.getElementById("removeSettings");
const autoHint = document.getElementById("autoHint");

const toleranceInput = document.getElementById("tolerance");
const toleranceValue = document.getElementById("toleranceValue");

const softnessInput = document.getElementById("softness");
const softnessValue = document.getElementById("softnessValue");

const animationSettings = document.getElementById("animationSettings");
const fpsInput = document.getElementById("fps");
const fpsValue = document.getElementById("fpsValue");

const playPauseBtn = document.getElementById("playPause");
const framesBox = document.getElementById("frames");
const frameStrip = document.getElementById("frameStrip");
const clearFramesBtn = document.getElementById("clearFrames");

const canvas = document.getElementById("canvas");

const ctx = canvas.getContext(
  "2d",
  { willReadFrequently: true }
);

const ascii = document.getElementById("ascii");
const splitPreview = document.getElementById("splitPreview");
const partialModeInput = document.getElementById("partialMode");
const partialDirectionInput = document.getElementById("partialDirection");
const partialPositionInput = document.getElementById("partialPosition");
const partialFeatherInput = document.getElementById("partialFeather");
const partialGlowInput = document.getElementById("partialGlow");
const empty = document.getElementById("empty");
const stats = document.getElementById("stats");

/* =========================================
   STATE
========================================= */

let frames = [];          // loaded images, in frame order
let frameOutputs = [];    // rendered html per frame
let framePlainTexts = []; // plain text per frame
let frameDetected = [];   // auto-detected background char per frame
let currentFrame = 0;
let playing = true;
let animTimer = null;
let rebuildPending = false;
let lastGridSize = "";

/* =========================================
   EMPTY CHARACTERS

   U+2800 BRAILLE PATTERN BLANK

   Looks empty but is a real Unicode
   character, so it survives copy/paste
   much better than ordinary spaces.
========================================= */

const EMPTY_BRAILLE = "\u2800";
const EMPTY_SPACE = " ";
const EMPTY_DOT = "·";

function getEmptyCharacter() {
  switch (emptyCharInput.value) {
    case "space":
      return EMPTY_SPACE;
    case "dot":
      return EMPTY_DOT;
    case "braille":
    default:
      return EMPTY_BRAILLE;
  }
}

/* =========================================
   CONTROLS
========================================= */

widthInput.addEventListener("input", () => {
  widthValue.textContent = widthInput.value;
  render();
});

contrastInput.addEventListener("input", () => {
  contrastValue.textContent = contrastInput.value;
  render();
});

brightnessInput.addEventListener("input", () => {
  brightnessValue.textContent = brightnessInput.value;
  render();
});

charsetInput.addEventListener("change", render);
colorInput.addEventListener("change", render);
emptyCharInput.addEventListener("change", render);
function updatePartialLabels() { document.getElementById("partialPositionValue").textContent = partialPositionInput.value + "%"; document.getElementById("partialFeatherValue").textContent = partialFeatherInput.value + "%"; }
[partialModeInput, partialDirectionInput, partialPositionInput, partialFeatherInput, partialGlowInput].forEach(input => input.addEventListener(input.type === "range" ? "input" : "change", () => { updatePartialLabels(); renderPartialPreview(); }));
removeInput.addEventListener("change", updateRemoveUI);

toleranceInput.addEventListener("input", () => {
  toleranceValue.textContent = toleranceInput.value;
  render();
});

softnessInput.addEventListener("input", () => {
  softnessValue.textContent = softnessInput.value;
  render();
});

fpsInput.addEventListener("input", () => {
  fpsValue.textContent = fpsInput.value;
  startTimer();
});

playPauseBtn.addEventListener("click", () => {
  setPlaying(!playing);
});

clearFramesBtn.addEventListener("click", () => {
  stopTimer();

  frames.length = 0;
  frameOutputs.length = 0;
  framePlainTexts.length = 0;
  frameDetected.length = 0;
  currentFrame = 0;

  ascii.innerHTML = "";
  empty.style.display = "";
  stats.textContent = "";

  updateAnimationUI();
});

function updateRemoveUI() {
  const mode = removeInput.value;
  const active = mode !== "none";
  const automatic = mode === "dominant" || mode === "edge";

  removeSettings.classList.toggle("hidden", !active || automatic);
  autoHint.classList.toggle("hidden", !automatic);

  render();
}

function updateAnimationUI() {
  const multi = frames.length > 1;

  framesBox.classList.toggle("hidden", !multi);
  animationSettings.classList.toggle("hidden", !multi);
  playPauseBtn.classList.toggle("hidden", !multi);

  renderFrameStrip();
}

/* =========================================
   FRAME STRIP
========================================= */

function renderFrameStrip() {
  frameStrip.innerHTML = "";

  frames.forEach((img, index) => {
    const cell = document.createElement("div");
    cell.className = "frame-cell" + (index === currentFrame ? " active" : "");

    const thumb = document.createElement("img");
    thumb.src = img.thumb || img.src;
    thumb.alt = "Frame " + (index + 1);

    const num = document.createElement("span");
    num.className = "frame-num";
    num.textContent = index + 1;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "frame-remove";
    removeBtn.title = "Remove frame " + (index + 1);
    removeBtn.textContent = "\u00d7";

    removeBtn.addEventListener("click", event => {
      event.stopPropagation();

      stopTimer();
      frames.splice(index, 1);

      if (currentFrame >= frames.length) {
        currentFrame = Math.max(0, frames.length - 1);
      }

      updateAnimationUI();
      render();
    });

    cell.addEventListener("click", () => {
      setPlaying(false);
      showFrame(index);
    });

    cell.appendChild(thumb);
    cell.appendChild(num);
    cell.appendChild(removeBtn);

    frameStrip.appendChild(cell);
  });
}

function markActiveFrame() {
  const cells = frameStrip.children;

  for (let i = 0; i < cells.length; i++) {
    cells[i].classList.toggle("active", i === currentFrame);
  }
}

/* =========================================
   IMAGE LOADING

   Picking files APPENDS to the current
   sequence, so frames can be added in
   batches. Use "Clear all" or the per-
   frame buttons to remove them.
========================================= */
/* =========================================
   ANIMATED GIF INPUT
   
   Decoded with the vendored omggif
   reader (omggif.js). Frames are
   composited onto a persistent canvas
   honoring each frame's disposal method
   and transparency, so partial frames
   and "restore to previous" animations
   decode correctly.
========================================= */

function decodeGifFile(arrayBuffer) {
  const reader = new GifReader(new Uint8Array(arrayBuffer));

  const width = reader.width;
  const height = reader.height;

  /* Persistent canvas the frames are composited onto. */

  const base = document.createElement("canvas");
  base.width = width;
  base.height = height;

  const bctx = base.getContext("2d", { willReadFrequently: true });

  /*
    Temp canvas the decoded frames are drawn
    through so their transparency composites
    over the base instead of replacing it.
  */

  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = width;
  tmpCanvas.height = height;

  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  const out = [];
  const delays = []; // centiseconds, per the GIF spec

  let prevDisposal = 0;
  let prevX = 0;
  let prevY = 0;
  let prevW = 0;
  let prevH = 0;
  let savedState = null;

  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i);

    /* Apply the PREVIOUS frame's disposal method. */

    if (i > 0) {
      if (prevDisposal === 2) {
        // Restore to background: clear the previous region.
        bctx.clearRect(prevX, prevY, prevW, prevH);
      } else if (prevDisposal === 3 && savedState) {
        // Restore to previous: bring back the snapshot.
        bctx.drawImage(savedState, 0, 0);
      }
    }

    /* Snapshot for this frame's disposal method 3. */

    savedState = null;

    if (info.disposal === 3) {
      savedState = document.createElement("canvas");
      savedState.width = width;
      savedState.height = height;
      savedState.getContext("2d").drawImage(base, 0, 0);
    }

    /*
      Decode this frame into a zeroed buffer the
      size of the full canvas. The blitter writes
      the (possibly partial) frame at its own x/y
      offset within that buffer and leaves
      transparent pixels untouched (alpha 0).
    */

    const buf = new Uint8ClampedArray(width * height * 4);

    reader.decodeAndBlitFrameRGBA(i, buf);

    tmpCtx.putImageData(new ImageData(buf, width, height), 0, 0);
    bctx.drawImage(tmpCanvas, 0, 0);

    /* Capture the displayed frame. */

    const frame = document.createElement("canvas");
    frame.width = width;
    frame.height = height;
    frame.getContext("2d").drawImage(base, 0, 0);

    out.push(frame);

    if (info.delay > 0) delays.push(info.delay);

    prevDisposal = info.disposal;
    prevX = info.x;
    prevY = info.y;
    prevW = info.width;
    prevH = info.height;
  }

  /* Average delay in centiseconds → FPS, clamped to the slider range. */

  let fps = null;

  if (delays.length) {
    const avgCs = delays.reduce((a, b) => a + b, 0) / delays.length;
    fps = Math.min(30, Math.max(2, Math.round(100 / avgCs)));
  }

  return { frames: out, fps };
}



fileInput.addEventListener("change", event => {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  let loadedCount = 0;
  let gifFps = null;

  function onFileLoaded() {
    loadedCount++;

    if (loadedCount !== files.length) return;

    /* Apply the GIF's native speed, if any. */

    if (gifFps !== null) {
      fpsInput.value = gifFps;
      fpsValue.textContent = gifFps;
    }

    currentFrame = Math.min(currentFrame, frames.length - 1);
    updateAnimationUI();
    render();
  }

  files.forEach(file => {
    /* ANIMATED GIF → one entry per frame. */

    if (file.type === "image/gif" || /\.gif$/i.test(file.name)) {
      const reader = new FileReader();

      reader.onload = ev => {
        try {
          const result = decodeGifFile(ev.target.result);

          for (const frame of result.frames) {
            /* Pre-render the strip thumbnail once. */
            frame.thumb = frame.toDataURL("image/png");
            frames.push(frame);
          }

          if (result.fps !== null) gifFps = result.fps;
        } catch (error) {
          console.error("Could not decode GIF:", error);
        }

        onFileLoaded();
      };

      reader.readAsArrayBuffer(file);
    }

    /* REGULAR IMAGE → single frame. */

    else {
      const reader = new FileReader();

      reader.onload = ev => {
        const img = new Image();

        img.onload = () => {
          frames.push(img);
          onFileLoaded();
        };

        img.src = ev.target.result;
      };

      reader.readAsDataURL(file);
    }
  });

  // Reset so the same file can be picked again.
  event.target.value = "";
});

/* =========================================
   GENERATE ASCII CHARACTER
========================================= */

function getCharacter(r, g, b, alpha, charset, contrast, brightness) {
  /*
    Transparent pixels are treated as WHITE.
    They convert into the light/background
    part of the ASCII instead of disappearing.
  */

  let gray;

  if (alpha === 0) {
    gray = 255;
  } else {
    gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  gray += brightness;
  gray = (gray - 128) * contrast + 128;
  gray = Math.max(0, Math.min(255, gray));

  const index = Math.floor(((255 - gray) / 255) * (charset.length - 1));

  return charset[index];
}

/* =========================================
   AUTOMATIC BACKGROUND CHARACTER

   `chars` may contain null entries for
   letterbox cells; those are ignored.
========================================= */

function getBackgroundCharacter(
  chars,
  width,
  height,
  mode,
  emptyCharacter
) {
  const counts = new Map();

  function addChar(char) {
    if (char === undefined || char === null || char === "\n") return;

    counts.set(char, (counts.get(char) || 0) + 1);
  }

  if (mode === "dominant") {
    for (const char of chars) addChar(char);
  } else {
    // Top edge.
    for (let x = 0; x < width; x++) addChar(chars[x]);

    // Bottom edge.
    const bottom = (height - 1) * width;

    for (let x = 0; x < width; x++) addChar(chars[bottom + x]);

    // Left and right edges.
    for (let y = 1; y < height - 1; y++) {
      addChar(chars[y * width]);
      addChar(chars[y * width + width - 1]);
    }
  }

  let bestChar = emptyCharacter;
  let bestCount = -1;

  for (const [char, count] of counts) {
    if (count > bestCount) {
      bestChar = char;
      bestCount = count;
    }
  }

  return bestChar;
}

/* =========================================
   COLOR DISTANCE
========================================= */

function colorDistance(r, g, b, target) {
  const dr = r - target[0];
  const dg = g - target[1];
  const db = b - target[2];

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/* =========================================
   MANUAL REMOVAL
========================================= */

function calculateManualAlpha(r, g, b, originalAlpha) {
  const mode = removeInput.value;

  /*
    NOTHING

    Don't remove anything.
  */

  if (mode === "none") return 255;

  /*
    TRANSPARENT

    Remove actual transparent pixels.
  */

  if (mode === "transparent") return originalAlpha;

  let target;

  /* WHITE */

  if (mode === "white") {
    target = [255, 255, 255];
  }

  /* BLACK */

  else if (mode === "black") {
    target = [0, 0, 0];
  }

  else {
    return 255;
  }

  const distance = colorDistance(r, g, b, target);

  const tolerance = Number(toleranceInput.value);
  const softness = Number(softnessInput.value);

  /* Fully remove. */

  if (distance <= tolerance) {
    return 0;
  }

  /* Soft transition. */

  if (softness > 0 && distance < tolerance + softness) {
    return Math.round(((distance - tolerance) / softness) * 255);
  }

  return 255;
}

/* =========================================
   ANIMATION TIMER
========================================= */

function startTimer() {
  stopTimer();

  if (frames.length < 2 || !playing) return;

  const interval = Math.max(
    1,
    Math.round(1000 / Number(fpsInput.value))
  );

  animTimer = setInterval(() => {
    showFrame(currentFrame + 1);
  }, interval);
}

function stopTimer() {
  if (animTimer !== null) {
    clearInterval(animTimer);
    animTimer = null;
  }
}

function syncTimer() {
  if (frames.length > 1 && playing) {
    startTimer();
  } else {
    stopTimer();
  }
}

function setPlaying(value) {
  playing = value;
  playPauseBtn.textContent = playing ? "Pause" : "Play";
  syncTimer();
}

/* =========================================
   COMPUTE ALL FRAMES
========================================= */

function computeAllFrames() {
  if (!frames.length) return;

  const targetWidth = Number(widthInput.value);

  /*
    Monospace characters are generally
    taller than they are wide.

    This compensates for that ratio.
  */

  const charAspect = 0.5;

  /*
    One shared grid keeps the animation
    stable: width comes from the slider,
    height is the tallest frame's natural
    height, and shorter frames are
    letterboxed with empty characters.
  */

  let gridHeight = 1;

  for (const img of frames) {
    const h = Math.max(
      1,
      Math.round(img.height / img.width * targetWidth * charAspect)
    );

    if (h > gridHeight) gridHeight = h;
  }

  lastGridSize = targetWidth + " \u00d7 " + gridHeight;

  frameOutputs.length = 0;
  framePlainTexts.length = 0;
  frameDetected.length = 0;

  for (const img of frames) {
    const result = convertFrame(img, targetWidth, gridHeight);

    frameOutputs.push(result.html);
    framePlainTexts.push(result.plain);
    frameDetected.push(result.detected);
  }

  if (currentFrame >= frames.length) {
    currentFrame = frames.length - 1;
  }
}

/* =========================================
   CONVERT ONE FRAME
========================================= */

function convertFrame(img, targetWidth, gridHeight) {
  const charAspect = 0.5;

  const frameHeight = Math.max(
    1,
    Math.round(img.height / img.width * targetWidth * charAspect)
  );

  const offsetY = Math.floor((gridHeight - frameHeight) / 2);

  canvas.width = targetWidth;
  canvas.height = gridHeight;

  ctx.clearRect(0, 0, targetWidth, gridHeight);

  /* Preserve source transparency. */

  ctx.drawImage(img, 0, offsetY, targetWidth, frameHeight);

  const pixels = ctx.getImageData(
    0,
    0,
    targetWidth,
    gridHeight
  ).data;

  const charset = charsetInput.value;
  const contrast = Number(contrastInput.value);
  const brightness = Number(brightnessInput.value);
  const colorMode = colorInput.value;
  const removeMode = removeInput.value;
  const emptyCharacter = getEmptyCharacter();

  /*
    ---------------------------------------
    FIRST PASS
    ---------------------------------------

    Generate the raw ASCII characters.

    null marks letterbox cells outside
    the image area.
  */

  const plainChars = new Array(targetWidth * gridHeight);

  for (let y = 0; y < gridHeight; y++) {
    if (y < offsetY || y >= offsetY + frameHeight) {
      for (let x = 0; x < targetWidth; x++) {
        plainChars[y * targetWidth + x] = null;
      }

      continue;
    }

    for (let x = 0; x < targetWidth; x++) {
      const position = y * targetWidth + x;
      const i = position * 4;

      plainChars[position] = getCharacter(
        pixels[i],
        pixels[i + 1],
        pixels[i + 2],
        pixels[i + 3],
        charset,
        contrast,
        brightness
      );
    }
  }

  /*
    ---------------------------------------
    AUTOMATIC BACKGROUND
    ---------------------------------------
  */

  let detected = null;

  if (removeMode === "dominant" || removeMode === "edge") {
    detected = getBackgroundCharacter(
      plainChars,
      targetWidth,
      gridHeight,
      removeMode,
      emptyCharacter
    );
  }

  /*
    ---------------------------------------
    SECOND PASS
    ---------------------------------------
  */

  let html = "";
  let plain = "";

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const position = y * targetWidth + x;

      /* Letterbox cell. */

      if (plainChars[position] === null) {
        html += emptyCharacter;
        plain += emptyCharacter;
        continue;
      }

      const i = position * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const originalAlpha = pixels[i + 3];

      let alpha = 255;

      /* MANUAL REMOVAL */

      if (
        removeMode === "white" ||
        removeMode === "black" ||
        removeMode === "transparent"
      ) {
        alpha = calculateManualAlpha(r, g, b, originalAlpha);
      }

      /* AUTOMATIC REMOVAL */

      else if (removeMode === "dominant" || removeMode === "edge") {
        if (plainChars[position] === detected) {
          alpha = 0;
        }
      }

      /* The generated character. */

      const char = plainChars[position];

      /*
        REMOVED PIXEL

        Use the selected invisible/empty
        Unicode character instead of a
        normal ASCII space.
      */

      if (alpha <= 0) {
        html += emptyCharacter;
        plain += emptyCharacter;
        continue;
      }

      /* COLOR MODE */

      if (colorMode === "color") {
        html += `<span style="color:rgba(${r},${g},${b},${(alpha / 255).toFixed(2)})">${escapeHtml(char)}</span>`;
        plain += char;
      }

      /* GREEN MODE */

      else if (colorMode === "green") {
        html += `<span style="color:rgba(0,255,102,${(alpha / 255).toFixed(2)})">${escapeHtml(char)}</span>`;
        plain += char;
      }

      /* MONOCHROME */

      else {
        /*
          If the generated character is the
          actual ASCII space from the charset,
          replace it with the selected
          Discord-safe empty character.

          This is important because otherwise
          large light areas would still contain
          ordinary spaces.
        */

        if (char === " ") {
          html += emptyCharacter;
          plain += emptyCharacter;
        } else {
          html += escapeHtml(char);
          plain += char;
        }
      }
    }

    /*
      Keep the actual line break.

      The line break itself is not replaced.
    */

    html += "\n";
    plain += "\n";
  }

  return { html, plain, detected };
}

/* =========================================
   SHOW FRAME / STATS
========================================= */

function showFrame(index) {
  if (!frames.length) return;

  const n = frames.length;

  currentFrame = ((index % n) + n) % n;

  if (frameOutputs[currentFrame] !== undefined) {
    ascii.innerHTML = frameOutputs[currentFrame];
  }

  renderPartialPreview();

  updateStats();
  markActiveFrame();
}

function renderPartialPreview() {
  if (!partialModeInput.checked || !frames.length || !frameOutputs[currentFrame]) { splitPreview.classList.add("hidden"); ascii.classList.remove("hidden"); return; }
  const asciiCanvas = getPngCanvas();
  if (!asciiCanvas) return;
  const out = splitPreview; out.width = asciiCanvas.width; out.height = asciiCanvas.height;
  const c = out.getContext("2d"); c.clearRect(0,0,out.width,out.height);
  c.drawImage(frames[currentFrame], 0, 0, out.width, out.height);
  const layer = document.createElement("canvas"); layer.width=out.width; layer.height=out.height; const l=layer.getContext("2d"); l.drawImage(asciiCanvas,0,0);
  const p=Number(partialPositionInput.value)/100, f=Number(partialFeatherInput.value)/100, d=partialDirectionInput.value;
  let g;
  if(d==="horizontal") g=l.createLinearGradient(0,out.height*(p-f),0,out.height*(p+f));
  else if(d==="diagonal") g=l.createLinearGradient(out.width*(p-f)-out.height/2,out.height,out.width*(p+f)+out.height/2,0);
  else g=l.createLinearGradient(out.width*(p-f),0,out.width*(p+f),0);
  g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(.5,"rgba(0,0,0,1)");g.addColorStop(1,"rgba(0,0,0,1)"); l.globalCompositeOperation="destination-in";l.fillStyle=g;l.fillRect(0,0,out.width,out.height);c.drawImage(layer,0,0);
  if(partialGlowInput.checked){c.save();c.strokeStyle="rgba(36,223,255,.95)";c.shadowColor="#20d9ff";c.shadowBlur=18;c.lineWidth=Math.max(2,out.width/360);c.beginPath();if(d==="horizontal"){const y=out.height*p;c.moveTo(0,y);c.lineTo(out.width,y)}else if(d==="diagonal"){const x=out.width*p;c.moveTo(x-out.height/2,out.height);c.lineTo(x+out.height/2,0)}else{const x=out.width*p;c.moveTo(x,0);c.lineTo(x,out.height)}c.stroke();c.restore();}
  ascii.classList.add("hidden"); out.classList.remove("hidden");
}

function updateStats() {
  if (!frames.length || !lastGridSize) return;

  let status = lastGridSize + " characters";

  if (frames.length > 1) {
    status += ` \u2022 ${frames.length} frames`;
  }

  const removeMode = removeInput.value;

  if (removeMode === "dominant" || removeMode === "edge") {
    const detectedChar = frameDetected[currentFrame];
    const readable = detectedChar === " " ? "space" : detectedChar;

    status += ` \u2022 detected background: "${readable}"`;
  } else if (removeMode !== "none") {
    status += ` \u2022 removing ${removeMode}`;
  }

  if (emptyCharInput.value === "braille") {
    status += " \u2022 empty: U+2800";
  }

  stats.textContent = status;
}

/* =========================================
   RENDER ENTRY POINT

   Recomputes every frame. requestAnimationFrame
   coalesces rapid slider input into one rebuild
   per animation frame.
========================================= */

function render() {
  if (!frames.length) return;

  empty.style.display = "none";

  if (rebuildPending) return;

  rebuildPending = true;

  requestAnimationFrame(() => {
    rebuildPending = false;

    computeAllFrames();
    showFrame(currentFrame);
    syncTimer();
  });
}

/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* =========================================
   GET PLAIN ASCII
========================================= */

function getPlainAscii() {
  /*
    The plain text is built in parallel with
    the html output, so it matches exactly
    what is visually represented, including
    the invisible Unicode characters.
  */

  if (!frames.length) return "";

  return framePlainTexts[currentFrame] || "";
}

/* =========================================
   EXPORTED HTML
========================================= */

function getHtml() {
  if (frames.length > 1) {
    return getAnimatedHtml();
  }

  return `<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<title>ASCII Art</title>

<style>

body {
  margin: 0;
  min-height: 100vh;
  background: #000;
}

pre {
  margin: 20px;

  font-family:
    "Courier New",
    Courier,
    monospace;

  font-size: 8px;
  line-height: 8px;

  white-space: pre;

  color: #fff;
}

</style>

</head>

<body>

<pre>${frameOutputs[0]}</pre>

</body>

</html>`;
}

function getAnimatedHtml() {
  const interval = Math.max(
    1,
    Math.round(1000 / Number(fpsInput.value))
  );

  /*
    The frames are embedded as a JSON array
    and cycled by a tiny script, keeping the
    exported page self-contained.
  */

  const data = JSON.stringify(frameOutputs);

  return `<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<title>ASCII Art</title>

<style>

body {
  margin: 0;
  min-height: 100vh;
  background: #000;
}

pre {
  margin: 20px;

  font-family:
    "Courier New",
    Courier,
    monospace;

  font-size: 8px;
  line-height: 8px;

  white-space: pre;

  color: #fff;
}

</style>

</head>

<body>

<pre id="ascii"></pre>

<script>

var frames = ${data};
var index = 0;
var target = document.getElementById("ascii");

function tick() {
  target.innerHTML = frames[index];
  index = (index + 1) % frames.length;
}

tick();
setInterval(tick, ${interval});

<\/script>

</body>

</html>`;
}

/* =========================================
   COPY ASCII
========================================= */

document
  .getElementById("copy")
  .addEventListener(
    "click",
    async () => {
      const text = getPlainAscii();

      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        /*
          Fallback for browsers where
          clipboard API isn't available.
        */

        const textarea = document.createElement("textarea");

        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
    }
  );

/* =========================================
   COPY HTML
========================================= */

document
  .getElementById("copyHtml")
  .addEventListener(
    "click",
    async () => {
      const html = getHtml();

      try {
        await navigator.clipboard.writeText(html);
      } catch (error) {
        const textarea = document.createElement("textarea");

        textarea.value = html;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
    }
  );

/* =========================================
   DOWNLOAD HTML
========================================= */

document
  .getElementById("download")
  .addEventListener(
    "click",
    () => {
      const blob = new Blob([getHtml()], {
        type: "text/html;charset=utf-8"
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;
      a.download = "ascii-art.html";

      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    }
  );

/* =========================================
   DOWNLOAD PNG
   
   Renders the current frame onto a canvas
   and downloads it as an image. Colors
   follow the selected color mode, so the
   PNG matches the preview exactly.
========================================= */

function getPngCanvas() {
  const html = frameOutputs[currentFrame];

  if (html === undefined) return null;

  /*
    Parse our own well-formed output into a
    grid of cells: plain text nodes use the
    default color, spans carry their rgba.
  */

  const doc = new DOMParser().parseFromString(
    `<div>${html}</div>`,
    "text/html"
  );

  const root = doc.body.firstChild;

  const lines = [[]];

  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const ch of node.data) {
        if (ch === "\n") {
          lines.push([]);
        } else {
          lines[lines.length - 1].push({ ch, color: null });
        }
      }
    } else if (node.nodeName === "SPAN") {
      const match = /color:(rgba?\([^)]*\))/.exec(
        node.getAttribute("style") || ""
      );

      lines[lines.length - 1].push({
        ch: node.textContent,
        color: match ? match[1] : null
      });
    }
  }

  /* Drop the trailing empty line from the final newline. */

  while (lines.length && !lines[lines.length - 1].length) {
    lines.pop();
  }

  if (!lines.length) return null;

  const fontSize = 16;
  const lineHeight = fontSize; // matches the preview's tight line-height
  const pad = Math.round(fontSize * 1.5);

  const out = document.createElement("canvas");
  let octx = out.getContext("2d");

  /* Measure the monospace cell width, then size the canvas. */

  octx.font = `${fontSize}px "Courier New", Courier, monospace`;

  const charW = octx.measureText("M").width;
  const cols = Math.max(...lines.map(line => line.length));

  out.width = Math.ceil(cols * charW) + pad * 2;
  out.height = lines.length * lineHeight + pad * 2;

  /* Setting the size resets context state. */

  octx = out.getContext("2d");
  octx.font = `${fontSize}px "Courier New", Courier, monospace`;
  octx.textBaseline = "top";

  octx.fillStyle = "#000";
  octx.fillRect(0, 0, out.width, out.height);

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];

    for (let x = 0; x < line.length; x++) {
      const cell = line[x];

      octx.fillStyle = cell.color || "#fff";
      octx.fillText(cell.ch, pad + x * charW, pad + y * lineHeight);
    }
  }

  return out;
}

document
  .getElementById("downloadPng")
  .addEventListener(
    "click",
    () => {
      const pngCanvas = partialModeInput.checked && !splitPreview.classList.contains("hidden")
        ? splitPreview
        : getPngCanvas();

      if (!pngCanvas) return;

      const name = frames.length > 1
        ? `ascii-art-frame-${currentFrame + 1}.png`
        : "ascii-art.png";

      pngCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;
        a.download = name;

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }, "image/png");
    }
  );

/* =========================================
   INITIAL UI
========================================= */

updateRemoveUI();
updateAnimationUI();








