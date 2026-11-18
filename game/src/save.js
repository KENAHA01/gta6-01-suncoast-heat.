// Solmarina Heat - save.js
// Save/load through localStorage. Visible indicator: the HUD clock line shows
// "Saved HH:MM" for a few seconds after a save.
(function () {
  'use strict';
  var KEY = 'solmarina-heat-save-v1';

  function save(game) {
    var data = {
      money: Math.floor(game.player.money),
      hp: game.player.hp,
      minutes: game.minutes,
      missionIdx: game.missions.idx,
      x: game.player.x, z: game.player.z,
      weaponIdx: game.combat.weaponIdx,
      ammo: game.combat.ammo, reserve: game.combat.reserve,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function hasSave() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }

  function apply(game, data) {
    if (!data) return false;
    game.player.money = data.money || 0;
    game.player.hp = data.hp || 100;
    game.minutes = data.minutes || 600;
    game.missions.idx = data.missionIdx || 0;
    game.player.x = data.x || 0;
    game.player.z = data.z || -40;
    game.combat.weaponIdx = data.weaponIdx || 0;
    if (data.ammo) game.combat.ammo = data.ammo;
    if (data.reserve) game.combat.reserve = data.reserve;
    return true;
  }

  window.SH_SAVE = { save: save, load: load, hasSave: hasSave, apply: apply, KEY: KEY };
})();
