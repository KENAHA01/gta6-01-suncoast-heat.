// audio.js - synthetic sound through WebAudio, no audio files.
// One job: make short bleeps and thuds from oscillators. It stays silent
// until the player first interacts, because browsers block audio before that.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  // Call from a user gesture (key press or click). Safe to call often.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.enabled = true;
    } catch (err) {
      this.enabled = false;
    }
  }

  // A short tone. freq in Hz, dur in seconds, type is an oscillator shape.
  tone(freq, dur, type, volume) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volume || 0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  click() {
    this.tone(660, 0.06, 'square', 0.04);
  }

  step() {
    this.tone(140, 0.04, 'triangle', 0.02);
  }
}
