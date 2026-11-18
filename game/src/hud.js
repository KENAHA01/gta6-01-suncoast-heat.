// Solmarina Heat - hud.js
// DOM HUD: health, money, weapon/ammo, wanted stars, objective, clock, dialog.
// Minimap is a small 2D canvas drawn top-down each frame.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  function buildHUD() {
    var root = document.getElementById('hud');
    root.innerHTML =
      '<div id="hud-top-right">' +
        '<div id="hud-money">$0</div>' +
        '<div id="hud-clock">10:00</div>' +
      '</div>' +
      '<div id="hud-stars"></div>' +
      '<div id="hud-objective"></div>' +
      '<div id="hud-bottom-left">' +
        '<div id="hud-health"><div id="hud-health-fill"></div></div>' +
        '<div id="hud-weapon">Pistol | 12 / 48</div>' +
        '<div id="hud-speed"></div>' +
      '</div>' +
      '<div id="hud-prompt"></div>' +
      '<div id="hud-dialog"><div id="hud-dialog-name"></div><div id="hud-dialog-text"></div></div>' +
      '<div id="hud-center"><div id="hud-title">SOLMARINA HEAT</div>' +
        '<div id="hud-subtitle">Press ENTER to play</div>' +
        '<div id="hud-controls">WASD move &nbsp; Mouse look &nbsp; Click shoot &nbsp; E enter/exit car &nbsp; R reload &nbsp; 1-4 weapons &nbsp; P pause</div>' +
      '</div>' +
      '<div id="hud-end" style="display:none"><div id="hud-end-title"></div><div id="hud-end-text"></div><div id="hud-end-hint">Press R to restart</div></div>' +
      '<canvas id="minimap" width="180" height="180"></canvas>';
    return {
      root: root,
      money: document.getElementById('hud-money'),
      clock: document.getElementById('hud-clock'),
      stars: document.getElementById('hud-stars'),
      objective: document.getElementById('hud-objective'),
      healthFill: document.getElementById('hud-health-fill'),
      weapon: document.getElementById('hud-weapon'),
      speed: document.getElementById('hud-speed'),
      prompt: document.getElementById('hud-prompt'),
      dialog: document.getElementById('hud-dialog'),
      dialogName: document.getElementById('hud-dialog-name'),
      dialogText: document.getElementById('hud-dialog-text'),
      center: document.getElementById('hud-center'),
      end: document.getElementById('hud-end'),
      endTitle: document.getElementById('hud-end-title'),
      endText: document.getElementById('hud-end-text'),
      minimap: document.getElementById('minimap')
    };
  }

  function fmtClock(minutes) {
    var h = Math.floor(minutes / 60) % 24;
    var m = Math.floor(minutes % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function updateHUD(el, game) {
    el.money.textContent = '$' + Math.floor(game.player.money);
    el.clock.textContent = fmtClock(game.minutes);
    var stars = '';
    for (var i = 0; i < C.WANTED_MAX; i++) stars += i < game.police.stars ? '★' : '☆';
    el.stars.textContent = stars;
    el.stars.style.color = game.police.stars > 0 ? '#ffd23e' : '#888888';
    var w = game.combat.weapon();
    el.weapon.textContent = w.name + ' | ' + game.combat.ammo[game.combat.weaponIdx] + ' / ' + game.combat.reserve[game.combat.weaponIdx] +
      (game.combat.reloading > 0 ? '  (reloading...)' : '');
    var hp = Math.max(0, game.player.hp);
    el.healthFill.style.width = hp + '%';
    el.healthFill.style.background = hp > 50 ? '#4ac97a' : (hp > 25 ? '#e8b400' : '#c92a2a');
    if (game.playerCar) {
      el.speed.textContent = Math.abs(Math.round(game.playerCar.speed * 3.6)) + ' km/h - ' + game.playerCar.spec.name;
    } else {
      el.speed.textContent = '';
    }
    var m = game.missions.current();
    if (game.missions.state === 'active' && m) {
      var step = game.missions.currentStep();
      el.objective.textContent = m.name + ': ' + (step ? step.text : '');
    } else if (game.missions.allDone()) {
      el.objective.textContent = 'All missions complete. Solmarina is yours.';
    } else {
      el.objective.textContent = 'Press M to start a mission';
    }
    el.prompt.textContent = game.prompt || '';
  }

  function showDialog(el, name, text, ms) {
    el.dialogName.textContent = name;
    el.dialogText.textContent = text;
    el.dialog.style.display = 'block';
    if (showDialog._t) clearTimeout(showDialog._t);
    if (ms) showDialog._t = setTimeout(function () { el.dialog.style.display = 'none'; }, ms);
  }
  function hideDialog(el) { el.dialog.style.display = 'none'; }

  function showCenter(el, title, subtitle) {
    el.center.style.display = 'block';
    document.getElementById('hud-title').textContent = title;
    document.getElementById('hud-subtitle').textContent = subtitle || '';
  }
  function hideCenter(el) { el.center.style.display = 'none'; }

  function showEnd(el, title, text) {
    el.end.style.display = 'block';
    el.endTitle.textContent = title;
    el.endText.textContent = text;
  }
  function hideEnd(el) { el.end.style.display = 'none'; }

  // Minimap: top-down 2D canvas. Roads, buildings, water, player, cars, police, beacon.
  function drawMinimap(el, game) {
    var ctx = el.minimap.getContext('2d');
    var S = 180, half = C.CITY_SIZE / 2;
    function px(x) { return (x + half) / C.CITY_SIZE * S; }
    function pz(z) { return (z + half) / C.CITY_SIZE * S; }
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 0, S, S);
    // water
    ctx.fillStyle = '#1a5a7a';
    ctx.fillRect(0, pz(C.WATER_Y), S, S - pz(C.WATER_Y));
    // roads
    ctx.fillStyle = '#555550';
    game.city.roadsX.forEach(function (z) { ctx.fillRect(0, pz(z) - 2, S, 4); });
    game.city.roadsZ.forEach(function (x) { ctx.fillRect(px(x) - 2, 0, 4, S); });
    // buildings
    ctx.fillStyle = '#888880';
    game.city.buildings.forEach(function (b) {
      ctx.fillRect(px(b.minX), pz(b.minZ), px(b.maxX) - px(b.minX), px(b.maxZ) - pz(b.minZ));
    });
    // mission beacon
    var step = game.missions.currentStep();
    if (game.missions.state === 'active' && step && step.x !== undefined) {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(px(step.x), pz(step.z), 5, 0, Math.PI * 2); ctx.fill();
    }
    // traffic + player car
    ctx.fillStyle = '#e8e8e8';
    game.traffic.cars.forEach(function (c) { ctx.fillRect(px(c.x) - 2, pz(c.z) - 2, 4, 4); });
    // police
    ctx.fillStyle = '#4488ff';
    game.police.cars.forEach(function (c) { ctx.fillRect(px(c.x) - 2, pz(c.z) - 2, 4, 4); });
    // enemies
    ctx.fillStyle = '#ff4444';
    game.combat.enemies.forEach(function (e) { ctx.fillRect(px(e.x) - 2, pz(e.z) - 2, 4, 4); });
    // player
    var pxp = game.playerCar ? game.playerCar.x : game.player.x;
    var pzp = game.playerCar ? game.playerCar.z : game.player.z;
    ctx.fillStyle = '#4ac97a';
    ctx.beginPath(); ctx.arc(px(pxp), pz(pzp), 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  window.SH_HUD = {
    buildHUD: buildHUD, updateHUD: updateHUD,
    showDialog: showDialog, hideDialog: hideDialog,
    showCenter: showCenter, hideCenter: hideCenter,
    showEnd: showEnd, hideEnd: hideEnd,
    drawMinimap: drawMinimap, fmtClock: fmtClock
  };
})();
