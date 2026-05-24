(function() {
  "use strict";

  function getMapFileName(extension) {
    if (typeof buildMapExportName === "function") {
      return buildMapExportName(extension);
    }
    var mode = typeof generatorMode === "string" && generatorMode ? generatorMode : "map";
    return "map-" + mode + extension;
  }

  function buildGeneratedMapPayload() {
    if (!window.MapGeneratorExport || typeof window.MapGeneratorExport.buildPayload !== "function") {
      return null;
    }
    return window.MapGeneratorExport.buildPayload({
      generatorMode: typeof generatorMode !== "undefined" ? generatorMode : "topdown",
      lastGenerationSeedLabel: typeof lastGenerationSeedLabel !== "undefined" ? lastGenerationSeedLabel : "random",
      currentMap: typeof currentMap !== "undefined" ? currentMap : [],
      currentItems: typeof currentItems !== "undefined" ? currentItems : [],
      currentPlayers: typeof currentPlayers !== "undefined" ? currentPlayers : [],
      spriteTypes: typeof spriteTypes !== "undefined" ? spriteTypes : [],
      setupPayload: typeof buildSetupPayload === "function" ? buildSetupPayload() : null
    });
  }

  function buildCanvasDescriptor() {
    if (typeof canvas === "undefined" || !canvas || !canvas.width || !canvas.height) {
      return null;
    }
    try {
      var dataUrl = canvas.toDataURL("image/png");
      return {
        kind: "image",
        title: "Generated 2D Map PNG",
        fileName: getMapFileName(".png"),
        mimeType: "image/png",
        dataUrl: dataUrl,
        width: canvas.width,
        height: canvas.height,
        previewKind: "image",
        previewUrl: dataUrl,
        sourceDetail: "Rendered PNG from the 2D Map Generator.",
        metadata: {
          sourceTool: "2d-map-generator",
          generatorMode: typeof generatorMode !== "undefined" ? generatorMode : ""
        }
      };
    } catch (_) {
      return null;
    }
  }

  function buildJsonDescriptor(title, fileName, payload, format) {
    if (!payload) {
      return null;
    }
    var text = JSON.stringify(payload, null, 2);
    return {
      kind: "text",
      title: title,
      fileName: fileName,
      mimeType: "application/json",
      textContent: text,
      previewKind: "text",
      previewText: text,
      sourceDetail: title + " from the 2D Map Generator.",
      metadata: {
        sourceTool: "2d-map-generator",
        resourceFormat: format,
        generatorMode: typeof generatorMode !== "undefined" ? generatorMode : ""
      }
    };
  }

  function describeCurrentAssets() {
    var descriptors = [];
    var canvasDescriptor = buildCanvasDescriptor();
    var generatedMapPayload = buildGeneratedMapPayload();
    var setupPayload = typeof buildSetupPayload === "function" ? buildSetupPayload() : null;
    if (canvasDescriptor) {
      descriptors.push(canvasDescriptor);
    }
    var mapDescriptor = buildJsonDescriptor("Generated 2D Map JSON", getMapFileName(".json"), generatedMapPayload, "map-generator-json");
    var setupDescriptor = buildJsonDescriptor("2D Map Generator Setup JSON", "map-generator-setup.json", setupPayload, "map-generator-setup-json");
    if (mapDescriptor) {
      descriptors.push(mapDescriptor);
    }
    if (setupDescriptor) {
      descriptors.push(setupDescriptor);
    }
    return descriptors;
  }

  window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
  window.__urageToolDescribeCurrentAsset = function() {
    return describeCurrentAssets()[0] || null;
  };
})();
