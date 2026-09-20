let mode = "encode";
let attachedFile = null;
let attachedPreviewURL = null;

let decodedBlob = null;
let decodedFileName = "decoded-file";
let decodedMime = "application/octet-stream";


/* ---------------------------
   MODE
--------------------------- */

function setMode(newMode) {

  mode = newMode;

  document.getElementById("encodeTab")
    .classList.toggle("active", mode === "encode");

  document.getElementById("decodeTab")
    .classList.toggle("active", mode === "decode");

  document.getElementById("encodeOptions")
    .style.display =
      mode === "encode" ? "block" : "none";

  const input =
    document.getElementById("input");

  const label =
    document.getElementById("inputLabel");

  const dropZone =
    document.getElementById("dropZone");

  if (mode === "encode") {

    label.textContent = attachedFile
      ? "Text"
      : "Text";

    input.placeholder =
      "Enter text to encode...";

    dropZone.style.display = "block";

  } else {

    label.textContent =
      "Base64 or Data URL";

    input.placeholder =
      "Paste Base64 or a Data URL such as data:image/png;base64,...";

    dropZone.style.display = "none";
  }

  clearStatus();
}


/* ---------------------------
   TEXT → BASE64
--------------------------- */

function textToBase64(text) {

  const bytes =
    new TextEncoder().encode(text);

  return bytesToBase64(bytes);
}


/* ---------------------------
   BYTES → BASE64
--------------------------- */

function bytesToBase64(bytes) {

  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        i + chunkSize
      )
    );
  }

  return btoa(binary);
}


/* ---------------------------
   BASE64 → BYTES
--------------------------- */

function base64ToBytes(base64) {

  base64 = base64
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");

  if (!base64) {
    return new Uint8Array();
  }

  if (!/^[A-Za-z0-9+/]*$/.test(base64)) {
    throw new Error(
      "Invalid Base64 characters."
    );
  }

  if (base64.length % 4 === 1) {
    throw new Error(
      "Invalid Base64 length."
    );
  }

  const remainder =
    base64.length % 4;

  if (remainder === 2) {
    base64 += "==";
  } else if (remainder === 3) {
    base64 += "=";
  }

  let binary;

  try {
    binary = atob(base64);
  } catch {
    throw new Error(
      "Invalid Base64 data."
    );
  }

  const bytes =
    new Uint8Array(binary.length);

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}


/* ---------------------------
   DATA URL
--------------------------- */

function parseDataURL(value) {

  const match =
    value.match(
      /^data:([^;,]*)(;[^,]*)?,([\s\S]*)$/i
    );

  if (!match) {
    return null;
  }

  const mime =
    match[1] ||
    "text/plain";

  const metadata =
    match[2] || "";

  const data =
    match[3];

  if (!/;base64/i.test(metadata)) {
    throw new Error(
      "Data URL is not Base64 encoded."
    );
  }

  return {
    mime,
    data
  };
}


/* ---------------------------
   MIME DETECTION
--------------------------- */

function detectMime(bytes) {

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xFF &&
    bytes[1] === 0xD8 &&
    bytes[2] === 0xFF
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (
    bytes.length >= 2 &&
    bytes[0] === 0x42 &&
    bytes[1] === 0x4D
  ) {
    return "image/bmp";
  }

  try {

    const text =
      new TextDecoder().decode(
        bytes.slice(0, 1000)
      );

    if (
      /<svg[\s>]/i.test(text)
    ) {
      return "image/svg+xml";
    }

  } catch {}

  return "application/octet-stream";
}


/* ---------------------------
   CONVERT
--------------------------- */

function convert() {

  clearStatus();

  try {

    if (mode === "encode") {

      if (attachedFile) {
        encodeFile();
      } else {
        encodeText();
      }

    } else {

      decodeInput();

    }

  } catch (error) {

    clearResult();

    showStatus(
      error.message ||
      "Conversion failed.",
      "error"
    );
  }
}


/* ---------------------------
   TEXT ENCODING
--------------------------- */

function encodeText() {

  const input =
    document.getElementById("input").value;

  if (!input) {
    throw new Error(
      "Enter some text to encode."
    );
  }

  const base64 =
    textToBase64(input);

  const outputFormat =
    document.querySelector(
      'input[name="outputFormat"]:checked'
    ).value;

  let result = base64;

  if (outputFormat === "dataurl") {

    result =
      "data:text/plain;charset=utf-8;base64," +
      base64;
  }

  showEncodedResult(
    result,
    "text/plain",
    new TextEncoder().encode(input).length,
    "Text"
  );

  showStatus(
    "Text encoded successfully.",
    "success"
  );
}


/* ---------------------------
   FILE ENCODING
--------------------------- */

async function encodeFile() {

  if (!attachedFile) {
    throw new Error(
      "No file attached."
    );
  }

  const buffer =
    await attachedFile.arrayBuffer();

  const bytes =
    new Uint8Array(buffer);

  const base64 =
    bytesToBase64(bytes);

  const outputFormat =
    document.querySelector(
      'input[name="outputFormat"]:checked'
    ).value;

  let result = base64;

  if (outputFormat === "dataurl") {

    result =
      "data:" +
      (
        attachedFile.type ||
        "application/octet-stream"
      ) +
      ";base64," +
      base64;
  }

  showEncodedResult(
    result,
    attachedFile.type ||
      "application/octet-stream",
    bytes.length,
    attachedFile.name
  );

  showStatus(
    "File encoded successfully.",
    "success"
  );
}


/* ---------------------------
   ENCODED RESULT
--------------------------- */

function showEncodedResult(
  result,
  mime,
  size,
  name
) {

  const card =
    document.getElementById("resultCard");

  card.classList.add("visible");

  document.getElementById("resultTitle")
    .textContent =
      "Encoded Result";

  document.getElementById("metaType")
    .textContent = mime;

  document.getElementById("metaSize")
    .textContent = formatBytes(size);

  document.getElementById("metaFormat")
    .textContent = "Base64";

  hideAllPreviews();

  document.getElementById("resultText")
    .classList.add("visible");

  document.getElementById("resultTextarea")
    .value = result;

  decodedBlob =
    new Blob(
      [result],
      { type: "text/plain" }
    );

  decodedFileName =
    name
      ? name + ".base64.txt"
      : "encoded-base64.txt";

  document.getElementById("downloadButton")
    .style.display = "inline-block";
}


/* ---------------------------
   DECODE
--------------------------- */

function decodeInput() {

  let input =
    document.getElementById("input")
      .value
      .trim();

  if (!input) {
    throw new Error(
      "Paste Base64 or a Data URL."
    );
  }

  let mime = null;
  let base64 = input;

  const dataURL =
    parseDataURL(input);

  if (dataURL) {

    mime = dataURL.mime;
    base64 = dataURL.data;
  }

  const bytes =
    base64ToBytes(base64);

  const detectedMime =
    mime || detectMime(bytes);

  decodedMime =
    detectedMime;

  decodedBlob =
    new Blob(
      [bytes],
      { type: detectedMime }
    );

  showDecodedResult(
    bytes,
    detectedMime
  );

  showStatus(
    "Successfully decoded.",
    "success"
  );
}


/* ---------------------------
   DECODED RESULT
--------------------------- */

function showDecodedResult(
  bytes,
  mime
) {

  const card =
    document.getElementById("resultCard");

  card.classList.add("visible");

  document.getElementById("resultTitle")
    .textContent =
      isImageMime(mime)
        ? "Decoded Image"
        : "Decoded Data";

  document.getElementById("metaType")
    .textContent = mime;

  document.getElementById("metaSize")
    .textContent =
      formatBytes(bytes.length);

  document.getElementById("metaFormat")
    .textContent =
      formatName(mime);

  hideAllPreviews();

  if (isImageMime(mime)) {

    showImagePreview(
      bytes,
      mime
    );

  } else {

    showTextOrBinary(
      bytes,
      mime
    );
  }

  decodedFileName =
    getFileName(mime);

  document.getElementById("downloadButton")
    .style.display = "inline-block";
}


/* ---------------------------
   IMAGE PREVIEW
--------------------------- */

function showImagePreview(
  bytes,
  mime
) {

  const preview =
    document.getElementById(
      "imagePreview"
    );

  const img =
    document.getElementById(
      "previewImage"
    );

  const blob =
    new Blob(
      [bytes],
      { type: mime }
    );

  const url =
    URL.createObjectURL(blob);

  img.onload = function() {

    document.getElementById(
      "dimensionsItem"
    ).style.display = "block";

    document.getElementById(
      "metaDimensions"
    ).textContent =
      img.naturalWidth +
      " × " +
      img.naturalHeight;

    URL.revokeObjectURL(url);
  };

  img.onerror = function() {

    URL.revokeObjectURL(url);

    showStatus(
      "The data was decoded, but the image could not be displayed.",
      "error"
    );
  };

  img.src = url;

  preview.classList.add("visible");
}


/* ---------------------------
   TEXT / BINARY
--------------------------- */

function showTextOrBinary(
  bytes,
  mime
) {

  let text = null;

  try {

    text =
      new TextDecoder(
        "utf-8",
        { fatal: true }
      ).decode(bytes);

  } catch {}

  if (
    text !== null &&
    (
      mime.startsWith("text/") ||
      isMostlyPrintable(text)
    )
  ) {

    const preview =
      document.getElementById(
        "textPreview"
      );

    preview.textContent =
      text;

    preview.classList.add(
      "visible"
    );

    return;
  }

  const hex =
    document.getElementById(
      "hexPreview"
    );

  hex.textContent =
    bytesToHex(bytes);

  hex.classList.add(
    "visible"
  );
}


/* ---------------------------
   ATTACH FILE
--------------------------- */

function handleFile(file) {

  if (!file) {
    return;
  }

  attachedFile = file;

  showAttachment(file);

  /*
   * IMPORTANT:
   * Do NOT put Base64 into the textarea.
   * The textarea remains empty because
   * the file is represented by the attachment.
   */

  document.getElementById("input")
    .value = "";

  clearResult();
  clearStatus();

  showStatus(
    "File attached. Click Convert to encode it.",
    "success"
  );
}


/* ---------------------------
   ATTACHMENT UI
--------------------------- */

function showAttachment(file) {

  const attachment =
    document.getElementById(
      "attachment"
    );

  const preview =
    document.getElementById(
      "attachmentPreview"
    );

  document.getElementById(
    "attachmentName"
  ).textContent =
    file.name;

  document.getElementById(
    "attachmentMeta"
  ).textContent =
    (
      file.type ||
      "Unknown type"
    ) +
    " · " +
    formatBytes(file.size);

  preview.innerHTML =
    '<span class="file-icon">📄</span>';

  if (
    file.type &&
    file.type.startsWith("image/")
  ) {

    if (attachedPreviewURL) {
      URL.revokeObjectURL(
        attachedPreviewURL
      );
    }

    attachedPreviewURL =
      URL.createObjectURL(file);

    const img =
      document.createElement("img");

    img.src =
      attachedPreviewURL;

    img.alt =
      file.name;

    preview.innerHTML = "";

    preview.appendChild(img);
  }

  attachment.classList.add(
    "visible"
  );
}


/* ---------------------------
   REMOVE FILE
--------------------------- */

function removeFile(event) {

  event.stopPropagation();

  attachedFile = null;

  if (attachedPreviewURL) {

    URL.revokeObjectURL(
      attachedPreviewURL
    );

    attachedPreviewURL = null;
  }

  document.getElementById(
    "attachment"
  ).classList.remove(
    "visible"
  );

  document.getElementById(
    "fileInput"
  ).value = "";

  clearStatus();
}


/* ---------------------------
   DOWNLOAD
--------------------------- */

function downloadResult() {

  if (!decodedBlob) {

    showStatus(
      "There is nothing to download.",
      "error"
    );

    return;
  }

  const url =
    URL.createObjectURL(
      decodedBlob
    );

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    decodedFileName;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


/* ---------------------------
   COPY
--------------------------- */

async function copyResult() {

  const result =
    document.getElementById(
      "resultTextarea"
    ).value;

  if (!result) {

    showStatus(
      "There is no result to copy.",
      "error"
    );

    return;
  }

  try {

    await navigator.clipboard
      .writeText(result);

    showStatus(
      "Result copied to clipboard.",
      "success"
    );

  } catch {

    showStatus(
      "Could not copy the result.",
      "error"
    );
  }
}


/* ---------------------------
   SWAP
--------------------------- */

function swap() {

  const result =
    document.getElementById(
      "resultTextarea"
    ).value;

  if (!result) {

    showStatus(
      "There is no result to swap.",
      "error"
    );

    return;
  }

  removeFile(
    new Event("click")
  );

  document.getElementById(
    "input"
  ).value =
    result;

  setMode(
    mode === "encode"
      ? "decode"
      : "encode"
  );

  clearResult();
}


/* ---------------------------
   CLEAR
--------------------------- */

function clearAll() {

  document.getElementById(
    "input"
  ).value = "";

  removeFile(
    new Event("click")
  );

  clearResult();
  clearStatus();

  decodedBlob = null;
}


/* ---------------------------
   HELPERS
--------------------------- */

function isImageMime(mime) {
  return mime.startsWith("image/");
}


function formatName(mime) {

  const names = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/gif": "GIF",
    "image/webp": "WebP",
    "image/bmp": "BMP",
    "image/svg+xml": "SVG"
  };

  return names[mime] || mime;
}


function formatBytes(bytes) {

  if (bytes === 0) {
    return "0 bytes";
  }

  const units = [
    "bytes",
    "KB",
    "MB",
    "GB"
  ];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    (
      bytes /
      Math.pow(1024, index)
    ).toFixed(
      index === 0 ? 0 : 2
    ) +
    " " +
    units[index]
  );
}


function getFileName(mime) {

  const extensions = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "text/plain": "txt",
    "application/json": "json",
    "application/pdf": "pdf"
  };

  return (
    "decoded-file." +
    (
      extensions[mime] ||
      "bin"
    )
  );
}


function isMostlyPrintable(text) {

  if (!text.length) {
    return true;
  }

  let printable = 0;

  for (const char of text) {

    const code =
      char.charCodeAt(0);

    if (
      code === 9 ||
      code === 10 ||
      code === 13 ||
      (code >= 32 && code !== 127)
    ) {
      printable++;
    }
  }

  return (
    printable / text.length >= .85
  );
}


function bytesToHex(bytes) {

  const lines = [];

  for (
    let i = 0;
    i < bytes.length;
    i += 16
  ) {

    const chunk =
      bytes.slice(i, i + 16);

    const hex =
      Array.from(chunk)
        .map(
          byte =>
            byte
              .toString(16)
              .padStart(2, "0")
              .toUpperCase()
        )
        .join(" ");

    lines.push(
      i
        .toString(16)
        .padStart(8, "0")
        .toUpperCase() +
      "  " +
      hex
    );
  }

  return lines.join("\n");
}


/* ---------------------------
   RESULT CLEANUP
--------------------------- */

function hideAllPreviews() {

  document.getElementById(
    "resultText"
  ).classList.remove("visible");

  document.getElementById(
    "imagePreview"
  ).classList.remove("visible");

  document.getElementById(
    "textPreview"
  ).classList.remove("visible");

  document.getElementById(
    "hexPreview"
  ).classList.remove("visible");

  document.getElementById(
    "dimensionsItem"
  ).style.display = "none";
}


function clearResult() {

  document.getElementById(
    "resultCard"
  ).classList.remove("visible");

  hideAllPreviews();

  document.getElementById(
    "downloadButton"
  ).style.display = "none";

  document.getElementById(
    "resultTextarea"
  ).value = "";
}


/* ---------------------------
   STATUS
--------------------------- */

function showStatus(message, type) {

  const status =
    document.getElementById(
      "status"
    );

  status.textContent =
    message;

  status.className =
    "status " + type;
}


function clearStatus() {

  const status =
    document.getElementById(
      "status"
    );

  status.textContent = "";

  status.className =
    "status";
}


/* ---------------------------
   DRAG & DROP
--------------------------- */

const dropZone =
  document.getElementById(
    "dropZone"
  );

dropZone.addEventListener(
  "dragover",
  event => {

    event.preventDefault();

    dropZone.classList.add(
      "dragover"
    );
  }
);

dropZone.addEventListener(
  "dragleave",
  () => {

    dropZone.classList.remove(
      "dragover"
    );
  }
);

dropZone.addEventListener(
  "drop",
  event => {

    event.preventDefault();

    dropZone.classList.remove(
      "dragover"
    );

    const file =
      event.dataTransfer.files[0];

    if (file) {
      handleFile(file);
    }
  }
);


/* ---------------------------
   KEYBOARD
--------------------------- */

document.addEventListener(
  "keydown",
  event => {

    if (
      (event.ctrlKey ||
       event.metaKey) &&
      event.key === "Enter"
    ) {

      event.preventDefault();

      convert();
    }
  }
);