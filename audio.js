// Snake 3D Ultra - Procedural Web Audio Engine
// Genera música synthwave y efectos de sonido en tiempo real sin dependencias externas.

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicInterval = null;
        this.tempo = 124;
        this.step = 0;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        this.ctx = new AudioContext();
        
        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.7;
        this.masterGain.connect(this.ctx.destination);

        // Sub Gains
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.8;
        this.sfxGain.connect(this.masterGain);
    }

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }

    // Efecto de sonido: Comer fruta normal
    playEatSound(pitchMultiplier = 1.0) {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const startFreq = 440 * pitchMultiplier;
        const endFreq = 880 * pitchMultiplier;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.16);

        // Segundo armónico brillante
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(endFreq * 1.5, now + 0.02);
        osc2.frequency.exponentialRampToValueAtTime(endFreq * 2, now + 0.12);

        gain2.gain.setValueAtTime(0.25, now + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc2.connect(gain2);
        gain2.connect(this.sfxGain);

        osc2.start(now + 0.02);
        osc2.stop(now + 0.16);
    }

    // Efecto de sonido: Fruta especial / dorada / bonus
    playBonusSound() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // Acorde C mayor brillante
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.045;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(800, now + 0.25);

            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.31);
        });
    }

    // Efecto de sonido: Power-Up
    playPowerUpSound() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.36);
    }

    // Efecto de sonido: Giro de dirección
    playTurnSound() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.04);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Efecto de sonido: Game Over / Colisión
    playGameOverSound() {
        this.ensureContext();
        if (this.isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;

        // Sub-bass drop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.6);

        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.85);

        // Ruido de impacto / explosión sintética
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1200, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
    }

    // Música Synthwave Procedural Dinámica
    startMusic() {
        this.ensureContext();
        if (this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;

        const bassScale = [
            110.00, 110.00, 130.81, 110.00, // A2, C3
            98.00, 98.00, 110.00, 123.47,   // G2, B2
            87.31, 87.31, 98.00, 110.00,    // F2, A2
            82.41, 98.00, 110.00, 123.47    // E2, G2, A2, B2
        ];

        const arpeggio = [
            440, 523.25, 659.25, 880, 659.25, 523.25,
            392, 493.88, 587.33, 783.99, 587.33, 493.88,
            349.23, 440, 523.25, 698.46, 523.25, 440,
            329.63, 392, 493.88, 659.25, 493.88, 392
        ];

        const stepTime = 60 / (this.tempo * 4); // semicorchea

        const playStep = () => {
            if (!this.musicPlaying || this.isMuted) return;

            const now = this.ctx.currentTime;
            const beat = this.step % 16;
            const arpStep = this.step % arpeggio.length;

            // Bajo rítmico synthwave
            if (beat % 2 === 0) {
                const bassNote = bassScale[Math.floor(this.step / 4) % bassScale.length];
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                const bassFilter = this.ctx.createBiquadFilter();

                bassOsc.type = 'sawtooth';
                bassOsc.frequency.setValueAtTime(bassNote, now);

                bassFilter.type = 'lowpass';
                bassFilter.frequency.setValueAtTime(600, now);
                bassFilter.frequency.exponentialRampToValueAtTime(150, now + 0.18);

                bassGain.gain.setValueAtTime(0.22, now);
                bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

                bassOsc.connect(bassFilter);
                bassFilter.connect(bassGain);
                bassGain.connect(this.musicGain);

                bassOsc.start(now);
                bassOsc.stop(now + 0.19);
            }

            // Arpegio brillante flotante
            if (this.step % 2 === 1) {
                const arpFreq = arpeggio[arpStep];
                const arpOsc = this.ctx.createOscillator();
                const arpGain = this.ctx.createGain();

                arpOsc.type = 'sine';
                arpOsc.frequency.setValueAtTime(arpFreq, now);

                arpGain.gain.setValueAtTime(0.06, now);
                arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                arpOsc.connect(arpGain);
                arpGain.connect(this.musicGain);

                arpOsc.start(now);
                arpOsc.stop(now + 0.13);
            }

            // Bombo sintético (Kick drum) en tiempos 0, 4, 8, 12
            if (beat % 4 === 0) {
                const kickOsc = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kickOsc.type = 'sine';
                kickOsc.frequency.setValueAtTime(140, now);
                kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

                kickGain.gain.setValueAtTime(0.35, now);
                kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                kickOsc.connect(kickGain);
                kickGain.connect(this.musicGain);

                kickOsc.start(now);
                kickOsc.stop(now + 0.16);
            }

            this.step++;
        };

        this.musicInterval = setInterval(playStep, stepTime * 1000);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

window.soundEngine = new SoundEngine();

