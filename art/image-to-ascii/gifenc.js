/* =========================================
   GIFENC - VENDORED GIF ENCODER

   Source: https://github.com/mattdesl/gifenc
           v1.0.3, "very fast JS GIF encoder"

   License: MIT
   Copyright (c) Matt DesLauriers

   The quantizer is derived from PnnQuant.js
   by Mark Tyler and Dmitry Groshev, with
   modifications by Miller Cy Chan.

   Bundled as a single classic script so the
   tool stays dependency-free. In the browser
   it exposes window.gifenc = { GIFEncoder,
   quantize, applyPalette, ... }; under Node
   it uses module.exports for testing.
========================================= */

(function () {
  "use strict";

/* ---- GIF constants (constants.js) ---- */

const constants = {
  signature: "GIF",
  version: "89a",
  trailer: 0x3B,
  extensionIntroducer: 0x21,
  applicationExtensionLabel: 0xFF,
  graphicControlExtensionLabel: 0xF9,
  imageSeparator: 0x2C,
  // Header
  signatureSize: 3,
  versionSize: 3,
  globalColorTableFlagMask: 0b10000000,
  colorResolutionMask: 0b01110000,
  sortFlagMask: 0b00001000,
  globalColorTableSizeMask: 0b00000111,
  // Application extension
  applicationIdentifierSize: 8,
  applicationAuthCodeSize: 3,
  // Graphic control extension
  disposalMethodMask: 0b00011100,
  userInputFlagMask: 0b00000010,
  transparentColorFlagMask: 0b00000001,
  // Image descriptor
  localColorTableFlagMask: 0b10000000,
  interlaceFlagMask: 0b01000000,
  idSortFlagMask: 0b00100000,
  localColorTableSizeMask: 0b00000111
}

/* ---- byte stream buffer (stream.js) ---- */

function createStream(initialCapacity = 256) {
  let cursor = 0;
  let contents = new Uint8Array(initialCapacity);

  return {
    get buffer() {
      return contents.buffer;
    },
    reset() {
      cursor = 0;
    },
    bytesView() {
      return contents.subarray(0, cursor);
    },
    bytes() {
      return contents.slice(0, cursor);
    },
    writeByte(byte) {
      expand(cursor + 1);
      contents[cursor] = byte;
      cursor++;
    },
    writeBytes(data, offset = 0, byteLength = data.length) {
      expand(cursor + byteLength);
      for (let i = 0; i < byteLength; i++) {
        contents[cursor++] = data[i + offset];
      }
    },
    writeBytesView(data, offset = 0, byteLength = data.byteLength) {
      expand(cursor + byteLength);
      contents.set(data.subarray(offset, offset + byteLength), cursor);
      cursor += byteLength;
    },
  };

  function expand(newCapacity) {
    var prevCapacity = contents.length;
    if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
    // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
    // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
    // avoid overshooting the allocation cap by a very large margin.
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(
      newCapacity,
      (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>>
        0
    );
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
    const oldContents = contents;
    contents = new Uint8Array(newCapacity); // Allocate new storage.
    if (cursor > 0) contents.set(oldContents.subarray(0, cursor), 0);
  }
}

/* ---- LZW pixel compression (lzwEncode.js) ---- */

/*
  LZWEncoder.js
  Authors
  Kevin Weiner (original Java version - kweiner@fmsware.com)
  Thibault Imbert (AS3 version - bytearray.org)
  Johan Nordberg (JS version - code@johan-nordberg.com)
  Acknowledgements
  GIFCOMPR.C - GIF Image compression routines
  Lempel-Ziv compression based on 'compress'. GIF modifications by
  David Rowley (mgardi@watdcsu.waterloo.edu)
  GIF Image compression - modified 'compress'
  Based on: compress.c - File compression ala IEEE Computer, June 1984.
  By Authors: Spencer W. Thomas (decvax!harpo!utah-cs!utah-gr!thomas)
  Jim McKie (decvax!mcvax!jim)
  Steve Davies (decvax!vax135!petsd!peora!srd)
  Ken Turkowski (decvax!decwrl!turtlevax!ken)
  James A. Woods (decvax!ihnp4!ames!jaw)
  Joe Orost (decvax!vax135!petsd!joe)
  Matt DesLauriers (@mattdesl - V8/JS optimizations)
  Mathieu Henri (@p01 - JS optimization)
*/

const EOF = -1;
const BITS = 12;
const DEFAULT_HSIZE = 5003; // 80% occupancy
const MASKS = [
  0x0000,
  0x0001,
  0x0003,
  0x0007,
  0x000f,
  0x001f,
  0x003f,
  0x007f,
  0x00ff,
  0x01ff,
  0x03ff,
  0x07ff,
  0x0fff,
  0x1fff,
  0x3fff,
  0x7fff,
  0xffff,
];

function lzwEncode(
  width,
  height,
  pixels,
  colorDepth,
  outStream = createStream(512),
  accum = new Uint8Array(256),
  htab = new Int32Array(DEFAULT_HSIZE),
  codetab = new Int32Array(DEFAULT_HSIZE)
) {
  const hsize = htab.length;
  const initCodeSize = Math.max(2, colorDepth);

  accum.fill(0);
  codetab.fill(0);
  htab.fill(-1);

  let cur_accum = 0;
  let cur_bits = 0;

  // Algorithm: use open addressing double hashing (no chaining) on the
  // prefix code / next character combination. We do a variant of Knuth's
  // algorithm D (vol. 3, sec. 6.4) along with G. Knott's relatively-prime
  // secondary probe. Here, the modular division first probe is gives way
  // to a faster exclusive-or manipulation. Also do block compression with
  // an adaptive reset, whereby the code table is cleared when the compression
  // ratio decreases, but after the table fills. The variable-length output
  // codes are re-sized at this point, and a special CLEAR code is generated
  // for the decompressor. Late addition: construct the table according to
  // file size for noticeable speed improvement on small files. Please direct
  // questions about this implementation to ames!jaw.

  // compress and write the pixel data
  const init_bits = initCodeSize + 1;

  // Set up the globals: g_init_bits - initial number of bits
  const g_init_bits = init_bits;

  // Set up the necessary values

  // block compression parameters -- after all codes are used up,
  // and compression rate changes, start over.
  let clear_flg = false;
  let n_bits = g_init_bits;
  let maxcode = (1 << n_bits) - 1;

  const ClearCode = 1 << (init_bits - 1);
  const EOFCode = ClearCode + 1;
  let free_ent = ClearCode + 2;
  let a_count = 0; // clear packet

  let ent = pixels[0];

  let hshift = 0;
  for (let fcode = hsize; fcode < 65536; fcode *= 2) {
    ++hshift;
  }
  hshift = 8 - hshift; // set hash code range bound

  outStream.writeByte(initCodeSize); // write "initial code size" byte

  output(ClearCode);

  const length = pixels.length;
  for (let idx = 1; idx < length; idx++) {
    next_block: {
      const c = pixels[idx];
      const fcode = (c << BITS) + ent;
      let i = (c << hshift) ^ ent; // xor hashing
      if (htab[i] === fcode) {
        ent = codetab[i];
        break next_block;
      }

      const disp = i === 0 ? 1 : hsize - i; // secondary hash (after G. Knott)
      while (htab[i] >= 0) {
        // non-empty slot
        i -= disp;
        if (i < 0) i += hsize;
        if (htab[i] === fcode) {
          ent = codetab[i];
          break next_block;
        }
      }
      output(ent);
      ent = c;
      if (free_ent < 1 << BITS) {
        codetab[i] = free_ent++; // code -> hashtable
        htab[i] = fcode;
      } else {
        // Clear out the hash table
        // table clear for block compress
        htab.fill(-1);
        free_ent = ClearCode + 2;
        clear_flg = true;
        output(ClearCode);
      }
    }
  }

  // Put out the final code.
  output(ent);
  output(EOFCode);

  outStream.writeByte(0); // write block terminator
  return outStream.bytesView();

  function output(code) {
    cur_accum &= MASKS[cur_bits];

    if (cur_bits > 0) cur_accum |= code << cur_bits;
    else cur_accum = code;

    cur_bits += n_bits;

    while (cur_bits >= 8) {
      // Add a character to the end of the current packet, and if it is 254
      // characters, flush the packet to disk.
      accum[a_count++] = cur_accum & 0xff;
      if (a_count >= 254) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
      cur_accum >>= 8;
      cur_bits -= 8;
    }

    // If the next entry is going to be too big for the code size,
    // then increase it, if possible.
    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        n_bits = g_init_bits;
        maxcode = (1 << n_bits) - 1;
        clear_flg = false;
      } else {
        ++n_bits;
        maxcode = n_bits === BITS ? (1 << n_bits) : (1 << n_bits) - 1;
      }
    }

    if (code == EOFCode) {
      // At EOF, write the rest of the buffer.
      while (cur_bits > 0) {
        // Add a character to the end of the current packet, and if it is 254
        // characters, flush the packet to disk.
        accum[a_count++] = cur_accum & 0xff;
        if (a_count >= 254) {
          outStream.writeByte(a_count);
          outStream.writeBytesView(accum, 0, a_count);
          a_count = 0;
        }
        cur_accum >>= 8;
        cur_bits -= 8;
      }
      // Flush the packet to disk, and reset the accumulator
      if (a_count > 0) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
    }
  }
}

/* ---- RGB packing helpers (rgb-packing.js) ---- */

function uint32_to_rgba(color) {
  var a = (color >> 24) & 0xff;
  var b = (color >> 16) & 0xff;
  var g = (color >> 8) & 0xff;
  var r = color & 0xff;
  return [r, g, b, a];
}

function rgba_to_uint32(r, g, b, a) {
  return (a << 24) | (b << 16) | (g << 8) | r;
}

function rgb888_to_rgb565(r, g, b) {
  return ((r << 8) & 0xf800) | ((g << 2) & 0x03e0) | (b >> 3);
}

function rgba8888_to_rgba4444(r, g, b, a) {
  return (r >> 4) | (g & 0xf0) | ((b & 0xf0) << 4) | ((a & 0xf0) << 8);
}

function rgb888_to_rgb444(r, g, b) {
  return ((r >> 4) << 8) | (g & 0xf0) | (b >> 4);
}

// Alternative 565 ?
// return ((r & 0xf8) << 8) + ((g & 0xfc) << 3) + (b >> 3);

// Alternative 4444 ?
// ((a & 0xf0) << 8) | ((r & 0xf0) << 4) | (g & 0xf0) | (b >> 4);

/* ---- color distance helpers (color.js) ---- */

function rgb2y(r, g, b) {
  return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
}
function rgb2i(r, g, b) {
  return r * 0.59597799 - g * 0.2741761 - b * 0.32180189;
}
function rgb2q(r, g, b) {
  return r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
}

function colorDifferenceYIQSquared(yiqA, yiqB) {
  const y = yiqA[0] - yiqB[0];
  const i = yiqA[1] - yiqB[1];
  const q = yiqA[2] - yiqB[2];
  const a = alpha(yiqA) - alpha(yiqB);
  return y * y * 0.5053 + i * i * 0.299 + q * q * 0.1957 + a * a;
}

function alpha(array) {
  return array[3] != null ? array[3] : 0xff;
}

function colorDifferenceYIQ(yiqA, yiqB) {
  return Math.sqrt(colorDifferenceYIQSquared(yiqA, yiqB));
}

function colorDifferenceRGBToYIQSquared(rgb1, rgb2) {
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;
  const y = rgb2y(r1, g1, b1) - rgb2y(r2, g2, b2),
    i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2),
    q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
  const a = alpha(rgb1) - alpha(rgb2);
  return y * y * 0.5053 + i * i * 0.299 + q * q * 0.1957 + a * a;
}

function colorDifferenceRGBToYIQ(rgb1, rgb2) {
  return Math.sqrt(colorDifferenceRGBToYIQSquared(rgb1, rgb2));
}

function euclideanDistanceSquared(a, b) {
  var sum = 0;
  var n;
  for (n = 0; n < a.length; n++) {
    const dx = a[n] - b[n];
    sum += dx * dx;
  }
  return sum;
}

function euclideanDistance(a, b) {
  return Math.sqrt(euclideanDistanceSquared(a, b));
}

/* ---- PNN color quantizer (quantize) (pnnquant2.js) ---- */

// Modified from:
// https://github.com/mcychan/PnnQuant.js/blob/master/src/pnnquant.js

/* Fast pairwise nearest neighbor based algorithm for multilevel thresholding
Copyright (C) 2004-2019 Mark Tyler and Dmitry Groshev
Copyright (c) 2018-2021 Miller Cy Chan
* error measure; time used is proportional to number of bins squared - WJ */

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function sqr(value) {
  return value * value;
}

function find_nn(bins, idx, hasAlpha) {
  var nn = 0;
  var err = 1e100;

  const bin1 = bins[idx];
  const n1 = bin1.cnt;
  const wa = bin1.ac;
  const wr = bin1.rc;
  const wg = bin1.gc;
  const wb = bin1.bc;
  for (var i = bin1.fw; i != 0; i = bins[i].fw) {
    const bin = bins[i];
    const n2 = bin.cnt;
    const nerr2 = (n1 * n2) / (n1 + n2);
    if (nerr2 >= err) continue;

    var nerr = 0;
    if (hasAlpha) {
      nerr += nerr2 * sqr(bin.ac - wa);
      if (nerr >= err) continue;
    }

    nerr += nerr2 * sqr(bin.rc - wr);
    if (nerr >= err) continue;

    nerr += nerr2 * sqr(bin.gc - wg);
    if (nerr >= err) continue;

    nerr += nerr2 * sqr(bin.bc - wb);
    if (nerr >= err) continue;
    err = nerr;
    nn = i;
  }
  bin1.err = err;
  bin1.nn = nn;
}

function create_bin() {
  return {
    ac: 0,
    rc: 0,
    gc: 0,
    bc: 0,
    cnt: 0,
    nn: 0,
    fw: 0,
    bk: 0,
    tm: 0,
    mtm: 0,
    err: 0,
  };
}

function bin_add_rgb(bin, r, g, b) {
  bin.rc += r;
  bin.gc += g;
  bin.bc += b;
  bin.cnt++;
}

function create_bin_list(data, format) {
  const bincount = format === "rgb444" ? 4096 : 65536;
  const bins = new Array(bincount);
  const size = data.length;

  /* Build histogram */
  // Note: Instead of introducing branching/conditions
  // within a very hot per-pixel iteration, we just duplicate the code
  // for each new condition
  if (format === "rgba4444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const a = (color >> 24) & 0xff;
      const b = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const r = color & 0xff;

      // reduce to rgb4444 16-bit uint
      const index = rgba8888_to_rgba4444(r, g, b, a);
      let bin = index in bins ? bins[index] : (bins[index] = create_bin());
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.ac += a;
      bin.cnt++;
    }
  }
  
  else if (format === "rgb444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const r = color & 0xff;

      // reduce to rgb444 12-bit uint
      const index = rgb888_to_rgb444(r, g, b);
      let bin = index in bins ? bins[index] : (bins[index] = create_bin());
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.cnt++;
    }
  } else {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const r = color & 0xff;

      // reduce to rgb565 16-bit uint
      const index = rgb888_to_rgb565(r, g, b);
      let bin = index in bins ? bins[index] : (bins[index] = create_bin());
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.cnt++;
    }
  }
  return bins;
}

function quantize(rgba, maxColors, opts = {}) {
  const {
    format = "rgb565",
    clearAlpha = true,
    clearAlphaColor = 0x00,
    clearAlphaThreshold = 0,
    oneBitAlpha = false,
  } = opts;

  if (!rgba || !rgba.buffer) {
    throw new Error('quantize() expected RGBA Uint8Array data');
  }
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
    throw new Error('quantize() expected RGBA Uint8Array data');
  }
  
  const data = new Uint32Array(rgba.buffer);

  let useSqrt = opts.useSqrt !== false;

  // format can be:
  // rgb565 (default)
  // rgb444
  // rgba4444

  const hasAlpha = format === "rgba4444";
  const bins = create_bin_list(data, format);
  const bincount = bins.length;
  const bincountMinusOne = bincount - 1;
  const heap = new Uint32Array(bincount + 1);

  /* Cluster nonempty bins at one end of array */
  var maxbins = 0;
  for (var i = 0; i < bincount; ++i) {
    const bin = bins[i];
    if (bin != null) {
      var d = 1.0 / bin.cnt;
      if (hasAlpha) bin.ac *= d;
      bin.rc *= d;
      bin.gc *= d;
      bin.bc *= d;
      bins[maxbins++] = bin;
    }
  }

  if (sqr(maxColors) / maxbins < 0.022) {
    useSqrt = false;
  }

  var i = 0;
  for (; i < maxbins - 1; ++i) {
    bins[i].fw = i + 1;
    bins[i + 1].bk = i;
    if (useSqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);
  }
  if (useSqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);

  var h, l, l2;
  /* Initialize nearest neighbors and build heap of them */
  for (i = 0; i < maxbins; ++i) {
    find_nn(bins, i, false);
    /* Push slot on heap */
    var err = bins[i].err;
    for (l = ++heap[0]; l > 1; l = l2) {
      l2 = l >> 1;
      if (bins[(h = heap[l2])].err <= err) break;
      heap[l] = h;
    }
    heap[l] = i;
  }

  /* Merge bins which increase error the least */
  var extbins = maxbins - maxColors;
  for (i = 0; i < extbins; ) {
    var tb;
    /* Use heap to find which bins to merge */
    for (;;) {
      var b1 = heap[1];
      tb = bins[b1]; /* One with least error */
      /* Is stored error up to date? */
      if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm) break;
      if (tb.mtm == bincountMinusOne)
        /* Deleted node */ b1 = heap[1] = heap[heap[0]--];
      /* Too old error value */ else {
        find_nn(bins, b1, false);
        tb.tm = i;
      }
      /* Push slot down */
      var err = bins[b1].err;
      for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
        if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err) l2++;
        if (err <= bins[(h = heap[l2])].err) break;
        heap[l] = h;
      }
      heap[l] = b1;
    }

    /* Do a merge */
    var nb = bins[tb.nn];
    var n1 = tb.cnt;
    var n2 = nb.cnt;
    var d = 1.0 / (n1 + n2);
    if (hasAlpha) tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
    tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
    tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
    tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
    tb.cnt += nb.cnt;
    tb.mtm = ++i;

    /* Unchain deleted bin */
    bins[nb.bk].fw = nb.fw;
    bins[nb.fw].bk = nb.bk;
    nb.mtm = bincountMinusOne;
  }

  // let palette = new Uint32Array(maxColors);
  let palette = [];

  /* Fill palette */
  var k = 0;
  for (i = 0; ; ++k) {
    let r = clamp(Math.round(bins[i].rc), 0, 0xff);
    let g = clamp(Math.round(bins[i].gc), 0, 0xff);
    let b = clamp(Math.round(bins[i].bc), 0, 0xff);

    let a = 0xff;
    if (hasAlpha) {
      a = clamp(Math.round(bins[i].ac), 0, 0xff);
      if (oneBitAlpha) {
        const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
        a = a <= threshold ? 0x00 : 0xff;
      }
      if (clearAlpha && a <= clearAlphaThreshold) {
        r = g = b = clearAlphaColor;
        a = 0x00;
      }
    }

    const color = hasAlpha ? [r, g, b, a] : [r, g, b];
    const exists = existsInPalette(palette, color);
    if (!exists) palette.push(color);
    if ((i = bins[i].fw) == 0) break;
  }

  return palette;
}

function existsInPalette(palette, color) {
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    let matchesRGB =
      p[0] === color[0] && p[1] === color[1] && p[2] === color[2];
    let matchesAlpha =
      p.length >= 4 && color.length >= 4 ? p[3] === color[3] : true;
    if (matchesRGB && matchesAlpha) return true;
  }
  return false;
}

// TODO: Further 'clean' palette by merging nearly-identical colors?

/* ---- palette mapping (applyPalette) and utilities (palettize.js) ---- */

function roundStep(byte, step) {
  return step > 1 ? Math.round(byte / step) * step : byte;
}

function prequantize(
  rgba,
  { roundRGB = 5, roundAlpha = 10, oneBitAlpha = null } = {}
) {
  const data = new Uint32Array(rgba.buffer);
  for (let i = 0; i < data.length; i++) {
    const color = data[i];
    let a = (color >> 24) & 0xff;
    let b = (color >> 16) & 0xff;
    let g = (color >> 8) & 0xff;
    let r = color & 0xff;

    a = roundStep(a, roundAlpha);
    if (oneBitAlpha) {
      const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
      a = a <= threshold ? 0x00 : 0xff;
    }
    r = roundStep(r, roundRGB);
    g = roundStep(g, roundRGB);
    b = roundStep(b, roundRGB);

    data[i] = (a << 24) | (b << 16) | (g << 8) | (r << 0);
  }
}

function applyPalette(rgba, palette, format = "rgb565") {
  if (!rgba || !rgba.buffer) {
    throw new Error('quantize() expected RGBA Uint8Array data');
  }
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
    throw new Error('quantize() expected RGBA Uint8Array data');
  }
  if (palette.length > 256) {
    throw new Error('applyPalette() only works with 256 colors or less');
  }

  const data = new Uint32Array(rgba.buffer);
  const length = data.length;
  const bincount = format === "rgb444" ? 4096 : 65536;
  const index = new Uint8Array(length);
  const cache = new Array(bincount);
  const hasAlpha = format === "rgba4444";

  // Some duplicate code below due to very hot code path
  // Introducing branching/conditions shows some significant impact
  if (format === "rgba4444") {
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const a = (color >> 24) & 0xff;
      const b = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const r = color & 0xff;
      const key = rgba8888_to_rgba4444(r, g, b, a);
      const idx = key in cache ? cache[key] : (cache[key] = nearestColorIndexRGBA(r, g, b, a, palette));
      index[i] = idx;
    }
  } else {
    const rgb888_to_key = format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const b = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const r = color & 0xff;
      const key = rgb888_to_key(r, g, b);
      const idx = key in cache ? cache[key] : (cache[key] = nearestColorIndexRGB(r, g, b, palette));
      index[i] = idx;
    }
  }

  return index;
}

function nearestColorIndexRGBA(r, g, b, a, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const a2 = px2[3];
    let curdist = sqr(a2 - a);
    if (curdist > mindist) continue;
    const r2 = px2[0];
    curdist += sqr(r2 - r);
    if (curdist > mindist) continue;
    const g2 = px2[1];
    curdist += sqr(g2 - g);
    if (curdist > mindist) continue;
    const b2 = px2[2];
    curdist += sqr(b2 - b);
    if (curdist > mindist) continue;
    mindist = curdist;
    k = i;
  }
  return k;
}

function nearestColorIndexRGB(r, g, b, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const r2 = px2[0];
    let curdist = sqr(r2 - r);
    if (curdist > mindist) continue;
    const g2 = px2[1];
    curdist += sqr(g2 - g);
    if (curdist > mindist) continue;
    const b2 = px2[2];
    curdist += sqr(b2 - b);
    if (curdist > mindist) continue;
    mindist = curdist;
    k = i;
  }
  return k;
}

function snapColorsToPalette(palette, knownColors, threshold = 5) {
  if (!palette.length || !knownColors.length) return;

  const paletteRGB = palette.map((p) => p.slice(0, 3));
  const thresholdSq = threshold * threshold;
  const dim = palette[0].length;
  for (let i = 0; i < knownColors.length; i++) {
    let color = knownColors[i];
    if (color.length < dim) {
      // palette is RGBA, known is RGB
      color = [color[0], color[1], color[2], 0xff];
    } else if (color.length > dim) {
      // palette is RGB, known is RGBA
      color = color.slice(0, 3);
    } else {
      // make sure we always copy known colors
      color = color.slice();
    }
    const r = nearestColorIndexWithDistance(
      paletteRGB,
      color.slice(0, 3),
      euclideanDistanceSquared
    );
    const idx = r[0];
    const distanceSq = r[1];
    if (distanceSq > 0 && distanceSq <= thresholdSq) {
      palette[idx] = color;
    }
  }
}


function nearestColorIndex(
  colors,
  pixel,
  distanceFn = euclideanDistanceSquared
) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return minDistIndex;
}

function nearestColorIndexWithDistance(
  colors,
  pixel,
  distanceFn = euclideanDistanceSquared
) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return [minDistIndex, minDist];
}

function nearestColor(
  colors,
  pixel,
  distanceFn = euclideanDistanceSquared
) {
  return colors[nearestColorIndex(colors, pixel, distanceFn)];
}

/* ---- GIFEncoder (index.js) ---- */

function GIFEncoder(opt = {}) {
  const { initialCapacity = 4096, auto = true } = opt;

  // Stream all encoded data into this buffer
  const stream = createStream(initialCapacity);

  // Shared array data across all frames
  const HSIZE = 5003; // 80% occupancy
  const accum = new Uint8Array(256);
  const htab = new Int32Array(HSIZE);
  const codetab = new Int32Array(HSIZE);

  let hasInit = false;

  return {
    reset() {
      stream.reset();
      hasInit = false;
    },
    finish() {
      stream.writeByte(constants.trailer);
    },
    bytes() {
      return stream.bytes();
    },
    bytesView() {
      return stream.bytesView();
    },
    get buffer() {
      return stream.buffer;
    },
    get stream() {
      return stream;
    },
    writeHeader,
    writeFrame(index, width, height, opts = {}) {
      const {
        transparent = false,
        transparentIndex = 0x00,
        delay = 0,
        palette = null,
        repeat = 0, // -1=once, 0=forever, >0=count
        colorDepth = 8,
        dispose = -1,
      } = opts;

      let first = false;
      if (auto) {
        // In 'auto' mode, the first time we write a frame
        // we will write LSD/GCT/EXT
        if (!hasInit) {
          // have not yet init, we can consider this our first frame
          first = true;
          // in 'auto' mode, we also encode a header on first frame
          // this is different than manual mode where you must encode
          // header yoursef (or perhaps not write header altogether)
          writeHeader();
          hasInit = true;
        }
      } else {
        // in manual mode, the first frame is determined by the options only
        first = Boolean(opts.first);
      }

      width = Math.max(0, Math.floor(width));
      height = Math.max(0, Math.floor(height));

      // Write pre-frame details such as repeat count and global palette
      if (first) {
        if (!palette) {
          throw new Error("First frame must include a { palette } option");
        }
        encodeLogicalScreenDescriptor(
          stream,
          width,
          height,
          palette,
          colorDepth
        );
        encodeColorTable(stream, palette);
        if (repeat >= 0) {
          encodeNetscapeExt(stream, repeat);
        }
      }

      const delayTime = Math.round(delay / 10);
      encodeGraphicControlExt(
        stream,
        dispose,
        delayTime,
        transparent,
        transparentIndex
      );

      const useLocalColorTable = Boolean(palette) && !first;
      encodeImageDescriptor(
        stream,
        width,
        height,
        useLocalColorTable ? palette : null
      );
      if (useLocalColorTable) encodeColorTable(stream, palette);
      encodePixels(
        stream,
        index,
        width,
        height,
        colorDepth,
        accum,
        htab,
        codetab
      );
    },
  };

  function writeHeader() {
    writeUTFBytes(stream, "GIF89a");
  }
}

function encodeGraphicControlExt(
  stream,
  dispose,
  delay,
  transparent,
  transparentIndex
) {
  stream.writeByte(0x21); // extension introducer
  stream.writeByte(0xf9); // GCE label
  stream.writeByte(4); // data block size

  if (transparentIndex < 0) {
    transparentIndex = 0x00;
    transparent = false;
  }

  var transp, disp;
  if (!transparent) {
    transp = 0;
    disp = 0; // dispose = no action
  } else {
    transp = 1;
    disp = 2; // force clear if using transparent color
  }

  if (dispose >= 0) {
    disp = dispose & 7; // user override
  }

  disp <<= 2;

  const userInput = 0;

  // packed fields
  stream.writeByte(
    0 | // 1:3 reserved
      disp | // 4:6 disposal
      userInput | // 7 user input - 0 = none
      transp // 8 transparency flag
  );

  writeUInt16(stream, delay); // delay x 1/100 sec
  stream.writeByte(transparentIndex || 0x00); // transparent color index
  stream.writeByte(0); // block terminator
}

function encodeLogicalScreenDescriptor(
  stream,
  width,
  height,
  palette,
  colorDepth = 8
) {
  const globalColorTableFlag = 1;
  const sortFlag = 0;
  const globalColorTableSize = colorTableSize(palette.length) - 1;
  const fields =
    (globalColorTableFlag << 7) |
    ((colorDepth - 1) << 4) |
    (sortFlag << 3) |
    globalColorTableSize;
  const backgroundColorIndex = 0;
  const pixelAspectRatio = 0;
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
}

function encodeNetscapeExt(stream, repeat) {
  stream.writeByte(0x21); // extension introducer
  stream.writeByte(0xff); // app extension label
  stream.writeByte(11); // block size
  writeUTFBytes(stream, "NETSCAPE2.0"); // app id + auth code
  stream.writeByte(3); // sub-block size
  stream.writeByte(1); // loop sub-block id
  writeUInt16(stream, repeat); // loop count (extra iterations, 0=repeat forever)
  stream.writeByte(0); // block terminator
}

function encodeColorTable(stream, palette) {
  const colorTableLength = 1 << colorTableSize(palette.length);
  for (let i = 0; i < colorTableLength; i++) {
    let color = [0, 0, 0];
    if (i < palette.length) {
      color = palette[i];
    }
    stream.writeByte(color[0]);
    stream.writeByte(color[1]);
    stream.writeByte(color[2]);
  }
}

function encodeImageDescriptor(stream, width, height, localPalette) {
  stream.writeByte(0x2c); // image separator

  writeUInt16(stream, 0); // x position
  writeUInt16(stream, 0); // y position
  writeUInt16(stream, width); // image size
  writeUInt16(stream, height);

  if (localPalette) {
    const interlace = 0;
    const sorted = 0;
    const palSize = colorTableSize(localPalette.length) - 1;
    // local palette
    stream.writeByte(
      0x80 | // 1 local color table 1=yes
        interlace | // 2 interlace - 0=no
        sorted | // 3 sorted - 0=no
        0 | // 4-5 reserved
        palSize // 6-8 size of color table
    );
  } else {
    // global palette
    stream.writeByte(0);
  }
}

function encodePixels(
  stream,
  index,
  width,
  height,
  colorDepth = 8,
  accum,
  htab,
  codetab
) {
  lzwEncode(width, height, index, colorDepth, stream, accum, htab, codetab);
}

// Utilities

function writeUInt16(stream, short) {
  stream.writeByte(short & 0xff);
  stream.writeByte((short >> 8) & 0xff);
}

function writeUTFBytes(stream, text) {
  for (var i = 0; i < text.length; i++) {
    stream.writeByte(text.charCodeAt(i));
  }
}

function colorTableSize(length) {
  return Math.max(Math.ceil(Math.log2(length)), 1);
}

/* ---- public API ---- */

const gifencApi = {
  GIFEncoder: GIFEncoder,
  quantize: quantize,
  prequantize: prequantize,
  applyPalette: applyPalette,
  nearestColorIndex: nearestColorIndex,
  nearestColor: nearestColor,
  nearestColorIndexWithDistance: nearestColorIndexWithDistance,
  snapColorsToPalette: snapColorsToPalette
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = gifencApi;
} else {
  window.gifenc = gifencApi;
}

})();
