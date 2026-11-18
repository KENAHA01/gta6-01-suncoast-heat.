// Solmarina Heat - random.js
// Seeded RNG (mulberry32) so the city and screenshots are identical every run.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rng = mulberry32(C.SEED);

  function rand() { return rng(); }
  function randRange(min, max) { return min + rng() * (max - min); }
  function randInt(min, max) { return Math.floor(randRange(min, max + 1)); }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
  function chance(p) { return rng() < p; }

  // Fresh independent stream (for traffic/pedestrian variety without touching city gen)
  function stream(seed) { return mulberry32(seed); }

  window.SH_RANDOM = {
    rand: rand, randRange: randRange, randInt: randInt,
    pick: pick, chance: chance, stream: stream, mulberry32: mulberry32
  };
})();
