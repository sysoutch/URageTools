# Sprite Idle / Jump Animator

A small browser tool that takes a **single sprite image** and creates simple procedural **idle** or **jump** animations from it.

The tool runs entirely in the browser and requires no server, build process, framework, or external dependencies. It is split into three files that sit next to each other: `index.html` (markup), `style.css` (styling), and `script.js` (behavior).

## Features

- Load a sprite from your computer
- Preview generated animation in real time
- Generate:
  - Idle animation
  - Jump animation
- Adjust:
  - Frame count
  - Frames per second
  - Motion amount
  - Squash and stretch
  - Lean / rotation
- Optional ground shadow
- Optional transparency checkerboard
- Pause and restart the preview
- Export the generated animation as a PNG sprite sheet (`Grid` or `Sideways` layout, chosen in the panel)
- Save the tool itself as one self-contained HTML file (works when the tool is served over http(s); opened straight from disk it reports the three-file layout instead)
- Pixel-art-friendly canvas rendering

## Requirements

Any reasonably modern browser with HTML5 Canvas support should work.

Examples:

- Chrome
- Firefox
- Edge
- Safari

No installation is required.

## Usage

1. Open `index.html` in your browser, keeping `style.css` and `script.js` in the same folder.
2. Click the sprite image input.
3. Select a PNG, WebP, GIF, or JPEG sprite.
4. Choose either `Idle` or `Jump`.
5. Adjust the animation controls.
6. Preview the result in the canvas.
7. Click `Export PNG sheet` to export the generated frames.

For sprites with transparency, PNG or WebP is recommended.

## Animation Controls

### Frames

Controls how many frames are generated for the animation cycle.

More frames generally produce smoother movement, but also create a wider exported sprite sheet.

### FPS

Controls preview playback speed.

This does not alter the number of frames in the exported sheet. Your game or animation system can choose its own playback speed later.

### Motion Amount

Controls the strength of the main movement.

For idle animations, this mostly affects vertical bobbing.

For jump animations, this controls jump height.

### Squash / Stretch

Applies scale deformation to make movement feel less rigid.

Idle animations use subtle breathing-like deformation.

Jump animations use stretching while airborne and compression around landing.

### Lean / Rotation

Adds rotational movement.

This can make a static sprite feel more animated without requiring individually drawn frames.

Use small values for pixel art unless the exaggerated wobble is intentional.

## Idle Animation

Idle mode generates a looping animation using:

- Vertical bobbing
- Small horizontal and vertical scale changes
- Slight rotation
- Shadow variation

It works best with characters that are already standing in a neutral pose.

## Jump Animation

Jump mode generates a jump arc using:

- Vertical displacement
- Stretching during ascent / airtime
- Squashing around landing
- Rotation through the jump
- Shadow shrinking while airborne

The sprite itself is not redrawn. The animation is produced using transformations applied to the original image.

## Sprite Sheet Export

The exported sprite sheet is:

- PNG format
- One animation frame per cell
- Currently exported using 256 × 256 pixel cells
- `Grid` (default): frames fill cells left to right, top to bottom, so long animations stay compact
- `Sideways`: all frames in one horizontal row

For example, an 8-frame animation exported as `Sideways` produces:

```text
[0][1][2][3][4][5][6][7]
```

The same 8 frames exported as `Grid` produce a 3 × 3 grid (reading order, last cell empty):

```text
[0] [1] [2]
[3] [4] [5]
[6] [7] [ ]
```

The sprite sheet can then be imported into engines such as:

- Godot
- Unity
- GameMaker
- Construct
- Phaser
- PixiJS
- custom HTML5 Canvas games

## Current Limitations

This tool creates animation by transforming one source sprite. It does **not** currently generate genuinely new hand-drawn poses.

That means:

- Arms and legs do not independently move
- Clothing and hair do not deform independently
- The sprite silhouette remains mostly unchanged
- Rotated pixel art may not look as clean as manually drawn animation
- Jump anticipation and landing poses are simulated rather than redrawn
- There is no automatic sprite trimming
- There is no frame-by-frame manual editor
- Export is currently limited to PNG sprite sheets (`Grid` or `Sideways` layouts, chosen in the panel)

For many simple games, prototypes, icons, NPCs, enemies, and decorative characters, that is still enough to squeeze suspicious amounts of life out of one image.

## File Structure

The project can currently be as simple as:

```text
project/
├── sprite_idle_jump_animator.html
└── README.md
```

Everything needed by the tool is contained inside the HTML file.

## Future Things To Do

Possible improvements for future versions:

- [ ] Add a **walk animation** generator
- [ ] Add a **run animation** generator
- [ ] Add a **hit / damage reaction**
- [ ] Add a **death animation**
- [ ] Add an **attack animation**
- [ ] Add **hover / floating** animation
- [ ] Add **breathing-only** idle presets
- [ ] Add multiple built-in idle and jump presets
- [ ] Add editable easing curves
- [ ] Add separate controls for horizontal and vertical motion
- [ ] Add anticipation before jumping
- [ ] Add stronger landing squash controls
- [ ] Add per-frame timeline editing
- [ ] Allow frame-by-frame manual offsets
- [ ] Allow frame-by-frame scale and rotation overrides
- [ ] Add onion-skin preview
- [ ] Add zoom and pan controls
- [ ] Add drag-and-drop sprite loading
- [ ] Add automatic transparent-border trimming
- [ ] Allow custom sprite-sheet cell sizes
- [ ] Export vertical sprite sheets
- [ ] Export sprite-sheet metadata as JSON
- [ ] Export CSS animation data
- [ ] Export Phaser-compatible frame data
- [ ] Export Godot SpriteFrames data
- [ ] Export individual PNG frames
- [ ] Export animated GIF
- [ ] Export animated WebP
- [ ] Add APNG export
- [ ] Add transparent-background preview options
- [ ] Add downloadable project presets
- [ ] Save and load animation settings
- [ ] Support multiple animations in one project
- [ ] Export all animations into one combined sprite sheet
- [ ] Add named animation ranges such as `idle`, `jump`, `attack`, etc.
- [ ] Add pivot / origin point controls
- [ ] Add configurable ground position
- [ ] Add optional motion blur for non-pixel-art sprites
- [ ] Improve pixel-perfect rotation handling
- [ ] Add nearest-neighbor scaling options
- [ ] Add mobile-friendly touch controls
- [ ] Add keyboard shortcuts
- [ ] Add undo / redo
- [ ] Add a before/after comparison view
- [ ] Allow importing an existing sprite sheet
- [ ] Add support for selecting one frame from an imported sheet
- [ ] Add automatic frame packing
- [ ] Add texture-atlas export
- [ ] Add local project autosave using browser storage

## Bigger Future Idea: Pose-Based Animation

A more advanced version could allow the user to mark body parts such as:

- Head
- Torso
- Left arm
- Right arm
- Left leg
- Right leg

The tool could then animate those pieces independently instead of transforming the whole sprite at once.

This would allow much better procedural animation while still starting from a single character image.

A possible workflow would be:

```text
Original Sprite
      ↓
Mark / separate body regions
      ↓
Define pivots
      ↓
Apply animation preset
      ↓
Adjust individual limbs
      ↓
Preview
      ↓
Export sprite sheet
```

## Another Future Idea: AI-Assisted Frames

A later version could optionally generate genuinely new animation frames from the source sprite while trying to preserve:

- Character identity
- Outfit
- Palette
- Pixel-art style
- Proportions
- Lighting direction

For example:

```text
Single standing sprite
        ↓
Generate jump poses
        ↓
Clean / align frames
        ↓
Preview animation
        ↓
Export sprite sheet
```

This would be substantially more complex than the current transform-based approach, because consistency between generated frames is the part where computers traditionally decide to become creative at exactly the wrong moment.

## Development Notes

The current implementation uses:

- HTML
- CSS
- JavaScript
- HTML5 Canvas
- `requestAnimationFrame`
- Canvas transforms for translation, scale, and rotation

No third-party libraries are required.

The code lives in three files: `index.html` links `style.css` in the document head and loads `script.js` at the end of the body.

## License

No license has been selected yet.

If this project is going to be published publicly, add a license file such as:

- MIT
- Apache-2.0
- GPL-3.0

Choose the license based on how you want others to use and redistribute the project.

## Status

Current status: **prototype / usable utility**

The existing version is suitable for quickly generating lightweight idle and jump motion from a single sprite, especially for prototypes and simple 2D game assets.
