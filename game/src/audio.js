// Solmarina Heat - audio.js
// Synthetic WebAudio: engine hum, gunshots, pickup blips, ambient pad.
// Silent until the first user gesture (browser autoplay rule).
(function () {
  'use strict';
  var ctx = null;
  var engineOsc = null, engineGain = null;
  var padOn = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type, vol) {
    if (!ensure()) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol, freq) {
    if (!ensure()) return;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq || 1200;
    var g = ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  }

  function shot() { noise(0.12, 0.25, 900); blip(160, 0.08, 'square', 0.08); }
  function pickup() { blip(660, 0.09, 'sine', 0.12); setTimeout(function () { blip(880, 0.12, 'sine', 0.12); }, 90); }
  function busted() { blip(220, 0.3, 'sawtooth', 0.1); setTimeout(function () { blip(180, 0.4, 'sawtooth', 0.1); }, 200); }
  function wasted() { blip(160, 0.5, 'sawtooth', 0.12); setTimeout(function () { blip(110, 0.7, 'sawtooth', 0.12); }, 300); }

  function setEngine(speed01) {
    if (!ensure()) return;
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 500;
      engineOsc.connect(f); f.connect(engineGain); engineGain.connect(ctx.destination);
      engineOsc.start();
    }
    engineOsc.frequency.value = 50 + speed01 * 140;
    engineGain.gain.value = speed01 > 0.02 ? 0.03 + speed01 * 0.04 : 0;
  }

  function startPad() {
    if (!ensure() || padOn) return;
    padOn = true;
    [110, 164.8, 220].forEach(function (fr) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = fr;
      g.gain.value = 0.02;
      o.connect(g); g.connect(ctx.destination);
      o.start();
    });
  }

  window.SH_AUDIO = {
    ensure: ensure, shot: shot, pickup: pickup,
    busted: busted, wasted: wasted, setEngine: setEngine, startPad: startPad
  };
})();
