// Solmarina Heat - hud.js
// DOM HUD: mission panel, police response list, weapon slots, wanted stars,
// money, clock, health, big speed readout, dialog with portrait, minimap.
// Layout follows the top entries: dense panels, round minimap bottom-left
// with the district name, big speed bottom-right, dialog bottom-center.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  function buildHUD() {
    var root = document.getElementById('hud');
    root.innerHTML =
      '<div id="hud-mission">' +
        '<div id="hud-mission-ch">CH 1</div>' +
        '<div id="hud-mission-name"></div>' +
        '<div id="hud-mission-obj"></div>' +
        '<div id="hud-mission-bar"><div id="hud-mission-fill"></div></div>' +
        '<div id="hud-mission-next"></div>' +
      '</div>' +
      '<div id="hud-police"></div>' +
      '<div id="hud-top-right">' +
        '<div id="hud-money">$0</div>' +
        '<div id="hud-clock">10:00</div>' +
        '<div id="hud-weapons"></div>' +
      '</div>' +
      '<div id="hud-stars"></div>' +
      '<div id="hud-bottom-left">' +
        '<canvas id="minimap" width="180" height="180"></canvas>' +
        '<div id="hud-district">Palmetto Strip</div>' +
        '<div id="hud-health"><div id="hud-health-fill"></div></div>' +
        '<div id="hud-weapon">Pistol | 12 / 48</div>' +
      '</div>' +
      '<div id="hud-speedbig">' +
        '<div id="hud-speed-car"></div>' +
        '<div id="hud-speed-num">0</div>' +
        '<div id="hud-speed-unit">KM/H</div>' +
      '</div>' +
      '<div id="hud-prompt"></div>' +
      '<div id="hud-dialog"><canvas id="hud-portrait" width="72" height="72"></canvas><div id="hud-dialog-body"><div id="hud-dialog-name"></div><div id="hud-dialog-text"></div></div></div>' +
      '<div id="hud-center">' +
        '<div id="hud-sun"></div>' +
        '<div id="hud-title">SOLMARINA HEAT</div>' +
        '<div id="hud-subtitle">Press ENTER to play</div>' +
        '<div id="hud-howto"><div class="hud-howto-title">HOW TO PLAY</div>' +
          '<div><b>WASD</b> Walk / drive &nbsp; <b>Mouse</b> Aim - Click to shoot</div>' +
          '<div><b>Shift</b> Sprint &nbsp; <b>E</b> Enter / steal a vehicle</div>' +
          '<div><b>R</b> Reload &nbsp; <b>1-4</b> Weapons &nbsp; <b>M</b> Mission &nbsp; <b>N</b> City map &nbsp; <b>P</b> Pause</div>' +
        '</div>' +
        '<div id="hud-controls">A sun-soaked open-world crime story. Steal cars, lose the cops, run the jobs.</div>' +
      '</div>' +
      '<div id="hud-end" style="display:none"><div id="hud-end-title"></div><div id="hud-end-text"></div><div id="hud-end-hint">Press R to restart</div></div>' +
      '<div id="hud-map" style="display:none"><div id="hud-map-head">SOLMARINA HEAT <span>CITY MAP</span><span id="hud-map-close">N / Esc close</span></div>' +
        '<div id="hud-map-body"><div id="hud-map-jobs"></div><canvas id="hud-map-canvas" width="760" height="560"></canvas><div id="hud-map-side"></div></div>' +
      '</div>';
    return {
      root: root,
      money: document.getElementById('hud-money'),
      clock: document.getElementById('hud-clock'),
      topRight: document.getElementById('hud-top-right'),
      bottomLeft: document.getElementById('hud-bottom-left'),
      stars: document.getElementById('hud-stars'),
      mission: document.getElementById('hud-mission'),
      missionCh: document.getElementById('hud-mission-ch'),
      missionName: document.getElementById('hud-mission-name'),
      missionObj: document.getElementById('hud-mission-obj'),
      missionFill: document.getElementById('hud-mission-fill'),
      missionNext: document.getElementById('hud-mission-next'),
      police: document.getElementById('hud-police'),
      weapons: document.getElementById('hud-weapons'),
      healthFill: document.getElementById('hud-health-fill'),
      weapon: document.getElementById('hud-weapon'),
      district: document.getElementById('hud-district'),
      speedBig: document.getElementById('hud-speedbig'),
      speedCar: document.getElementById('hud-speed-car'),
      speedNum: document.getElementById('hud-speed-num'),
      prompt: document.getElementById('hud-prompt'),
      dialog: document.getElementById('hud-dialog'),
      portrait: document.getElementById('hud-portrait'),
      dialogName: document.getElementById('hud-dialog-name'),
      dialogText: document.getElementById('hud-dialog-text'),
      center: document.getElementById('hud-center'),
      sun: document.getElementById('hud-sun'),
      howto: document.getElementById('hud-howto'),
      end: document.getElementById('hud-end'),
      endTitle: document.getElementById('hud-end-title'),
      endText: document.getElementById('hud-end-text'),
      minimap: document.getElementById('minimap'),
      crosshair: document.getElementById('crosshair'),
      map: document.getElementById('hud-map'),
      mapJobs: document.getElementById('hud-map-jobs'),
      mapCanvas: document.getElementById('hud-map-canvas'),
      mapSide: document.getElementById('hud-map-side')
    };
  }

  function fmtClock(minutes) {
    var h = Math.floor(minutes / 60) % 24;
    var m = Math.floor(minutes % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // District name for a world position (same quadrants as city.js).
  function districtAt(x, z) {
    if (x >= 0 && z >= 0) return 'Old Cannery';
    if (x < 0 && z >= 0) return 'Las Brisas';
    if (x >= 0 && z < 0) return 'Palmetto Strip';
    return 'Marina Bay';
  }

  // Code-drawn portrait for the dialog box: a simple face with a
  // distinguishing feature per person. No external images.
  function drawPortrait(canvas, name) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 72, 72);
    var bg = '#3a2a4a';
    if (name === 'Marisol') bg = '#4a2a3a';
    else if (name === 'Rico') bg = '#2a3a2a';
    else if (name === 'Dario') bg = '#2a3a5a';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 72, 72);
    ctx.fillStyle = '#e8b890';
    ctx.fillRect(18, 20, 36, 40);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(26, 36, 5, 5);
    ctx.fillRect(42, 36, 5, 5);
    ctx.fillRect(31, 50, 11, 3);
    if (name === 'Marisol') {
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(16, 12, 40, 16);
      ctx.fillRect(14, 20, 6, 28);
      ctx.fillRect(52, 20, 6, 28);
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(14, 44, 4, 4);
    } else if (name === 'Rico') {
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(14, 12, 44, 10);
      ctx.fillRect(12, 20, 48, 4);
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(28, 46, 16, 4);
    } else if (name === 'Dario') {
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(16, 12, 40, 12);
      ctx.fillRect(14, 22, 44, 5);
    } else {
      ctx.fillStyle = '#111111';
      ctx.fillRect(22, 34, 12, 6);
      ctx.fillRect(38, 34, 12, 6);
    }
  }

  function updateHUD(el, game) {
    // gameplay HUD only lives during play/pause; on the title, wasted,
    // busted and complete screens it clutters the shot, so hide it.
    var live = game.state === 'playing' || game.state === 'paused';
    el.topRight.style.display = live ? 'block' : 'none';
    el.bottomLeft.style.display = live ? 'block' : 'none';
    el.stars.style.display = live ? 'block' : 'none';
    el.prompt.style.display = live ? 'block' : 'none';
    el.money.textContent = '$' + Math.floor(game.player.money).toLocaleString('en-US');
    el.clock.textContent = fmtClock(game.minutes);
    var stars = '';
    for (var i = 0; i < C.WANTED_MAX; i++) stars += i < game.police.stars ? '★' : '☆';
    el.stars.textContent = stars;
    el.stars.style.color = game.police.stars > 0 ? '#ffd23e' : '#888888';

    // mission panel (top-left), only during live play
    var m = game.missions.current();
    if (!live) {
      el.mission.style.display = 'none';
    } else if (game.missions.allDone()) {
      el.mission.style.display = 'block';
      el.missionCh.textContent = 'DONE';
      el.missionName.textContent = 'Solmarina is yours';
      el.missionObj.textContent = 'All 5 missions complete.';
      el.missionFill.style.width = '100%';
      el.missionNext.textContent = '';
    } else if (m) {
      el.mission.style.display = 'block';
      el.missionCh.textContent = 'CH ' + (game.missions.idx + 1);
      el.missionName.textContent = m.name;
      if (game.missions.state === 'active') {
        var step = game.missions.currentStep();
        el.missionObj.textContent = step ? step.text : '';
        el.missionFill.style.width = Math.round((game.missions.stepIdx / m.steps.length) * 100) + '%';
        var next = m.steps[game.missions.stepIdx + 1];
        el.missionNext.textContent = next ? 'NEXT  ' + next.text : 'NEXT  Finish the job';
      } else {
        el.missionObj.textContent = 'Press M to start the mission';
        el.missionFill.style.width = '0%';
        el.missionNext.textContent = '';
      }
    }

    // police response list (top-left, under the mission panel)
    if (game.police.stars > 0 && live) {
      el.police.style.display = 'block';
      var px = game.playerCar ? game.playerCar.x : game.player.x;
      var pz = game.playerCar ? game.playerCar.z : game.player.z;
      var rows = '<div class="hud-police-head">SPD RESPONSE &nbsp; ' +
        (game.police.cars.length + game.police.officers.length) + ' UNITS - CODE ' + game.police.stars + '</div>';
      game.police.cars.slice(0, 5).forEach(function (c) {
        var d = Math.round(Math.sqrt((c.x - px) * (c.x - px) + (c.z - pz) * (c.z - pz)));
        var status = d < 8 ? 'RAMMING' : 'PURSUIT';
        rows += '<div class="hud-police-row"><span>' + (c.unit || 'SPD') + '</span><span>' + d + ' m</span><span class="pill ' + status.toLowerCase() + '">' + status + '</span></div>';
      });
      game.police.roadblocks.forEach(function (rb) {
        rows += '<div class="hud-police-row"><span>' + (rb.unit || 'SPD') + '</span><span>ahead</span><span class="pill roadblock">ROADBLOCK</span></div>';
      });
      if (game.police.cars.length > 5) {
        rows += '<div class="hud-police-more">+' + (game.police.cars.length - 5) + ' more units in the search zone</div>';
      }
      el.police.innerHTML = rows;
    } else {
      el.police.style.display = 'none';
    }

    // weapon slots (top-right)
    var slots = '';
    C.WEAPONS.forEach(function (w, wi) {
      var cur = wi === game.combat.weaponIdx ? ' cur' : '';
      slots += '<div class="hud-wslot' + cur + '"><b>' + (wi + 1) + '</b> ' + w.name +
        ' <span>' + game.combat.ammo[wi] + '/' + game.combat.reserve[wi] + '</span></div>';
    });
    el.weapons.innerHTML = slots;

    var w = game.combat.weapon();
    el.weapon.textContent = w.name + ' | ' + game.combat.ammo[game.combat.weaponIdx] + ' / ' + game.combat.reserve[game.combat.weaponIdx] +
      (game.combat.reloading > 0 ? '  (reloading...)' : '');
    var hp = Math.max(0, game.player.hp);
    el.healthFill.style.width = hp + '%';
    el.healthFill.style.background = hp > 50 ? '#4ac97a' : (hp > 25 ? '#e8b400' : '#c92a2a');
    var pxp = game.playerCar ? game.playerCar.x : game.player.x;
    var pzp = game.playerCar ? game.playerCar.z : game.player.z;
    el.district.textContent = districtAt(pxp, pzp);

    // big speed readout (bottom-right, only while driving)
    if (game.playerCar) {
      el.speedBig.style.display = 'block';
      el.speedCar.textContent = game.playerCar.spec.name;
      el.speedNum.textContent = Math.abs(Math.round(game.playerCar.speed * 3.6));
    } else {
      el.speedBig.style.display = 'none';
    }
    // crosshair only when on foot and aiming (not while driving)
    if (el.crosshair) el.crosshair.style.display = (live && !game.playerCar) ? 'block' : 'none';
    el.prompt.textContent = game.prompt || '';
  }

  function showDialog(el, name, text, ms) {
    el.dialogName.textContent = name;
    el.dialogText.textContent = text;
    if (el.portrait) drawPortrait(el.portrait, name);
    el.dialog.style.display = 'flex';
    if (showDialog._t) clearTimeout(showDialog._t);
    if (ms) showDialog._t = setTimeout(function () { el.dialog.style.display = 'none'; }, ms);
  }
  function hideDialog(el) { el.dialog.style.display = 'none'; }

  function showCenter(el, title, subtitle) {
    el.center.style.display = 'flex';
    document.getElementById('hud-title').textContent = title;
    document.getElementById('hud-subtitle').textContent = subtitle || '';
    var isTitle = title === 'SOLMARINA HEAT';
    if (el.sun) el.sun.style.display = isTitle ? 'block' : 'none';
    if (el.howto) el.howto.style.display = isTitle ? 'block' : 'none';
  }
  function hideCenter(el) {
    el.center.style.display = 'none';
    if (el.sun) el.sun.style.display = 'none';
    if (el.howto) el.howto.style.display = 'none';
  }

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
    ctx.fillStyle = '#2a2f38';
    ctx.fillRect(0, 0, S, S);
    // water
    ctx.fillStyle = '#1a5a7a';
    ctx.fillRect(0, pz(C.WATER_Y), S, S - pz(C.WATER_Y));
    // roads
    ctx.fillStyle = '#777770';
    game.city.roadsX.forEach(function (z) { ctx.fillRect(0, pz(z) - 2, S, 4); });
    game.city.roadsZ.forEach(function (x) { ctx.fillRect(px(x) - 2, 0, 4, S); });
    // buildings
    ctx.fillStyle = '#a8a898';
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
    drawMinimap: drawMinimap, fmtClock: fmtClock,
    districtAt: districtAt, drawPortrait: drawPortrait
  };
})();
