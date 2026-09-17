(function() {
    "use strict";

    function nameFromPayload(payload) {
        return String(payload && (payload.fileName || payload.imageFileName) || "tool-resource").trim() || "tool-resource";
    }

    function sourceFromPayload(payload) {
        return String(payload && (payload.dataUrl || payload.sourceUrl || payload.url) || "").trim();
    }

    async function createFile(payload) {
        var source = sourceFromPayload(payload);
        if (!source) throw new Error("The received resource has no readable file source.");
        var response = await fetch(source);
        if (!response.ok) throw new Error("The received resource could not be downloaded.");
        var blob = await response.blob();
        return new File([blob], nameFromPayload(payload), { type: blob.type || String(payload.mimeType || "application/octet-stream") });
    }

    function findFileInput(payload) {
        var resourceKind = String(payload && payload.kind || "").toLowerCase();
        var inputs = Array.prototype.slice.call(document.querySelectorAll('input[type="file"]'));
        return inputs.find(function(input) {
            var accepts = String(input.accept || "").toLowerCase();
            return !accepts || resourceKind !== "image" || accepts.indexOf("image") !== -1;
        }) || inputs[0] || null;
    }

    async function loadAsset(payload) {
        var textContent = String(payload && payload.textContent || "");
        if (textContent) {
            var textInput = document.querySelector("textarea, input[type='text'], [contenteditable='true']");
            if (!textInput) throw new Error("This tool has no text input for the received resource.");
            if ("value" in textInput) textInput.value = textContent;
            else textInput.textContent = textContent;
            textInput.dispatchEvent(new Event("input", { bubbles: true }));
            textInput.dispatchEvent(new Event("change", { bubbles: true }));
            return;
        }
        var input = findFileInput(payload);
        if (!input) throw new Error("This tool has no file input for the received resource.");
        var transfer = new DataTransfer();
        transfer.items.add(await createFile(payload));
        input.files = transfer.files;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (typeof window.registerDashboardToolBridge === "function") {
        window.registerDashboardToolBridge({ onLoadAsset: loadAsset });
    }
})();
