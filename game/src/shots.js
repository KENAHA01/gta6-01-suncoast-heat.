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
      // player driving a Palmetto GT down Palmetto Strip, 3 stars, police ahead
      game.minutes = 14 * 60;
      var gt = null;
      game.parked.forEach(function (v) {
        if (v.spec.name === 'Palmetto GT') gt = v;
      });
      if (!gt) {
        gt = window.SH_VEHICLES.makeVehicle(C.VEHICLES[3], 0, 100, Math.PI, 'player', game._scene);
        game.parked.push(gt);
      }
      gt.x = 0; gt.z = 60; gt.heading = Math.PI; gt.speed = 26;
      gt.group.position.set(0, 0, 60);
      gt.group.rotation.y = Math.PI;
      game.playerCar = gt;
      gt.kind = 'player';
      game.player.mesh.visible = false;
      game.player.x = 0; game.player.z = 60;
      // clear the GT's road (x = 0, z from 60 down to -60): a parked cab
      // sat on this road and stopped the car dead, and traffic on the
      // same road blocked it. Move parked cars off the road, and reassign
      // traffic cars that drive on it to the x = 156 road.
      game.parked.forEach(function (v) {
        if (v === gt) return;
        if (Math.abs(v.x) < 20) {
          v.x = v.x >= 0 ? 104 : -104;
          v.group.position.set(v.x, 0, v.z);
        }
      });
      game.traffic.cars.forEach(function (v) {
        if (!v.alongX && Math.abs(v.line) < 20) {
          v.line = 156;
          v.x = 156 + (v.dir > 0 ? -3.5 : 3.5);
          v.z = -100;
          v.heading = v.dir > 0 ? 0 : Math.PI;
          v.group.position.set(v.x, 0, v.z);
          v.group.rotation.y = v.heading;
        } else if (v.alongX && Math.abs(v.x) < 15 && v.z > -40 && v.z < 60) {
          v.x = v.x >= 0 ? 120 : -120;
          v.group.position.set(v.x, 0, v.z);
        }
      });
      // police: two interceptors AHEAD of the GT, in the camera's forward
      // view (a random spawn can land behind the camera and never be seen).
      // They drive the same way, slower, so the GT closes on them; their
      // pursuit steering turns them toward the player, headlights first.
      game.police.heat = 55;
      game.police.stars = 3;
      game.police.spawnCar(game.player);
      game.police.spawnCar(game.player);
      var spots = [
        { x: -2.5, z: 10, speed: 20 },
        { x: 2.5, z: 35, speed: 22 }
      ];
      game.police.cars.forEach(function (c, i) {
        var s = spots[i % spots.length];
        c.x = s.x; c.z = s.z; c.heading = Math.PI; c.speed = s.speed;
        c.group.position.set(c.x, 0, c.z);
        c.group.rotation.y = Math.PI;
      });
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
