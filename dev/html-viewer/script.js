let timeout;

function debouncedUpdate() {
    document.getElementById('status').innerText = "Typing...";
    clearTimeout(timeout);
    timeout = setTimeout(update, 500);
}

function update() {
    const html = document.getElementById("html-code").value;
    const css = "<style>" + document.getElementById("css-code").value + "</style>";
    const js = "<script>" + document.getElementById("js-code").value + "<\/script>";

    const output = document.getElementById("output").contentWindow.document;

    output.open();
    output.write(html + css + js);
    output.close();

    document.getElementById('status').innerText = "Ready";
}

// 1. Share Functionality with Base64 encoding
async function shareProject() {
    const codeState = {
        h: document.getElementById("html-code").value,
        c: document.getElementById("css-code").value,
        j: document.getElementById("js-code").value
    };

    // Encode to Base64, then make it URL safe
    const jsonStr = JSON.stringify(codeState);
    const base64Code = btoa(unescape(encodeURIComponent(jsonStr)));

    // Use encodeURIComponent on the base64 string itself to protect '+' and '=' characters
    const shareUrl = window.location.origin + window.location.pathname + "?code=" + encodeURIComponent(base64Code);

    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Modern Web Playground',
                text: 'Check out my code!',
                url: shareUrl
            });
        } else {
            await navigator.clipboard.writeText(shareUrl);
            alert('Shareable link copied to clipboard!');
        }
    } catch (err) {
        console.error('Error sharing:', err);
    }
}

// 2. Hydration logic to load code from URL on startup
function loadFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');

    if (codeParam) {
        try {
            // decodeURIComponent is handled by urlParams.get, 
            // but we use atob on the raw string
            const decodedData = JSON.parse(decodeURIComponent(escape(atob(codeParam))));

            document.getElementById("html-code").value = decodedData.h || '';
            document.getElementById("css-code").value = decodedData.c || '';
            document.getElementById("js-code").value = decodedData.j || '';
        } catch (e) {
            console.error("Failed to decode URL parameters", e);
            // Optional: Alert the user that the link was malformed
        }
    }
    update();
}

window.onload = loadFromUrl;