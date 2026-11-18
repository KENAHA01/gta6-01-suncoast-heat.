// Solmarina Heat - shots.js
// Deterministic staged scenes for screenshots: ?shot=chase|title|mission|wasted.
// Each scene sets the game state so Playwright captures a fixed, readable frame.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  function apply(game, shot) {
    game.state = 'playing';
    var H = window.SH_HUD;
    // hide the title screen if it is showing
    var center = document.getElementById('hud-center');
    if (center) center.style.display = 'none';

    if (shot === 'title') {
      game.state = 'title';
      game.minutes = 10 * 60;
      game.player.x = 0; game.player.z = -60;
      game.player.mesh.position.set(0, 0, -60);
      if (center) center.style.display = 'block';
      return;
    }

    if (shot === 'chase') {
      // player driving a Palmetto GT down Palmetto Strip, 3 stars, police behind
      game.minutes = 14 * 60;
      var gt = null;
      game.parked.forEach(function (v) {
        if (v.spec.name === 'Palmetto GT') gt = v;
      });
      if (!gt) {
        gt = window.SH_VEHICLES.makeVehicle(C.VEHICLES[3], 0, 100, Math.PI, 'player', game._scene);
        game.parked.push(gt);
      }
      gt.x = 0; gt.z = 60; gt.heading = Math.PI; gt.speed = 20;
      gt.group.position.set(0, 0, 60);
      gt.group.rotation.y = Math.PI;
      game.playerCar = gt;
      gt.kind = 'player';
      game.player.mesh.visible = false;
      game.player.x = 0; game.player.z = 60;
      game.police.heat = 55;
      game.police.stars = 3;
      game.police.spawnCar(game.player);
      game.police.spawnCar(game.player);
      game.player.money = 1250;
      return;
    }

    if (shot === 'mission') {
      // mission 2 briefing: Marisol dialog + beacon at Marina Bay
      game.minutes = 11 * 60;
      game.player.x = 0; game.player.z = 120;
      game.player.mesh.position.set(0, 0, 120);
      game.player.money = 400;
      game.missions.idx = 1;
      game.missions.start();
      H.showDialog(
        { dialog: document.getElementById('hud-dialog'), dialogName: document.getElementById('hud-dialog-name'), dialogText: document.getElementById('hud-dialog-text') },
        'Marisol', 'A package is waiting at the marina. Pick it up, then drop it at Las Brisas.'
      );
      return;
    }

    if (shot === 'wasted') {
      // night, WASTED screen
      game.minutes = 23 * 60 + 20;
      game.player.x = 0; game.player.z = 40;
      game.player.mesh.position.set(0, 0, 40);
      game.player.hp = 0;
      game.player.dead = true;
      game.state = 'wasted';
      game.endTimer = 2;
      H.showEnd(
        { end: document.getElementById('hud-end'), endTitle: document.getElementById('hud-end-title'), endText: document.getElementById('hud-end-text') },
        'WASTED', 'Dario is down. You lost $100.'
      );
      return;
    }
  }

  window.SHOTS = { apply: apply };
})();
