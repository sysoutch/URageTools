# Image → ASCII HTML

Convert a single image — or an entire sequence of frames (animated GIFs included) — into ASCII art, with animated HTML export and manual or automatic background removal. Built for pasting into Discord, terminals, and any plain-text context.

## Description

Image → ASCII HTML is a standalone web tool that rasterizes an image on an offscreen canvas, maps each pixel's luminance to a character from a selectable charset, and renders the result as live-previewable monospace text. Load multiple images at once (or in successive picks) to build an animated sequence: every frame is converted onto one shared grid, played back with Play/Pause and FPS controls, and exported as a self-contained animated HTML page. Animated GIFs are decoded fully into their individual frames — disposal methods and transparency included — so they play correctly instead of showing only the first frame. Removed or empty areas can be filled with an invisible Unicode character (U+2800 Braille Pattern Blank) so the art keeps its alignment when pasted into chat apps that collapse ordinary spaces.

Everything runs locally in the browser: no uploads, no server, and no network requests — the only third-party code is a small vendored MIT-licensed GIF decoder (`omggif.js`).

## Features

- **Live Preview**: The ASCII output re-renders instantly as you change any control
- **Animated Sequences**: Load multiple images (or append more later) to build a frame sequence. All frames share one grid, so differing aspect ratios are letterboxed with empty characters and the animation stays stable between frames. Scrub by clicking thumbnails, pause/resume at will, and set 2–30 FPS
- **Animated GIF Input**: Drop in an animated `.gif` and every frame is decoded into the sequence (partial frames, transparency, and disposal methods handled). The FPS slider is preset from the GIF's average frame delay so it plays at its native speed
- **Animated HTML Export**: With two or more frames, Copy/Download produces a self-contained page that plays the sequence on its own (frames embedded as JSON plus a tiny script); single images keep the original static export
- **Width Control**: 30–250 characters wide; height is derived from the image aspect ratio with a monospace character-aspect correction (0.5)
- **Four Character Sets**: Dense (`@%#*+=-:. `), Blocks (`█▓▒░ `), Detailed (`MWNXK0Okxdolc:,. `), Classic (`@#S%?*+;:,.'`)
- **Contrast & Brightness**: Contrast 0.5–2.5 (applied around the mid-gray point) and brightness −100 to +100 for tuning tonal mapping
- **Color Modes**: Monochrome, Original colors (per-character `rgba` spans), or Terminal green
- **Manual Background Removal**: Remove white, black, or transparent pixels with adjustable tolerance and a soft-edge ramp for gradual transitions
- **Automatic Background Detection**: Detects the background character from the generated ASCII itself — either the dominant character across the whole grid or the most common character along the outer border (best when the subject is centered)
- **Discord-Safe Empty Character**: Removed areas use U+2800 Braille Pattern Blank by default, a real invisible Unicode character that survives copy/paste far better than ordinary spaces; normal space and visible dot (`·`) are also available
- **Four Export Options**: Copy plain ASCII text, copy a standalone HTML document, download it as `ascii-art.html`, or download the current frame rendered to an image (`ascii-art.png` — in multi-frame mode: `ascii-art-frame-N.png`) with colors matching the selected color mode

## How to Use

1. **Upload Images**
   - Click "Choose images" and pick one or more browser-supported images (JPG, PNG, GIF, WebP, …) — the selection order becomes the frame order
   - Animated `.gif` files are decoded into all of their frames at once; the FPS slider is set from the GIF's average delay so it plays at its native speed
   - Pick again any time to append more frames; use the × on a thumbnail to remove it or "Clear all" to start over
   - The preview renders immediately and starts playing when there is more than one frame

2. **Tune the Output**
   - Set the target width with the slider (30–250 characters)
   - Pick a character set that fits the subject (Blocks for bold shapes, Detailed for fine texture)
   - Adjust contrast and brightness until the tonal mapping looks right

3. **Remove the Background** *(optional)*
   - **Manual**: choose White, Black, or Transparent, then tune Tolerance (0–150) and Edge softness (0–60). Softness fades removed pixels in gradually instead of cutting them hard
   - **Automatic**: choose *Auto — dominant ASCII* to blank out the most frequent character in the whole grid, or *Auto — edge ASCII* to use the most common border character. The status line reports which character was detected

4. **Choose Color Mode and Empty Character**
   - Monochrome for plain-text pasting, Original colors or Terminal green for the HTML export
   - Keep "Invisible — Discord safe" (U+2800) unless you specifically want visible spaces or dots

5. **Animate the Sequence** *(only with multiple frames)*
   - Use **Play/Pause** to stop and start playback, click any thumbnail to jump straight to that frame (this also pauses), and set the speed with the FPS slider (2–30)

6. **Export**
   - **Copy ASCII**: copies the current frame's plain text to the clipboard
   - **Copy HTML / Download HTML**: produces a self-contained page with a black background and monospace `<pre>` — ideal for sharing colored output. With multiple frames it embeds all of them and plays the animation automatically; single images keep the static export
   - **Download PNG**: renders the current frame to an image (16px Courier New on black) honoring the selected color mode, so the art can be shared where monospace fonts don't render — `ascii-art.png` for a single frame, `ascii-art-frame-N.png` when several frames are loaded

> Tip: for best alignment in Discord, paste the ASCII inside a code block using triple backticks.

## Controls Reference

| Control | Options / Range | Default |
| --- | --- | --- |
| Width | 30–250 characters | 100 |
| Character set | Dense · Blocks · Detailed · Classic | Dense |
| Contrast | 0.5–2.5 (step 0.1) | 1.0 |
| Brightness | −100 to +100 | 0 |
| Color mode | Monochrome · Original colors · Terminal green | Monochrome |
| Remove | Nothing · White · Black · Transparent · Auto — dominant · Auto — edge | Nothing |
| Tolerance (manual removal) | 0–150 | 30 |
| Edge softness (manual removal) | 0–60 | 10 |
| FPS (animation, multiple frames only) | 2–30 | 10 |
| Empty character | Invisible U+2800 · Normal space · Visible dot `·` | Invisible U+2800 |

## Technical Details

### How It Works

The conversion pipeline runs entirely on the HTML5 Canvas API:

1. **Rasterize**: Each frame is drawn onto a hidden canvas sized to the target width. All frames share one grid whose height equals the tallest frame's natural height — `round(imageHeight / imageWidth × width × 0.5)` per frame, because monospace glyphs are roughly twice as tall as they are wide; shorter frames are letterboxed with empty characters so the animation stays stable
2. **Read Pixels**: Pixel data is read with `getImageData()` (the context uses `willReadFrequently: true`)
3. **Luminance**: Each pixel is converted to gray using Rec. 709 weights — `0.2126·R + 0.7152·G + 0.0722·B`. Fully transparent pixels are read as white so they map to the lightest charset glyph
4. **Tone Mapping**: Brightness is added, then contrast is applied around mid-gray (`(gray − 128) × contrast + 128`), clamped to 0–255
5. **Character Mapping**: The adjusted gray value indexes into the selected charset — darker pixels become denser characters
6. **Background Pass**: Removed or detected-background cells are replaced with the chosen empty character; in monochrome mode, ordinary spaces from the charset are swapped for it as well so large light areas stay alignment-safe

### Background Removal Modes

- **White / Black**: Euclidean RGB distance to `[255, 255, 255]` or `[0, 0, 0]`. Pixels within *tolerance* are fully removed; pixels between *tolerance* and *tolerance + softness* get a gradual alpha ramp for softer edges
- **Transparent**: Preserves the source image's own alpha channel
- **Auto — dominant**: Counts every character in the generated grid and blanks out the most frequent one (works when the background dominates the frame)
- **Auto — edge**: Counts only the outer border of the grid and blanks out its most common character (usually more reliable when the subject occupies the center)

### Animation & Frame Handling

- Frames are stored in selection order and re-rendered together whenever any control changes (coalesced to one rebuild per animation frame via `requestAnimationFrame`)
- Every frame is converted onto the shared grid described above, so differing aspect ratios never shift the output between frames — letterbox cells outside a frame's image area are filled with the empty character and excluded from automatic background detection
- Playback is driven by a `setInterval` timer at `1000 / FPS`; clicking a thumbnail pauses playback and jumps to that frame, and Play/Pause toggles the timer
- Animated GIFs are decoded with the vendored `omggif.js` reader: each frame's LZW data is expanded into palette indices, transparent pixels keep alpha 0, and frames are composited onto a persistent canvas honoring the previous frame's disposal method (2 = clear its region, 3 = restore a snapshot taken before it was drawn). The FPS slider is preset from the average non-zero frame delay (centiseconds → `round(100 / avg)`, clamped to 2–30)
- The animated export embeds all pre-rendered frames as a JSON array plus a ~10-line script that cycles them at the chosen interval — no external assets or network access needed by the exported page

### Discord-Safe Output

Ordinary spaces are often collapsed or trimmed by chat clients, which breaks ASCII alignment. By default this tool fills empty cells with U+2800 **Braille Pattern Blank** — an invisible but real Unicode character that preserves monospace column alignment through copy/paste. The status line shows `empty: U+2800` when it is active.

### Browser Compatibility

- Any modern evergreen browser (Chrome, Edge, Firefox, Safari) with HTML5 Canvas support
- Clipboard export uses the async Clipboard API and falls back to a hidden-textarea `execCommand("copy")` where it is unavailable

### Dependencies

- Pure JavaScript for all tool logic — no frameworks and no network requests
- `omggif.js` (vendored, MIT) — GIF 87a/89a reader used only to decode animated GIF input
- HTML5 Canvas API for pixel access
- Async Clipboard API (with legacy fallback)

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Standalone entry point with all controls and the live preview |
| `script.js` | Image/frame loading, GIF decoding, luminance/charset mapping, background removal, playback controls, clipboard, HTML export, and PNG rendering |
| `omggif.js` | Vendored MIT-licensed GIF decoder (Dean McNamee's omggif) for animated GIF input |
| `style.css` | Tool presentation (dark panel layout, preview typography) |

Open `index.html` directly in a browser — no server or build step is required.

## Author

URageTools - A collection of web-based design and development utilities

This tool lives in the [Art category](../README.md) of the [URage Tools repository](../../README.md).

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.
