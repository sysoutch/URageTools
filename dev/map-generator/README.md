# Map Generator Tool

A combined 2D and 3D map generator tool with a unified interface. Accessible via tabs: **2D** and **3D**.

## Structure

```
map-generator/
├── index.html          # Main entry point (tab bar + iframe switcher)
├── README.md           # This file
├── css/
│   ├── tab-bar.css     # Tab bar styling
│   └── styles.css      # Shared layout styles
├── images/             # Shared icons and backgrounds
├── js/
│   └── tab-bar.js      # Tab switching logic
├── 2d/                 # 2D Map Generator (standalone)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── images/
└── 3d/                 # 3D Model Sharer (standalone)
    ├── index.html
    ├── css/
    └── js/
```

## Usage

Open `index.html` in a browser. Use the **2D** tab for tile-based map generation (topdown, isometric, sidescroller) and the **3D** tab for 3D model viewing/sharing.

### 2D Tab Features
- **Topdown Mode**: Flat or 3/4 RPG depth rendering
- **Isometric Mode**: Angled 2.5D diamond-tile style
- **Sidescroller Mode**: Left-to-right terrain generation
- Sprite upload and management
- Mirror options (horizontal, vertical, diagonal)
- Map export as JSON or image

### 3D Tab Features
- Three.js-based 3D model viewer
- Model rotation, zoom, pan controls
- Theme customization
- Screenshot capture

## Dependencies

### Shared
- Font Awesome 6+ (via `../../shared/libs/fontawesome/`)
- Dashboard theme bridge (`../../shared/dashboard-theme.js`)

### 2D Tab (CDN)
- Bootstrap 5.3+ (jsdelivr CDN)
- Popper.js 2.x (jsdelivr CDN)

### 3D Tab (local)
- Three.js (via `../../shared/libs/three/`)

## Development Notes

- Each tab's content is loaded in an `<iframe>` for isolation
- Tab state persists via URL hash (`#2d` or `#3d`)
- The main `index.html` handles only the tab bar UI
- All 2D and 3D logic lives inside their respective subdirectories

## License

See individual `LICENSE` files in each subdirectory for component licenses.