/**
 * Solara Bay - WebAudio Sound & Music Synthesizer
 * 100% procedural WebAudio synthesis — zero audio assets
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineGain = null;
    this.engineOsc = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupSirenSynth();
      this.startSynthMusic();
      this.initialized = true;
    } catch {
      // Audio not permitted or headless
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.muted;
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();
  }

  updateEngine(speedRatio, inVehicle) {
    if (!this.ctx || !this.engineGain) return;
    if (!inVehicle) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }
    const targetFreq = 50 + speedRatio * 160;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.25, this.ctx.currentTime, 0.05);
  }

  setupSirenSynth() {
    if (!this.ctx) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);
    this.sirenOsc.start();
  }

  setSirenActive(active) {
    if (!this.ctx || !this.sirenGain) return;
    if (active) {
      const now = this.ctx.currentTime;
      this.sirenGain.gain.setTargetAtTime(0.18, now, 0.1);
      // Sweeping frequency
      this.sirenOsc.frequency.cancelScheduledValues(now);
      this.sirenOsc.frequency.setValueAtTime(650, now);
      this.sirenOsc.frequency.linearRampToValueAtTime(950, now + 0.4);
      this.sirenOsc.frequency.linearRampToValueAtTime(650, now + 0.8);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  playPunch() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playGunshot() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  playCoin() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987, now); // B5
    osc.frequency.setValueAtTime(1318, now + 0.08); // E6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playMissionComplete() {
    if (!this.ctx || this.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.1;
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  startSynthMusic() {
    if (!this.ctx) return;
    // Retro 80s bassline loop (A - F - G - E)
    const pattern = [110, 110, 164.8, 110, 87.3, 87.3, 130.8, 87.3, 98, 98, 146.8, 98, 82.4, 82.4, 123.5, 82.4];
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
      const freq = pattern[step % pattern.length];
      step++;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.18);
    }, 220);
  }
}
