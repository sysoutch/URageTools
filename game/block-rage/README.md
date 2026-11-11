# Block Rage

A falling-block puzzle that runs offline in the browser. Stack the seven
four-cell pieces, clear full lines, and climb levels as the drop speed
rises.

**The rage twist:** every cleared line fills the rage meter (a four-line
clear adds a bonus). When it is full, press **R** (or the Rage button) to
burn away the bottom four rows of the stack for bonus points. Save it for
an emergency, or use it to keep combos going.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | ← → or A D | ◀ ▶, or swipe sideways on the board |
| Rotate | ↑ X W (right), Z Ctrl (left) | ⟳ ⟲, or tap the board |
| Soft drop | ↓ or S | ▼ (hold) |
| Hard drop | Space | Drop, or swipe down on the board |
| Hold piece | C or Shift | Hold |
| Unleash rage | R | Rage |
| Pause | P or Esc | Sidebar button |
| Start | Enter | Play button |

The game pauses on its own when the tab is hidden. The best score, sound
and landing-preview settings are kept in this browser's local storage.

## Code layout

- `js/config.js`: tuning values (speed curve, scoring, rage).
- `js/pieces.js`: piece shapes, colours, rotation, 7-piece bag.
- `js/board.js`: the well grid, collisions, line clears, rage burn.
- `js/game.js`: rules and state, no DOM access; reports events.
- `js/renderer.js`: canvas drawing and effects.
- `js/input.js`: keyboard with auto-repeat, touch buttons, board gestures.
- `js/audio.js`: Web Audio sound effects (no audio files).
- `js/storage.js`: guarded local storage.
- `js/main.js`: frame loop, HUD, overlay and dashboard hooks.

## Dashboard integration

- Uses `data-dashboard-theme` and the shared dashboard theme bridge.
- `window.__urageToolDescribeCurrentAsset()` returns the board as a PNG.
- `window.__urageToolLoadAssetPayload()` declines files: it is a game.
- Exposes one dashboard sidebar marker.

See [the tool integration contract](../../TOOL_TEMPLATE.md).
