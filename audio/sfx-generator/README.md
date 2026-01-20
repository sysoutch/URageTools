# URage Pulse - SFX Generator

A web-based sound effects generator that creates unique audio samples using the Web Audio API. This tool allows you to create, play, and download custom sound effects with real-time parameter controls.

## Features

- **Real-time Sound Generation**: Creates audio using the Web Audio API
- **Multiple Waveforms**: Square, Sawtooth, Sine, and Triangle waveforms
- **ADSR Envelope Controls**: Attack, Decay, and Sustain parameters for sound shaping
- **Frequency Sliding**: Smooth frequency transitions for dynamic effects
- **Preset System**: Save and load custom sound effect presets
- **Visualizer**: Real-time audio waveform visualization
- **Download Functionality**: Export generated sounds as WAV files
- **Randomization**: Generate random sound parameters with one click

## Controls

### Waveform Selection
- **Square**: Harsh, digital sound
- **Sawtooth**: Bright, buzzy tone
- **Sine**: Smooth, pure tone
- **Triangle**: Soft, mellow sound

### Parameters
- **Frequency**: Base pitch of the sound (50Hz - 2000Hz)
- **Length**: Duration of the sound effect (0.05s - 2.0s)
- **Slide**: Frequency transition effect (-1000 to 1000)
- **Attack**: Time to reach maximum volume (0-0.5s)
- **Decay**: Time to fade out to sustain level (0-0.5s)

### Buttons
- **PLAY**: Generate and play the current sound
- **WAV**: Download the current sound as a WAV file
- **Save Preset**: Save current parameters as a preset
- **Load Preset**: Load a previously saved preset
- **🎲 Randomize Params**: Generate random sound parameters
- **Lock Waveform**: Lock waveform selection to prevent accidental changes

## Technical Implementation

### Core Components

1. **Web Audio API Integration**:
   - Uses OscillatorNode for sound generation
   - Implements GainNode for volume control
   - Applies ADSR envelope for sound shaping
   - Uses exponential ramping for smooth frequency transitions

2. **Preset System**:
   - Stores presets in localStorage
   - Presets include all parameters and timestamp
   - Simple numeric selection interface

3. **Audio Visualization**:
   - Canvas-based waveform display
   - Real-time audio analysis using AnalyserNode
   - Smooth animation using requestAnimationFrame

4. **Download Functionality**:
   - Uses OfflineAudioContext for rendering
   - Converts audio buffer to WAV format
   - Creates downloadable file with proper headers

### File Structure

```
sfx-generator/
├── index.html          # Main HTML structure
├── style.css           # Styling and layout
└── script.js           # Core JavaScript functionality
```

### Key Functions

- `playSFX()`: Generates and plays the current sound
- `downloadSFX()`: Renders and downloads the sound as WAV
- `savePreset()`: Saves current parameters to localStorage
- `loadPresets()`: Loads saved presets from localStorage
- `applyPreset()`: Applies predefined sound parameters
- `randomize()`: Generates random sound parameters
- `draw()`: Updates the audio visualization

## Usage

1. Adjust parameters using the sliders
2. Select a waveform type
3. Click "PLAY" to hear the sound
4. Use "WAV" to download the sound
5. Save custom presets using "Save Preset"
6. Load saved presets using "Load Preset"
7. Use "🎲 Randomize Params" for creative inspiration

## Browser Compatibility

This application requires a modern browser with Web Audio API support:
- Chrome 14+
- Firefox 25+
- Safari 6+
- Edge 14+

## License

This project is open source and available under the MIT License.