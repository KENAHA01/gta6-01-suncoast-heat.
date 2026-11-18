// Solmarina Heat - hud.js
// DOM HUD: mission panel, SPD response list, weapon slots, big speed,
// round minimap with district label, health, dialog with portraits.
// The gameplay HUD only shows while playing or paused; title, wasted,
// busted and complete screens stay clean for screenshots.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  // Code-drawn portraits for the dialog box: a small canvas face per
  // speaker, so mission dialog reads as a real character talking.
  function drawPortrait(canvas, name) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var bg = '#3a3a4a', hair = '#1a1a1a', cap = null;
    if (name === 'Marisol') { bg = '#0e5a5a'; hair = '#241a12'; }
    else if (name === 'Rico') { bg = '#5a1a1a'; hair = '#0a0a0a'; cap = '#2a2a2a'; }
    else if (name === 'Dario') { bg = '#1a3a6a'; hair = '#2a1a0a'; cap = '#c92a2a'; }
    else { bg = '#444444'; hair = '#666666'; }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // shoulders
    ctx.fillStyle = name === 'Marisol' ? '#c94a7a' : (name === 'Rico' ? '#3a3a3a' : '#2a6ac9');
    ctx.fillRect(6, H - 14, W - 12, 14);
    // head
    ctx.fillStyle = '#e8b890';
    ctx.beginPath(); ctx.arc(W / 2, H / 2 - 2, 15, 0, Math.PI * 2); ctx.fill();
    // hair or cap
    if (cap) {
      ctx.fillStyle = cap;
      ctx.fillRect(W / 2 - 16, H / 2 - 18, 32, 8);
      ctx.fillRect(W / 2 - 16, H / 2 - 12, 34, 4);
    } else {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(W / 2, H / 2 - 6, 15, Math.PI, 0); ctx.fill();
      if (name === 'Marisol') {
        ctx.fillRect(W / 2 - 16, H / 2 - 6, 5, 22);
        ctx.fillRect(W / 2 + 11, H / 2 - 6, 5, 22);
      }
    }
    // eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(W / 2 - 8, H / 2 - 2, 4, 3);
    ctx.fillRect(W / 2 + 4, H / 2 - 2, 4, 3);
    // mouth
    ctx.fillRect(W / 2 - 4, H / 2 + 8, 8, 2);
  }

  function buildHUD() {
    var root = document.getElementById('hud');
    root.innerHTML =
      '<div id="hud-gameplay">' +
        '<div id="hud-top-right">' +
          '<div id="hud-money">$0</div>' +
          '<div id="hud-clock">10:00</div>' +
        '</div>' +
        '<div id="hud-stars"></div>' +
        '<div id="hud-mission"><div id="hud-mission-ch"></div><div id="hud-mission-name"></div>' +
          '<div id="hud-mission-objective"></div><div id="hud-mission-stage"><div id="hud-mission-stage-fill"></div></div>' +
          '<div id="hud-mission-next"></div></div>' +
        '<div id="hud-response"><div id="hud-response-title"></div><div id="hud-response-list"></div></div>' +
        '<div id="hud-weapons"></div>' +
        '<div id="hud-speed-big"><div id="hud-speed-car"></div><div id="hud-speed-num"></div></div>' +
        '<div id="hud-bottom-left">' +
          '<div id="hud-health"><div id="hud-health-fill"></div></div>' +
          '<div id="hud-weapon">Pistol | 12 / 48</div>' +
        '</div>' +
        '<div id="hud-prompt"></div>' +
        '<div id="hud-dialog"><canvas id="hud-dialog-portrait" width="56" height="56"></canvas>' +
          '<div id="hud-dialog-body"><div id="hud-dialog-name"></div><div id="hud-dialog-text"></div></div></div>' +
        '<div id="hud-minimap-wrap"><canvas id="minimap" width="180" height="180"></canvas>' +
          '<div id="hud-district">Palmetto Strip</div></div>' +
      '</div>' +
      '<div id="hud-center"><div id="hud-title">SOLMARINA HEAT</div>' +
        '<div id="hud-subtitle">Press ENTER to play</div>' +
        '<div id="hud-controls">WASD move &nbsp; Mouse look &nbsp; Click shoot &nbsp; E enter/exit car &nbsp; R reload &nbsp; 1-4 weapons &nbsp; N map &nbsp; P pause</div>' +
        '<div id="hud-howto"><div id="hud-howto-title">HOW TO PLAY</div>' +
          '<div><b>WASD</b> Walk / drive</div>' +
          '<div><b>Mouse</b> Aim - Click to shoot</div>' +
          '<div><b>Shift</b> Sprint</div>' +
          '<div><b>E</b> Enter / steal a car</div>' +
          '<div><b>R</b> Reload</div>' +
          '<div><b>1-4</b> Weapons</div>' +
          '<div><b>M</b> Start a mission</div>' +
          '<div><b>N</b> City map</div>' +
          '<div><b>P</b> Pause - S save</div></div>' +
      '</div>' +
      '<div id="hud-end" style="display:none"><div id="hud-end-title"></div><div id="hud-end-text"></div><div id="hud-end-hint">Press R to restart</div></div>';
    return {
      root: root,
      gameplay: document.getElementById('hud-gameplay'),
      money: document.getElementById('hud-money'),
      clock: document.getElementById('hud-clock'),
      stars: document.getElementById('hud-stars'),
      mission: document.getElementById('hud-mission'),
      missionCh: document.getElementById('hud-mission-ch'),
      missionName: document.getElementById('hud-mission-name'),
      missionObjective: document.getElementById('hud-mission-objective'),
      missionStageFill: document.getElementById('hud-mission-stage-fill'),
      missionNext: document.getElementById('hud-mission-next'),
      response: document.getElementById('hud-response'),
      responseTitle: document.getElementById('hud-response-title'),
      responseList: document.getElementById('hud-response-list'),
      weapons: document.getElementById('hud-weapons'),
      speedBig: document.getElementById('hud-speed-big'),
      speedCar: document.getElementById('hud-speed-car'),
      speedNum: document.getElementById('hud-speed-num'),
      healthFill: document.getElementById('hud-health-fill'),
      weapon: document.getElementById('hud-weapon'),
      prompt: document.getElementById('hud-prompt'),
      dialog: document.getElementById('hud-dialog'),
      dialogPortrait: document.getElementById('hud-dialog-portrait'),
      dialogName: document.getElementById('hud-dialog-name'),
      dialogText: document.getElementById('hud-dialog-text'),
      center: document.getElementById('hud-center'),
      end: document.getElementById('hud-end'),
      endTitle: document.getElementById('hud-end-title'),
      endText: document.getElementById('hud-end-text'),
      minimap: document.getElementById('minimap'),
      district: document.getElementById('hud-district'),
      _lastMission: '', _lastResponse: '', _lastWeapons: ''
    };
  }

  function fmtClock(minutes) {
    var h = Math.floor(minutes / 60) % 24;
    var m = Math.floor(minutes % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function districtAt(x, z) {
    var best = C.DISTRICTS[0], bestD = 1e18;
    C.DISTRICTS.forEach(function (d) {
      var dx = x - d.cx, dz = z - d.cz;
      var dd = dx * dx + dz * dz;
      if (dd < bestD) { bestD = dd; best = d; }
    });
    return best.name;
  }

  function updateHUD(el, game) {
    // gameplay panels only while playing or paused
    var live = game.state === 'playing' || game.state === 'paused';
    el.gameplay.style.display = live ? 'block' : 'none';
    var cross = document.getElementById('crosshair');
    if (cross) cross.style.display = (live && !game.playerCar) ? 'block' : 'none';
    if (!live) return;
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
    // big speed readout while driving
    if (game.playerCar) {
      el.speedBig.style.display = 'block';
      el.speedCar.textContent = game.playerCar.spec.name;
      el.speedNum.textContent = Math.abs(Math.round(game.playerCar.speed * 3.6)) + ' KM/H';
    } else {
      el.speedBig.style.display = 'none';
    }
    // mission panel
    var m = game.missions.current();
    var mKey = '';
    if (game.missions.state === 'active' && m) {
      var step = game.missions.currentStep();
      var stage = m.steps.length > 1 ? (game.missions.stepIdx + 1) + '/' + m.steps.length : '1/1';
      var next = '';
      if (game.missions.stepIdx + 1 < m.steps.length) next = 'NEXT ' + m.steps[game.missions.stepIdx + 1].text;
      else if (game.missions.idx + 1 < C.MISSION_COUNT) next = 'NEXT ' + window.SH_MISSIONS.DEFS[game.missions.idx + 1].name;
      else next = 'NEXT Finish the story';
      mKey = 'CH ' + (game.missions.idx + 1) + '|' + m.name + '|' + (step ? step.text : '') + '|' + stage + '|' + next;
      if (mKey !== el._lastMission) {
        el._lastMission = mKey;
        el.missionCh.textContent = 'CH ' + (game.missions.idx + 1);
        el.missionName.textContent = m.name.toUpperCase();
        el.missionObjective.textContent = step ? step.text : '';
        el.missionStageFill.style.width = ((game.missions.stepIdx + 1) / m.steps.length * 100) + '%';
        el.missionNext.textContent = next;
      }
      el.mission.style.display = 'block';
    } else if (game.missions.allDone()) {
      if (el._lastMission !== 'done') {
        el._lastMission = 'done';
        el.missionCh.textContent = 'DONE';
        el.missionName.textContent = 'SOLMARINA IS YOURS';
        el.missionObjective.textContent = 'All missions complete.';
        el.missionStageFill.style.width = '100%';
        el.missionNext.textContent = '';
      }
      el.mission.style.display = 'block';
    } else {
      el.mission.style.display = 'none';
    }
    // SPD response list while wanted
    if (game.police.stars > 0) {
      var px = game.playerCar ? game.playerCar.x : game.player.x;
      var pz = game.playerCar ? game.playerCar.z : game.player.z;
      var units = [];
      game.police.cars.forEach(function (c) {
        var dx = c.x - px, dz = c.z - pz;
        var d = Math.round(Math.sqrt(dx * dx + dz * dz));
        units.push({ name: c.unit || 'SPD-??', d: d, pill: d < 12 ? 'RAMMING' : 'PURSUIT' });
      });
      game.police.roadblocks.forEach(function (c) {
        var dx2 = c.x - px, dz2 = c.z - pz;
        var d2 = Math.round(Math.sqrt(dx2 * dx2 + dz2 * dz2));
        units.push({ name: c.unit || 'SPD-??', d: d2, pill: 'ROADBLOCK' });
      });
      units.sort(function (a, b) { return a.d - b.d; });
      var shown = units.slice(0, 4);
      var rKey = game.police.stars + '|' + units.length + '|' + shown.map(function (u) { return u.name + u.d + u.pill; }).join(',');
      if (rKey !== el._lastResponse) {
        el._lastResponse = rKey;
        el.responseTitle.textContent = 'SPD RESPONSE - ' + units.length + ' UNITS - CODE ' + game.police.stars;
        var html = '';
        shown.forEach(function (u) {
          html += '<div class="hud-response-row"><span class="hud-response-name">' + u.name + '</span>' +
            '<span class="hud-response-dist">' + u.d + ' m</span>' +
            '<span class="hud-response-pill hud-pill-' + u.pill + '">' + u.pill + '</span></div>';
        });
        if (units.length > shown.length) html += '<div class="hud-response-more">+' + (units.length - shown.length) + ' more units in the search zone</div>';
        el.responseList.innerHTML = html;
      }
      el.response.style.display = 'block';
    } else {
      el.response.style.display = 'none';
    }
    // weapon slots
    var wKey = game.combat.weaponIdx + '|' + game.combat.ammo.join(',') + '|' + game.combat.reserve.join(',');
    if (wKey !== el._lastWeapons) {
      el._lastWeapons = wKey;
      var wh = '';
      C.WEAPONS.forEach(function (ww, idx) {
        wh += '<div class="hud-weapon-slot' + (idx === game.combat.weaponIdx ? ' hud-weapon-current' : '') + '">' +
          '<div class="hud-weapon-key">' + (idx + 1) + '</div>' +
          '<div class="hud-weapon-name">' + ww.name.toUpperCase() + '</div>' +
          '<div class="hud-weapon-ammo">' + game.combat.ammo[idx] + '/' + game.combat.reserve[idx] + '</div></div>';
      });
      el.weapons.innerHTML = wh;
    }
    // district label under the minimap
    var dpx = game.playerCar ? game.playerCar.x : game.player.x;
    var dpz = game.playerCar ? game.playerCar.z : game.player.z;
    el.district.textContent = districtAt(dpx, dpz).toUpperCase();
    el.prompt.textContent = game.prompt || '';
  }

  function showDialog(el, name, text, ms) {
    el.dialogName.textContent = name;
    el.dialogText.textContent = text;
    // the portrait may not be on the passed object (shots.js passes a
    // partial HUD); find it inside the dialog element itself.
    var portrait = el.dialogPortrait || (el.dialog && el.dialog.querySelector ? el.dialog.querySelector('#hud-dialog-portrait') : null);
    if (portrait) drawPortrait(portrait, name);
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
