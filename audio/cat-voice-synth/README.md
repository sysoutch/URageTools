# Meow Machine (Cat Voice Synth)

Type what a cat should say and synthesize realistic meows, purrs, trills, chirps, hisses and growls in your browser. Everything is generated procedurally; there are no audio samples and no server calls.

## How it sounds like a cat

- **Cat-sized vocal tract.** A cat's vocal tract is about 6-8 cm, so its formants sit roughly twice as high as a human's. Each personality scales a human-referenced vowel table (`tract` in `app.js`), which is what stops the meows sounding like a person imitating a cat.
- **Cat pitch.** House-cat meows sit around 450-650 Hz, toms around 370 Hz, and the baby kitten around 1 kHz with an unsteady, breathy voice and shorter calls, all following the rise-then-fall arch of a real meow. A small high-pass removes chest resonance so cries don't read as a human infant.
- **Source-filter model.** A Rosenberg glottal pulse with jitter, shimmer, slow drift and pitch-synchronous breath feeds four gliding Klatt resonators, a nasal resonator and a lip-opening low-pass.
- **Spelling is articulation.** Each run of letters becomes a mouth shape (m/n nasal, e/i front, a/o open, u/w rounded, r rolled, l, h breathy, plosives close the mouth). Repeated letters stretch that shape.
- **Dedicated models** for the 25 Hz two-breath purr, spit-onset hiss, period-doubled growl and yowl, rolled trills, chirps and bird chatter.
- **Expression.** `?` adds a questioning rise, `!` or CAPITALS make a demanding, rougher cry, and long meows end in breathy vocal fry. A small room reverb is optional.

## Studio

- **Cat picker:** Baby kitten, House cat, Siamese and Tomcat, each with its own voice and look. Picking one auditions it; arrow keys move between cats.
- **Animated cat** lip-syncs to playback from a 60 fps mouth/mood timeline recorded during synthesis, and reacts per sound (purr, hiss, growl, chirp, questions).
- **Transport:** play/stop, a seekable waveform with a playhead and a colored lane showing which kind of sound plays when. `Ctrl+Enter` toggles playback, `Esc` stops, `Space` toggles outside text fields.
- **"The cat hears" strip** shows how each word is interpreted (meow, trill, purr, ignored...) and plays any single sound on click; the spoken word highlights during playback.
- **Phrase library** inserts ready-made phrases at the cursor and plays them.
- Edits re-render automatically; script and settings are remembered locally. Double-click a slider to reset it.

## Dashboard integration

Discovered from `tools/audio/cat-voice-synth/index.html`.

- Inherits dashboard colors through `dashboard-theme.js`; the controls column is marked as `Cat Voice Controls`.
- `dashboard-tool-bridge.js` accepts a text resource (or an earlier output's `metadata.script`) as the cat script.
- The current WAV is exposed through `describeCurrentAssets()` as an `audio/wav` resource, with the script and settings in `metadata`.
- The shared current-output fallback remains loaded for compatibility.

The synthesis engine in `app.js` has no DOM dependency; when loaded with a CommonJS `module` it exports `render`, `parse`, `classify` and `encodeWav` for offline checks.
