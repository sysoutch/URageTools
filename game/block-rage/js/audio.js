// Tiny Web Audio sound effects. No files to load, so the game stays
// offline and instant. The context starts on the first user gesture.

export class SoundEffects {
    constructor() {
        this.enabled = true;
        this.context = null;
    }

    ensureContext() {
        if (!this.context) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;
            this.context = new AudioContextClass();
        }
        if (this.context.state === 'suspended') this.context.resume();
        return this.context;
    }

    tone(frequency, duration, { type = 'square', volume = 0.04, slideTo = null, delay = 0 } = {}) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const start = ctx.currentTime + delay;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
    }

    noise(duration, volume = 0.12) {
        const ctx = this.ensureContext();
        if (!ctx) return;
        const length = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        filter.type = 'lowpass';
        filter.frequency.value = 1400;
        gain.gain.value = volume;
        source.buffer = buffer;
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
    }

    play(name, detail = {}) {
        if (!this.enabled) return;
        switch (name) {
            case 'move':
                this.tone(240, 0.03, { volume: 0.015 });
                break;
            case 'rotate':
                this.tone(380, 0.05, { type: 'triangle', volume: 0.03 });
                break;
            case 'hold':
                this.tone(300, 0.08, { type: 'triangle', volume: 0.035, slideTo: 450 });
                break;
            case 'lock':
                this.tone(150, 0.07, { type: 'triangle', volume: 0.05 });
                break;
            case 'drop':
                this.tone(220, 0.1, { volume: 0.04, slideTo: 70 });
                break;
            case 'clear': {
                const notes = [523, 659, 784, 1047].slice(0, Math.max(1, detail.count || 1));
                notes.forEach((note, index) => this.tone(note, 0.12, { type: 'triangle', volume: 0.05, delay: index * 0.06 }));
                break;
            }
            case 'level':
                [392, 523, 659, 784].forEach((note, index) => this.tone(note, 0.14, { type: 'square', volume: 0.03, delay: index * 0.08 }));
                break;
            case 'rage':
                this.noise(0.6, 0.16);
                this.tone(160, 0.6, { type: 'sawtooth', volume: 0.06, slideTo: 40 });
                break;
            case 'over':
                [330, 262, 196, 131].forEach((note, index) => this.tone(note, 0.22, { type: 'triangle', volume: 0.05, delay: index * 0.14 }));
                break;
            default:
                break;
        }
    }
}
