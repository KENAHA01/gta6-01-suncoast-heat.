// Solmarina Heat - synthetic WebAudio.
// Silent until the first gesture, then tiny blips and a quiet warm pad.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.padOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      return false;
    }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    return true;
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq || 660;
    g.gain.setValueAtTime(vol || 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + (dur || 0.08) + 0.02);
  }

  confirm() {
    this.blip(660, 0.07, "square", 0.04);
    setTimeout(() => this.blip(880, 0.09, "square", 0.04), 70);
  }

  startPad() {
    if (!this.ctx || this.padOn) {
      return;
    }
    this.padOn = true;
    const freqs = [130.81, 196.0, 246.94];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      osc.detune.value = (Math.random() - 0.5) * 6;
      g.gain.value = 0.012;
      osc.connect(g);
      g.connect(this.master);
      osc.start();
    }
  }
}
