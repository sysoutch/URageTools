# Beat Maker

Offline browser sequencer for sketching simple beats and musical loops inside the dashboard tools workspace.

## Features

- Step-sequencer style pattern editing.
- Drum and instrument lanes for quick loop construction.
- Four sounds per lane (pick one in the lane's name block), and kits that set all eight at once:
  Classic, 808, Techno, Lo-fi, Live and Bass. Every preset starts with the kit that fits its style.
- Variation: each hit a little different (loudness, pitch, brightness) with accents on the beat.
- Party mode: fills, breakdowns, build-ups and drops over 16 bars; the grid shows what each bar
  leaves out and adds.
- Dashboard-aware theme styling.
- Runs locally in the browser without requiring a backend render service.

## Code

- `js/beat-engine.js`: the synth, presets and party mode. Shared with Bottlefield; keep both copies equal.
- `js/beat-sounds.js`: the extra sounds and kits. Optional: without it every lane plays its Classic sound.
- `js/ui.js`, `js/deck.js`, `js/sequencer.js`: the page.

## Workflow

1. Open the tool from the dashboard tools view.
2. Toggle steps in the sequencer grid.
3. Play the loop to audition timing and groove.
4. Adjust the pattern until it is ready to reuse as a reference or prototype.

## Notes

This is intended as a lightweight composition and prototyping tool rather than a full DAW.
