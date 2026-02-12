# System Patterns

## Architecture
The project follows a static site architecture. Each tool is self-contained in its own directory, often consisting of an `index.html` file, and optionally separate `script.js` and `style.css` files.

## Directory Structure
- `art/`: Tools related to image manipulation and design.
- `audio/`: Audio generation and visualization tools.
- `dev/`: Developer utilities.
- `plan/`: Planning and organization tools.
- `_shared/`: Common resources (fonts, libraries, icons).

## Implementation Patterns
- **Single File vs Separated**: Smaller tools often use a single `index.html` with inline JS/CSS. Larger tools split logic into `script.js` and `style.css`.
- **No Build Step**: Files are written as standard HTML/CSS/JS, runnable directly in the browser.
- **Library Usage**: External libraries (like JSZip) are loaded via CDN or local copies in `_shared`.

## UI/UX Standards
- Dark theme default.
- Consistent header/footer structure (likely injected or manually maintained).
- Responsive layout using Flexbox/Grid.
