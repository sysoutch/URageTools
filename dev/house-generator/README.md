# Habitat Lab — 3D House Generator

An interactive, procedural house generator built with **Three.js**. Design multi-story homes, explore furnished rooms in 3D, and export screenshots, all from a single HTML file.

## Features

- Generate houses with **1–4 floors** and **2–9 rooms per floor**.
- Adjust the house footprint (8–20 m width, with depth calculated automatically).
- Change the layout using **Balanced**, **Open-plan**, or **Cozy** presets.
- Select a design style: **Modern minimalist**, **Scandinavian**, **Warm contemporary**, or **Industrial loft**.
- Choose flooring: **Natural oak**, **Smoked walnut**, **Polished concrete**, or **Pale stone tile**.
- Optionally generate furniture, plants, rugs, decorations, windows, interior walls, doors, and staircases.
- View the whole building or select individual floors.
- Switch between 3D and top-down floor-plan views.
- Randomize layouts with a seed, auto-rotate the camera, and save a PNG screenshot.
- See live summary statistics for total floor area, rooms, and bedrooms.

## Getting started

### Option 1: Open the HTML file

1. Download or copy `house-generator.html`.
2. Open it in a modern browser.
3. Use the controls on the left and select **Generate house**.

**Internet access is required** to download Three.js modules from the jsDelivr CDN. Some browsers restrict ES module imports when opening local `file://` URLs. If the 3D scene is blank, use the local-server option below.

### Option 2: Run a local server (recommended)

With Python 3 installed, open a terminal in the folder containing `house-generator.html` and run:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000/house-generator.html
```

No build step, npm installation, or backend is required.

## Controls

| Action | Control |
| --- | --- |
| Rotate camera | Left-click and drag |
| Zoom | Mouse wheel / trackpad scroll |
| Pan camera | Right-click and drag |
| Reset to angled view | **3D view** |
| Look from above | **Floor plan** |
| Rotate automatically | **Auto-rotate** |
| Show all stories or one story | **Visible floor** dropdown |
| Generate with current settings | **Generate house** |
| Create a new random configuration | **Randomize seed** |
| Download screenshot | **Save image** |

## How generation works

The generator divides each floor footprint into rooms, assigns room types, constructs walls, doors, and other features, then places simplified procedural furniture where enabled. The seed controls randomized layout choices; keeping the same seed and settings generally reproduces the same arrangement.

Upper floors are stacked vertically, and staircases can be enabled or disabled. The floor selector helps inspect an individual story without upper levels blocking the view.

## Technology

- HTML, CSS, and vanilla JavaScript
- [Three.js](https://threejs.org/) **v0.160.1**, loaded through a CDN import map
- Three.js `OrbitControls` for camera navigation
- WebGL for rendering

## Project files

```text
project/
├── house-generator.html   # Complete application
└── README.md              # This documentation
```

## Known limitations

- This is a **conceptual visualization tool**, not architectural, engineering, or permit-ready software.
- The doors and staircases are simplified visual representations. Their locations, clearances, and accessibility are not guaranteed to meet building codes.
- Rooms and furniture are generated procedurally; individual furniture pieces cannot currently be dragged or edited.
- No built-in 3D model export, saved project format, structural simulation, or validated construction drawings.
- A browser with WebGL support and internet connectivity is needed.

## Customization and development

The entire application is contained in `house-generator.html`. Modify its HTML controls, CSS, or JavaScript to add new room types, furniture objects, materials, generation rules, and output formats. Start with the `generate()` function and related room, door, and staircase helpers.

## License

No license has been specified for this project. Add a `LICENSE` file if you plan to distribute or publish it.
