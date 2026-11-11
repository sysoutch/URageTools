# Background Remover

Cuts a plain background out of an image, right in the browser. No AI model,
no ComfyUI, nothing uploaded.

## How it works

It is colour keying with a soft edge. Every pixel's transparency comes from its
distance (in RGB) to the nearest background colour:

- closer than **Tolerance**: fully transparent;
- farther than Tolerance + **Edge softness**: kept as it is;
- in between: faded, so edges stay smooth.

Two extras keep the subject clean:

- **Only background touching the edges** (on by default): only pixels connected
  to the image border are removed, so matching colours inside the subject
  (white eyes, a white shirt) stay.
- **Remove the colour fringe**: fading edge pixels have the background colour
  taken back out, so there is no white halo on a dark page.

This is the same method used to cut out the frame art on urage.net.

## Use

1. Open, drop or paste an image. The colours along its edges are picked for you.
2. Click the image to add more background colours (up to six); click a chip to remove one.
3. Tune Tolerance and Edge softness; switch the preview background to check the edges.
4. Download the PNG, optionally trimmed to the visible pixels.

Works best on images with a plain, even background, such as AI renders on white.

## Code

- `js/keyer.js`: the keying, edge flood fill, colour suggestions and trim bounds. No DOM.
- `js/main.js`: loading, colour picking, preview, export, dashboard hooks.

## Dashboard integration

- Uses `data-dashboard-theme` and the shared dashboard theme bridge.
- `window.__urageToolDescribeCurrentAsset()` returns the cut-out as a PNG.
- `window.__urageToolLoadAssetPayload()` accepts an image (`dataUrl` or `url`).
- Exposes one dashboard sidebar marker.
