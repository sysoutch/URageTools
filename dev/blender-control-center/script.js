const img = document.getElementById("screen");
const status = document.getElementById("stream-status");
const canUseLocalStream = !window.location.pathname.startsWith("/tools/");
let ws = null;

if (canUseLocalStream) {
    ws = new WebSocket("ws://127.0.0.1:8765");
} else {
    status.style.display = "grid";
}

if (ws) ws.binaryType = "arraybuffer";

let lastUrl = null;

if (ws) ws.onmessage = (event) => {
    const blob = new Blob([event.data], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);

    img.src = url;

    if (lastUrl) {
        URL.revokeObjectURL(lastUrl);
    }

    lastUrl = url;
};

function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function getScreenCoords(e) {
    const rect = img.getBoundingClientRect();

    const x = Math.round((e.clientX - rect.left) * window.devicePixelRatio);
    const y = Math.round((e.clientY - rect.top) * window.devicePixelRatio);

    return { x, y };
}

document.addEventListener("mousemove", (e) => {
    const p = getScreenCoords(e);

    send({
        type: "mouse_move",
        x: p.x,
        y: p.y
    });
});

document.addEventListener("mousedown", (e) => {
    e.preventDefault();

    send({
        type: "mouse_down",
        button: mapButton(e.button)
    });
});

document.addEventListener("mouseup", (e) => {
    e.preventDefault();

    send({
        type: "mouse_up",
        button: mapButton(e.button)
    });
});

document.addEventListener("wheel", (e) => {
    e.preventDefault();

    send({
        type: "scroll",
        dy: e.deltaY < 0 ? 5 : -5
    });
}, { passive: false });

document.addEventListener("keydown", (e) => {
    e.preventDefault();

    send({
        type: "key_down",
        key: e.key
    });
});

document.addEventListener("keyup", (e) => {
    e.preventDefault();

    send({
        type: "key_up",
        key: e.key
    });
});

function mapButton(button) {
    if (button === 0) return "left";
    if (button === 1) return "middle";
    if (button === 2) return "right";
    return "left";
}

document.addEventListener("contextmenu", e => e.preventDefault());