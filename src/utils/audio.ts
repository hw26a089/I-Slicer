// Procedural Audio Engine using browser Web Audio API
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmIntervalId: any = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bgmVolumeValue: number = 0.15;
  private sfxVolumeValue: number = 0.5;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported in this browser', e);
    }
  }

  private resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    this.resume();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 1, this.ctx.currentTime);
    }
    // Storage preference
    localStorage.setItem('i-slicer-muted', mute ? 'true' : 'false');
  }

  getMuted() {
    return this.isMuted;
  }

  // --- SOUND EFFECTS ---

  playSwoosh(speed: number) {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    // Pitch proportional to swipe velocity
    const duration = 0.12;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    // Dynamic clean swoosh: Triangle + fast frequency drop
    osc.type = 'triangle';
    const baseFreq = 80 + Math.min(speed * 30, 400);
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

    // Fade out volume
    gain.gain.setValueAtTime(this.sfxVolumeValue * 0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSlice() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    // High frequency strike, then descending juice-squelch
    const now = this.ctx.currentTime;
    
    // 1. Sleek metallic blade schwing
    const bladeOsc = this.ctx.createOscillator();
    const bladeGain = this.ctx.createGain();
    bladeOsc.type = 'sine';
    bladeOsc.frequency.setValueAtTime(1500, now);
    bladeOsc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    
    bladeGain.gain.setValueAtTime(this.sfxVolumeValue * 0.3, now);
    bladeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    bladeOsc.connect(bladeGain);
    bladeGain.connect(this.masterGain || this.ctx.destination);
    
    bladeOsc.start(now);
    bladeOsc.stop(now + 0.15);

    // 2. Juicy pop/squish sound (high bandpass noise)
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.1);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.sfxVolumeValue * 0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain || this.ctx.destination);
      
      noiseNode.start(now);
      noiseNode.stop(now + 0.1);
    }
  }

  playCombo(count: number) {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    // Beautiful pure sine wave chime arpeggio based on combo size
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Major pentatonic scale step depending on combo count
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
    const pitch = notes[Math.min(count - 1, notes.length - 1)] || 523.25;

    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.2);

    gain.gain.setValueAtTime(this.sfxVolumeValue * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playBomb() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    // 1. Deep rumble explosion
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(10, now + 0.4);
    
    gain.gain.setValueAtTime(this.sfxVolumeValue * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    // 2. White noise pop
    const noise = this.createNoiseBuffer();
    if (noise) {
      const source = this.ctx.createBufferSource();
      source.buffer = noise;
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(400, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.sfxVolumeValue * 0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      source.connect(lowpass);
      lowpass.connect(noiseGain);
      noiseGain.connect(this.masterGain || this.ctx.destination);

      source.start(now);
      source.stop(now + 0.5);
    }
  }

  playLifeLost() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(147, now + 0.15);

    gain.gain.setValueAtTime(this.sfxVolumeValue * 0.6, now);
    gain.gain.setValueAtTime(0.6, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playBossSiren() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(500, now + 0.25);
    osc.frequency.linearRampToValueAtTime(300, now + 0.5);
    osc.frequency.linearRampToValueAtTime(500, now + 0.75);
    osc.frequency.linearRampToValueAtTime(300, now + 1.0);

    gain.gain.setValueAtTime(this.sfxVolumeValue * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  playLevelUp() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const rootNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Beautiful C Major arpeggio
    
    rootNotes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(this.sfxVolumeValue * 0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx!.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  // Helper: Create raw noise buffer for squish noise
  private createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 0.5; // Half second
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // --- RETRO BACKGROUND MUSIC (100% SYNTHESIZED) ---

  startBgm() {
    this.resume();
    if (this.isBgmPlaying || !this.ctx) return;
    this.isBgmPlaying = true;

    // Standard Retro Game Bass/Chords loop
    // C minor / Eb major epic chord progression: Cm, Bb, Ab, G
    const tempo = 135; // BPM
    const sixteenthLength = 60 / tempo / 4; // duration of a 16th note

    // Synthesized loop sequence
    let step = 0;
    
    // Cm (C, Eb, G), Bb (Bb, D, F), Ab (Ab, C, Eb), G (G, B, D)
    const progressNotes = [
      // Bar 1 (Cm)
      { bass: 130.81, arpeggios: [130.81, 155.56, 196.00, 261.63] },
      // Bar 2 (Bb)
      { bass: 116.54, arpeggios: [116.54, 146.83, 174.61, 233.08] },
      // Bar 3 (Ab)
      { bass: 103.83, arpeggios: [103.83, 130.81, 155.56, 207.65] },
      // Bar 4 (G)
      { bass: 98.00, arpeggios: [98.00, 123.47, 146.83, 196.00] }
    ];

    const playSequenceStep = () => {
      if (!this.isBgmPlaying || !this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const barIndex = Math.floor(step / 16) % 4;
      const beatIndex = Math.floor(step / 4) % 4;
      const noteIndex = step % 4;

      const currentProg = progressNotes[barIndex];
      if (!currentProg) return;

      // 1. Play Bassline on beat 0, 1, 2, 3 (square wave, low volume)
      if (step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        
        // rhythmic interest - sometimes play octave
        const pitch = (step % 4 === 1 || step % 8 === 7) ? currentProg.bass * 2 : currentProg.bass;
        bassOsc.frequency.setValueAtTime(pitch, now);
        
        bassGain.gain.setValueAtTime(this.bgmVolumeValue * 0.45, now);
        
        // Bass envelope: rapid decay
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + sixteenthLength * 1.8);
        
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain || this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + sixteenthLength * 1.9);
      }

      // 2. Play Retro Chip melody (every 16th with scale progressions)
      // Play a beautiful, energetic melody
      const melodyFreq = currentProg.arpeggios[noteIndex] * 2; // Octave higher
      if (Math.random() > 0.3) {
        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        melOsc.type = 'triangle';
        melOsc.frequency.setValueAtTime(melodyFreq, now);

        // syncopated accent
        const volumeFactor = (step % 3 === 0) ? 0.35 : 0.2;
        melGain.gain.setValueAtTime(this.bgmVolumeValue * volumeFactor, now);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + sixteenthLength * 0.9);

        melOsc.connect(melGain);
        melGain.connect(this.masterGain || this.ctx.destination);
        melOsc.start(now);
        melOsc.stop(now + sixteenthLength * 0.95);
      }

      step = (step + 1) % 64; // Loop 4 bars (64 16th notes)
    };

    // Clean interval-based sequencing
    this.bgmIntervalId = setInterval(playSequenceStep, sixteenthLength * 1000);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }
}

export const Sound = new AudioEngine();
