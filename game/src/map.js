// Solmarina Heat - map.js
// Full city map screen (N key): top-down canvas with districts, roads,
// buildings, water, beach and bridge, plus the story job list, a legend
// and run stats. The map pauses the action while it is open.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  function buildMap() {
    var ov = document.createElement('div');
    ov.id = 'map-overlay';
    ov.style.display = 'none';
    ov.innerHTML =
      '<div id="map-header"><span id="map-title">SOLMARINA HEAT</span> CITY MAP' +
        '<span id="map-close">N / Esc close</span></div>' +
      '<div id="map-body">' +
        '<div id="map-jobs"><div class="map-panel-title">STORY</div><div id="map-jobs-list"></div>' +
          '<div id="map-current"><div class="map-panel-title">CURRENT JOB</div><div id="map-current-body"></div></div></div>' +
        '<canvas id="map-canvas" width="620" height="620"></canvas>' +
        '<div id="map-right"><div class="map-panel-title">LEGEND</div><div id="map-legend">' +
          '<div><span class="map-dot" style="background:#4ac97a"></span> You are here</div>' +
          '<div><span class="map-dot" style="background:#ffd23e"></span> Job objective</div>' +
          '<div><span class="map-dot" style="background:#4488ff"></span> Police</div>' +
          '<div><span class="map-dot" style="background:#ff4444"></span> Enemy</div>' +
          '<div><span class="map-dot" style="background:#e8e8e8"></span> Traffic</div>' +
          '<div><span class="map-dot" style="background:#c9a0ff"></span> Garage</div>' +
          '</div>' +
          '<div id="map-stats"></div></div>' +
      '</div>';
    document.body.appendChild(ov);
    return {
      overlay: ov,
      canvas: document.getElementById('map-canvas'),
      jobsList: document.getElementById('map-jobs-list'),
      currentBody: document.getElementById('map-current-body'),
      stats: document.getElementById('map-stats'),
      _lastJobs: '', _lastStats: ''
    };
  }

  function drawMap(el, game) {
    var ctx = el.canvas.getContext('2d');
    var S = 620, half = C.CITY_SIZE / 2;
    function px(x) { return (x + half) / C.CITY_SIZE * S; }
    function pz(z) { return (z + half) / C.CITY_SIZE * S; }
    // district quadrant tints
    var quads = [
      { x0: -half, z0: -half, x1: 0, z1: 0, c: '#2a4a5a' },
      { x0: 0, z0: -half, x1: half, z1: 0, c: '#5a4030' },
      { x0: -half, z0: 0, x1: 0, z1: C.WATER_Y, c: '#3a4a2a' },
      { x0: 0, z0: 0, x1: half, z1: C.WATER_Y, c: '#4a3a2a' }
    ];
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, S, S);
    quads.forEach(function (q) {
      ctx.fillStyle = q.c;
      ctx.fillRect(px(q.x0), pz(q.z0), px(q.x1) - px(q.x0), pz(q.z1) - pz(q.z0));
    });
    // water + beach
    ctx.fillStyle = '#1a5a7a';
    ctx.fillRect(0, pz(C.WATER_Y), S, S - pz(C.WATER_Y));
    ctx.fillStyle = '#d8c89a';
    ctx.fillRect(0, pz(C.WATER_Y - 16), S, pz(C.WATER_Y) - pz(C.WATER_Y - 16));
    // bridge
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(px(-C.BRIDGE_WIDTH / 2), pz(C.WATER_Y - 16), px(C.BRIDGE_WIDTH / 2) - px(-C.BRIDGE_WIDTH / 2), S - pz(C.WATER_Y - 16));
    // roads
    ctx.fillStyle = '#b8b0a0';
    game.city.roadsX.forEach(function (z) { ctx.fillRect(0, pz(z) - 4, S, 8); });
    game.city.roadsZ.forEach(function (x) { ctx.fillRect(px(x) - 4, 0, 8, S); });
    // buildings
    ctx.fillStyle = '#6a6a60';
    game.city.buildings.forEach(function (b) {
      ctx.fillRect(px(b.minX), pz(b.minZ), px(b.maxX) - px(b.minX), px(b.maxZ) - pz(b.minZ));
    });
    // district names
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    C.DISTRICTS.forEach(function (d) {
      ctx.fillText(d.name.toUpperCase(), px(d.cx), pz(d.cz));
    });
    // garage marker (mission 1 destination, Palmetto Strip)
    ctx.fillStyle = '#c9a0ff';
    ctx.beginPath(); ctx.arc(px(52), pz(0), 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('G', px(52), pz(0) + 4);
    // mission beacon + route line from the player
    var step = game.missions.currentStep();
    var pxp = game.playerCar ? game.playerCar.x : game.player.x;
    var pzp = game.playerCar ? game.playerCar.z : game.player.z;
    if (game.missions.state === 'active' && step && step.x !== undefined) {
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px(pxp), pz(pzp)); ctx.lineTo(px(step.x), pz(step.z)); ctx.stroke();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(px(step.x), pz(step.z), 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('!', px(step.x), pz(step.z) + 4);
    }
    // traffic
    ctx.fillStyle = '#e8e8e8';
    game.traffic.cars.forEach(function (c) { ctx.fillRect(px(c.x) - 3, pz(c.z) - 3, 6, 6); });
    // police
    ctx.fillStyle = '#4488ff';
    game.police.cars.forEach(function (c) { ctx.beginPath(); ctx.arc(px(c.x), pz(c.z), 5, 0, Math.PI * 2); ctx.fill(); });
    // enemies
    ctx.fillStyle = '#ff4444';
    game.combat.enemies.forEach(function (e) { ctx.beginPath(); ctx.arc(px(e.x), pz(e.z), 5, 0, Math.PI * 2); ctx.fill(); });
    // player triangle, rotated by heading
    var heading = game.playerCar ? game.playerCar.heading : game.player.heading;
    ctx.fillStyle = '#4ac97a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var tx = px(pxp), tz = pz(pzp);
    ctx.moveTo(tx + Math.sin(heading) * 12, tz + Math.cos(heading) * 12);
    ctx.lineTo(tx + Math.sin(heading + 2.5) * 9, tz + Math.cos(heading + 2.5) * 9);
    ctx.lineTo(tx + Math.sin(heading - 2.5) * 9, tz + Math.cos(heading - 2.5) * 9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // job list
    var jobsKey = game.missions.idx + '|' + game.missions.state;
    if (jobsKey !== el._lastJobs) {
      el._lastJobs = jobsKey;
      var html = '';
      window.SH_MISSIONS.DEFS.forEach(function (m, i) {
        var status = i < game.missions.idx ? 'Complete' : (i === game.missions.idx ? (game.missions.state === 'active' ? 'In progress' : 'Available') : 'Locked');
        html += '<div class="map-job' + (i === game.missions.idx ? ' map-job-current' : '') + '">' +
          '<div class="map-job-name">' + (i + 1) + '. ' + m.name.toUpperCase() + '</div>' +
          '<div class="map-job-meta">' + status + ' - $' + m.reward + '</div></div>';
      });
      el.jobsList.innerHTML = html;
      var cur = game.missions.current();
      el.currentBody.innerHTML = cur
        ? '<div class="map-job-name">' + cur.name.toUpperCase() + '</div>' +
          '<div class="map-job-meta">' + (game.missions.currentStep() ? game.missions.currentStep().text : '') + '</div>'
        : '<div class="map-job-name">ALL JOBS DONE</div><div class="map-job-meta">Solmarina is yours.</div>';
    }
    // stats
    var sKey = Math.floor(game.player.money) + '|' + game.missions.idx + '|' + game.police.stars;
    if (sKey !== el._lastStats) {
      el._lastStats = sKey;
      el.stats.innerHTML = '<div>Cash <b>$' + Math.floor(game.player.money) + '</b></div>' +
        '<div>Jobs done <b>' + game.missions.idx + ' / ' + C.MISSION_COUNT + '</b></div>' +
        '<div>Wanted <b>' + game.police.stars + ' stars</b></div>';
    }
  }

  function show(el) { el.overlay.style.display = 'block'; }
  function hide(el) { el.overlay.style.display = 'none'; }

  window.SH_MAP = { buildMap: buildMap, drawMap: drawMap, show: show, hide: hide };
})();
