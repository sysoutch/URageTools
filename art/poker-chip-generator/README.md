# 🎰 Pixel Poker Chip Generator

A standalone **HTML5 pixel-art poker chip generator** that procedurally creates randomized poker chips in different colors, patterns, styles, and denominations.

No frameworks, libraries, images, servers, or build tools are required.

Just open the HTML file in a browser and start generating chips.

## ✨ Features

- 🎲 Generate multiple poker chips at once
- 🃏 Support for 1–20 chips
- 💰 Multiple chip denominations
- 🎨 Procedurally generated colors and designs
- 🔀 Randomized chip styles
- 🧩 Multiple pixel-art patterns
- 🎚️ Adjustable edge-notch thickness (from a 1px mark to a near-solid rim with only ~1px gaps, or off)
- 🪞 Pixel-exact mirror symmetry on both axes for rings and patterns
- 🌈 Several visual themes
- 🔢 Pixel-art value lettering
- 🎯 Seed-based generation
- ♻️ Reroll individual chips
- 🖼️ Export individual chips as PNG
- 📦 Export the complete chip collection as a PNG sheet
- 🕹️ Multiple pixel resolutions
- 🌐 Works completely offline
- 📱 Responsive interface

## 🎨 Styles

The generator includes several built-in visual styles:

- **Classic Casino**
- **Neon**
- **Retro Arcade**
- **Royal**
- **Cyberpunk**
- **Monochrome**
- **Gold**
- **Completely Random**

The random mode can select a different visual theme for every chip.

## 🧩 Patterns

Available chip patterns include:

- Dots
- Diamonds
- Stars
- Bars
- Cross
- None
- Random

Patterns are procedurally drawn directly onto the chip.

## 💵 Chip Values

Several denomination sets are available.

### Standard Poker

```
$1
$5
$25
$100
$500
$1K
$5K
$25K
```

### Money

```
$1
$5
$10
$20
$50
$100
$500
$1K
```

### Casino

```
1
5
25
100
500
1K
5K
10K
```

### Random

The generator randomly selects from a larger collection of denominations.

## 🎲 Seeds

The generator uses a deterministic random-number system.

This means a seed can be used to reproduce a particular collection of chips.

For example:

```
casino-demo-001
```

Enter the seed and generate the chips again to reproduce the same designs.

Changing the seed produces a different collection.

## 🖥️ Installation

No installation is required.

### 1\. Download or copy the project

Save the generator as:

```
poker-chip-generator.html
```

### 2\. Open it

Double-click the file or open it in a modern web browser.

That's it.

There is no:

```
npm install
```

No:

```
npm run build
```

And no web server is required.

## 🌐 Browser Support

The generator is designed for modern browsers supporting HTML5 Canvas.

Recommended browsers include:

- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Safari

## 🖼️ Pixel Art Rendering

The generator creates the chips at a relatively small internal resolution such as:

```
32 × 32
40 × 40
48 × 48
64 × 64
```

The resulting image is displayed using pixelated scaling.

This preserves hard pixel edges instead of applying smooth anti-aliasing.

For example:

```
40 × 40
```

can be displayed much larger while maintaining a pixel-art appearance.

## 📦 PNG Export

Individual chips can be downloaded using the **PNG** button beneath each chip.

The generator also supports exporting the entire collection as a single PNG sheet.

Example:

```
pixel-poker-chip-sheet.png
```

Individual chips are exported using their denomination, for example:

```
pixel-chip-5.png
pixel-chip-100.png
pixel-chip-1K.png
```

## 🏗️ Project Structure

The project is intentionally kept extremely simple:

```
pixel-poker-chip-generator/
│
└── poker-chip-generator.html
```

Everything is contained inside the HTML file:

```
HTML
CSS
JavaScript
Canvas rendering
Procedural generation
PNG export
```

There are no external dependencies.

## ⚙️ How It Works

The generator combines several procedural components.

Each chip receives a generated configuration containing properties such as:

```
style
pattern
base color
dark color
accent color
chip value
number of edge markings
inner ring
noise
highlights
rotation
```

A seeded random-number generator determines these properties.

The chip is then rendered using HTML5 Canvas.

The basic rendering process is approximately:

```
Create seed
    ↓
Generate random chip properties
    ↓
Select color palette
    ↓
Select pattern
    ↓
Draw shadow
    ↓
Draw outer edge
    ↓
Draw chip body
    ↓
Draw edge markings
    ↓
Draw rings
    ↓
Draw pattern
    ↓
Draw center
    ↓
Draw denomination
    ↓
Add highlights/noise
    ↓
Export/display chip
```

## 🧑‍💻 Customization

The easiest way to customize the generator is by modifying the JavaScript arrays.

For example, additional palettes can be added to:

```
const PALETTES = {
    classic: [
        ["#d92c3d", "#7e1321", "#f5e6c8"]
    ]
};
```

Each palette contains:

```
Base color
Dark/shadow color
Accent color
```

You can therefore create your own themes.

Example:

```
["#ff0000", "#550000", "#ffffff"]
```

would create a red, dark-red, and white palette.

## 🛠️ Adding New Styles

To create a new style:

1. Add a palette to `PALETTES`.
2. Add the style to the Style dropdown.
3. Optionally add special rendering behavior in `drawChip()`.

For example:

```
PALETTES.space = [
["#263cff", "#080d50", "#55eaff"],
["#7a2cff", "#250750", "#ffffff"]
];
```

Then add:

```
<option value="space">Space</option>
```

## 🧪 Adding New Patterns

Patterns are handled by:

```
drawPattern()
```

Additional patterns can be added as new conditions.

For example:

```
else if (chip.pattern === "checker") {
    // draw checkerboard pattern
}
```

Then add the pattern to the dropdown.

## 🚀 Possible Future Features

Potential improvements include:

- Custom denomination input
- Custom color palettes
- More chip shapes
- Casino-specific chip designs
- Holographic effects
- Animated chips
- Rotating 3D-style chips
- Sprite-sheet generation
- Automatic sprite naming
- Transparent PNG export
- SVG export
- GIF animation export
- Custom pixel fonts
- Custom symbols
- Joker/wild chips
- Poker table background generator
- Playing-card generator
- Casino token generator
- Batch generation
- ZIP export
- Game-engine sprite export
- Preset saving/loading
- LocalStorage project saving

## 📜 License

You can modify the project for your own needs.

If you redistribute a modified version, consider adding your own project name and attribution.

## 🎰 Use Cases

The generator can be useful for:

- Indie games
- Pixel-art games
- Poker games
- Casino games
- Board games
- UI prototypes
- Game-jam projects
- Sprite generation
- RPG inventory systems
- Gambling-themed interfaces
- Casino-themed websites
- Pixel-art experiments

## ❤️ Credits

Built with:

- HTML5
- CSS3
- JavaScript
- HTML5 Canvas

No external assets or dependencies are required.

---

**Have fun generating chips! 🎰🃏**