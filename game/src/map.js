// Solmarina Heat - map.js
// Full city map screen (N key): whole city top-down with district names,
// roads, water, player marker, mission marker and a route line, plus a
// story job list on the left and a legend on the right.
(function () {
  'use strict';
  var C = window.SH_CONFIG;
  var DEFS = window.SH_MISSIONS.DEFS;

  function draw(el, game) {
    // jobs list (left)
    var jobs = '<div class="map-sec-title">STORY</div><div class="map-jobs-count">' +
      (game.missions.idx) + ' / ' + DEFS.length + ' jobs</div>';
    DEFS.forEach(function (m, i) {
      var status, cls;
      if (i < game.missions.idx) { status = 'Complete'; cls = 'done'; }
      else if (i === game.missions.idx) { status = game.missions.state === 'active' ? 'In progress' : 'Next'; cls = 'cur'; }
      else { status = 'Locked'; cls = 'locked'; }
      jobs += '<div class="map-job ' + cls + '"><div class="map-job-name">' + (i + 1) + '. ' + m.name +
        '</div><div class="map-job-meta">' + status + ' &nbsp; $' + m.reward + '</div></div>';
    });
    var cur = game.missions.current();
    jobs += '<div class="map-cur"><div class="map-sec-title">CURRENT JOB</div>' +
      (cur ? '<div class="map-job-name">' + cur.name + '</div><div class="map-job-meta">' +
        (game.missions.currentStep() ? game.missions.currentStep().text : '') + '</div>' : 'All jobs done.') + '</div>';
    el.mapJobs.innerHTML = jobs;

    // legend + stats (right)
    el.mapSide.innerHTML =
      '<div class="map-sec-title">LEGEND</div>' +
      '<div class="map-leg"><span class="dot you"></span> You are here</div>' +
      '<div class="map-leg"><span class="dot obj"></span> Job objective</div>' +
      '<div class="map-leg"><span class="dot police"></span> Police</div>' +
      '<div class="map-leg"><span class="dot garage"></span> Garage (Palmetto Strip)</div>' +
      '<div class="map-leg"><span class="dot water"></span> Bay / water</div>' +
      '<div class="map-stats">Cash $' + Math.floor(game.player.money).toLocaleString('en-US') +
      '<br>Missions ' + game.missions.idx + ' / ' + DEFS.length +
      '<br>Wanted ' + game.police.stars + ' / 5 stars</div>';

    // map canvas
    var ctx = el.mapCanvas.getContext('2d');
    var W = el.mapCanvas.width, H = el.mapCanvas.height;
    var scale = Math.min(W, H) / C.CITY_SIZE;
    var ox = (W - C.CITY_SIZE * scale) / 2, oy = (H - C.CITY_SIZE * scale) / 2;
    var half = C.CITY_SIZE / 2;
    function mx(x) { return ox + (x + half) * scale; }
    function mz(z) { return oy + (z + half) * scale; }
    ctx.fillStyle = '#14181f';
    ctx.fillRect(0, 0, W, H);
    // districts (quadrants)
    var quads = [
      { x0: -half, z0: -half, x1: 0, z1: 0, color: '#2a4a5a', name: 'Marina Bay' },
      { x0: 0, z0: -half, x1: half, z1: 0, color: '#5a3a28', name: 'Palmetto Strip' },
      { x0: -half, z0: 0, x1: 0, z1: half, color: '#3a4a2a', name: 'Las Brisas' },
      { x0: 0, z0: 0, x1: half, z1: half, color: '#4a3226', name: 'Old Cannery' }
    ];
    quads.forEach(function (q) {
      ctx.fillStyle = q.color;
      ctx.fillRect(mx(q.x0), mz(q.z0), (q.x1 - q.x0) * scale, (q.z1 - q.z0) * scale);
    });
    // water (south bay)
    ctx.fillStyle = '#1a5a7a';
    ctx.fillRect(mx(-half), mz(C.WATER_Y), C.CITY_SIZE * scale, (half - C.WATER_Y) * scale);
    // beach
    ctx.fillStyle = '#d8c89a';
    ctx.fillRect(mx(-half), mz(C.WATER_Y - 16), C.CITY_SIZE * scale, 16 * scale);
    // roads
    ctx.fillStyle = '#c8c0a8';
    game.city.roadsX.forEach(function (z) { ctx.fillRect(mx(-half), mz(z) - 2, C.CITY_SIZE * scale, 4); });
    game.city.roadsZ.forEach(function (x) { ctx.fillRect(mx(x) - 2, mz(-half), 4, C.CITY_SIZE * scale); });
    // buildings
    ctx.fillStyle = '#8a8478';
    game.city.buildings.forEach(function (b) {
      ctx.fillRect(mx(b.minX), mz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    });
    // bridge
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(mx(C.BRIDGE_X - C.BRIDGE_WIDTH / 2), mz(C.WATER_Y), C.BRIDGE_WIDTH * scale, (half - C.WATER_Y) * scale);
    // district labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    quads.forEach(function (q) {
      ctx.fillText(q.name, mx((q.x0 + q.x1) / 2), mz((q.z0 + q.z1) / 2));
    });
    // garage marker (Palmetto Strip, mission 1 target)
    ctx.fillStyle = '#4ac97a';
    ctx.beginPath(); ctx.arc(mx(52), mz(0), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('GARAGE', mx(52), mz(0) - 10);
    // route + mission beacon
    var px = game.playerCar ? game.playerCar.x : game.player.x;
    var pz = game.playerCar ? game.playerCar.z : game.player.z;
    var step = game.missions.currentStep();
    if (game.missions.state === 'active' && step && step.x !== undefined) {
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx(px), mz(pz));
      ctx.lineTo(mx(step.x), mz(step.z));
      ctx.stroke();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(mx(step.x), mz(step.z), 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#14181f';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('!', mx(step.x), mz(step.z) + 4);
    }
    // police dots
    ctx.fillStyle = '#4488ff';
    game.police.cars.forEach(function (c) {
      ctx.beginPath(); ctx.arc(mx(c.x), mz(c.z), 4, 0, Math.PI * 2); ctx.fill();
    });
    // player marker (green triangle)
    ctx.fillStyle = '#4ac97a';
    ctx.beginPath();
    ctx.moveTo(mx(px), mz(pz) - 9);
    ctx.lineTo(mx(px) - 7, mz(pz) + 7);
    ctx.lineTo(mx(px) + 7, mz(pz) + 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  window.SH_MAP = { draw: draw };
})();
