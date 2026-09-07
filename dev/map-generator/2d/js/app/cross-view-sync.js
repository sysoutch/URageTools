(function () {
  // =========================================================
  // CROSS-VIEW MAP SYNC (2D SIDE)
  // =========================================================
  // Keeps the 2D and 3D tabs sharing one generated map: every completed generation publishes
  // grid + sprites to the shell, which relays it into the other view. When the 3D tab publishes
  // its own blockout, this canvas is redrawn from that data using the normal topdown pipeline.

  function clone(grid) { return Array.isArray(grid) ? grid.map(function (row) { return Array.isArray(row) ? row.slice() : []; }) : []; }
  // Embed a self-contained copy of each sprite so the 3D view can always load it - even when
  // cross-origin rules (e.g. file://) would taint its WebGL canvas. Returns null when the image
  // cannot be read, in which case receivers fall back to the plain URL.
  function imageData(image) {
    try {
      var width = image && (image.naturalWidth || image.width);
      var height = image && (image.naturalHeight || image.height);
      if (!image || !image.src || !width || !height) return null;
      var scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      var context = scratch.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return scratch.toDataURL("image/png");
    } catch (error) {
      return null;
    }
  }

  function spriteSources() {
    var sources = [];
    (window.spriteTypes || []).forEach(function (type) {
      var image = document.getElementById(type.imageId);
      if (!image || !image.src) return;
      sources.push({ id: type.id, src: image.src, dataUrl: imageData(image) });
    });
    return sources;
  }

  function playerSpriteSources() {
    var marker = window.playerMarkerConfig;
    if (!marker || !Array.isArray(marker.variantImageIds)) return [];
    return marker.variantImageIds.map(function (imageId) {
      var image = document.getElementById(imageId);
      return { src: (image && image.src) || "", dataUrl: imageData(image) };
    }).filter(function (sprite) { return sprite.src; });
  }
  function snapshot() {
    return { version: 2, mode: window.generatorMode || "topdown", seed: window.lastGenerationSeedLabel || "random", map: clone(window.currentMap), items: clone(window.currentItems), players: (window.currentPlayers || []).map(function (player) { return { col: player.col, row: player.row, variantIndex: player.variantIndex || 0 }; }), sprites: spriteSources(), playerSprites: playerSpriteSources(), playerSprite: (window.playerMarkerConfig && document.getElementById(window.playerMarkerConfig.imageId) || {}).src || "" };
  }

  var publishTimer = null;
  function publish() { window.parent.postMessage({ type: "urage-map-generator-snapshot", source: "2d", snapshot: snapshot() }, "*"); }
  // Debounced so the auto-generate loop does not flood the shell with snapshots.
  function schedulePublish() { if (publishTimer) clearTimeout(publishTimer); publishTimer = setTimeout(function () { publishTimer = null; publish(); }, 120); }
  function renderSnapshot(data) {
    window.currentMap = clone(data.map);
    window.currentItems = clone(data.items);
    window.currentPlayers = Array.isArray(data.players) ? data.players.map(function (player) { return { col: player.col, row: player.row, variantIndex: player.variantIndex || 0 }; }) : [];
    if (typeof data.seed === "string" && data.seed) window.lastGenerationSeedLabel = data.seed;

    // Redraw through the normal topdown pipeline so both tabs render pixel-identically.
    if (!window.getSpriteType || !window.resizeCanvasForMap || typeof window.drawTopdownMapFromData !== "function") return;
    var cols = Math.max.apply(Math, [1].concat(window.currentMap.map(function (row) { return row.length; })));
    var rows = Math.max(1, window.currentMap.length);
    var platformImg = window.getSpriteImage(window.getSpriteType("platform"));
    if (!platformImg) return;
    var stepX = window.getDrawWidth(platformImg);
    var stepY = window.getDrawHeight(platformImg);
    resizeCanvasForMap(cols, rows, mapStartX, mapStartY, stepX, stepY, mapEndX, mapEndY);
    drawTopdownMapFromData(cols, rows, platformImg, window.getSpriteImage(window.getSpriteType("hole")), stepX, stepY);
    if (typeof window.updatePreviewStats === "function") window.updatePreviewStats();
  }
  window.__urageGetSharedMap = snapshot;
  window.__urageApplySharedMap = function (data) { if (data && Array.isArray(data.map)) renderSnapshot(data); };
  // Publish after every completed generation - manual clicks, the auto-generate loop and option-driven
  // regenerations all funnel through generateMap(), so both tabs stay on the same map.
  var originalGenerate = window.generateMap;
  window.generateMap = function () { var result = originalGenerate.apply(this, arguments); schedulePublish(); return result; };
}());