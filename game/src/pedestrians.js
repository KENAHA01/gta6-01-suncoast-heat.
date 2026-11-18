// Solmarina Heat - pedestrians.js
// AI pedestrians: walk road edges between intersections, step aside for the
// player on foot, flee when a fast car closes in.
(function () {
  'use strict';
  var C = window.SH_CONFIG;
  var R = window.SH_RANDOM;

  var SHIRT_COLORS = [0xc94a4a, 0x4a7ac9, 0x4ac97a, 0xe8c84a, 0x9a4ac9, 0xe8e8e8, 0x3a3a3a];
  var SKIN_COLORS = [0xe8b890, 0xc98a5a, 0x8a5a3a, 0xf0c8a0];

  function buildPedMesh(rng) {
    var g = new THREE.Group();
    var shirt = new THREE.MeshLambertMaterial({ color: SHIRT_COLORS[Math.floor(rng() * SHIRT_COLORS.length)] });
    var skin = new THREE.MeshLambertMaterial({ color: SKIN_COLORS[Math.floor(rng() * SKIN_COLORS.length)] });
    var pants = new THREE.MeshLambertMaterial({ color: 0x2a3a5a });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.35), shirt);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    head.position.y = 1.65;
    head.castShadow = true;
    g.add(head);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.25), pants);
    legL.position.set(-0.15, 0.32, 0);
    g.add(legL);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.25), pants);
    legR.position.set(0.15, 0.32, 0);
    g.add(legR);
    g.userData.legs = [legL, legR];
    return g;
  }

  function PedManager(city, scene) {
    this.city = city;
    this.scene = scene;
    this.peds = [];
    this.rng = R.stream(C.SEED + 131);
  }

  PedManager.prototype.spawnOne = function () {
    var rng = this.rng;
    var alongX = rng() < 0.5;
    var line = alongX ? this.city.roadsX[Math.floor(rng() * this.city.roadsX.length)]
                      : this.city.roadsZ[Math.floor(rng() * this.city.roadsZ.length)];
    var pos = R.randRange(-220, 220);
    var dir = rng() < 0.5 ? 1 : -1;
    var x, z;
    if (alongX) { x = pos; z = line + (dir > 0 ? 8 : -8); }
    else { x = line + (dir > 0 ? -8 : 8); z = pos; }
    if (z > C.WATER_Y - 6) { z = C.WATER_Y - 10; }
    var mesh = buildPedMesh(rng);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    var p = {
      mesh: mesh, x: x, z: z, alongX: alongX, line: line, dir: dir,
      speed: R.randRange(1.2, 2.2), flee: 0, heading: alongX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      walkPhase: rng() * Math.PI * 2
    };
    mesh.rotation.y = p.heading;
    this.peds.push(p);
    return p;
  };

  PedManager.prototype.init = function (count) {
    for (var i = 0; i < count; i++) this.spawnOne();
  };

  PedManager.prototype.update = function (dt, player, playerCar, trafficCars) {
    var half = C.CITY_SIZE / 2;
    for (var i = 0; i < this.peds.length; i++) {
      var p = this.peds[i];
      // flee: a fast car (player's or traffic) closing in
      var threat = null, threatD = 1e9;
      var cars = playerCar ? trafficCars.concat([playerCar]) : trafficCars;
      for (var c = 0; c < cars.length; c++) {
        var car = cars[c];
        if (Math.abs(car.speed) < 8) continue;
        var dx = p.x - car.x, dz = p.z - car.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d < 14 && d < threatD) { threat = car; threatD = d; }
      }
      if (threat) {
        p.flee = 1.2;
        var dx2 = p.x - threat.x, dz2 = p.z - threat.z;
        var d2 = Math.max(0.1, Math.sqrt(dx2 * dx2 + dz2 * dz2));
        p.heading = Math.atan2(dx2 / d2, dz2 / d2);
      } else if (p.flee > 0) {
        p.flee -= dt;
      } else {
        // step aside for the player on foot
        var pdx = p.x - player.x, pdz = p.z - player.z;
        var pd = Math.sqrt(pdx * pdx + pdz * pdz);
        if (pd < 3 && pd > 0.1) {
          p.heading = Math.atan2(pdx / pd, pdz / pd);
          p.x += Math.sin(p.heading) * 1.5 * dt;
          p.z += Math.cos(p.heading) * 1.5 * dt;
        }
      }
      var speed = p.flee > 0 ? 5.2 : p.speed;
      if (p.flee <= 0) {
        // wander along the road edge; turn at intersections
        p.x += Math.sin(p.heading) * speed * dt;
        p.z += Math.cos(p.heading) * speed * dt;
        if (Math.abs(p.x) > half - 8 || Math.abs(p.z) > half - 8 || p.z > C.WATER_Y - 6) {
          p.heading += Math.PI;
          p.dir = -p.dir;
        }
      } else {
        p.x += Math.sin(p.heading) * speed * dt;
        p.z += Math.cos(p.heading) * speed * dt;
      }
      // leg swing
      p.walkPhase += dt * speed * 3.2;
      var swing = Math.sin(p.walkPhase) * 0.45;
      p.mesh.userData.legs[0].rotation.x = swing;
      p.mesh.userData.legs[1].rotation.x = -swing;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
  };

  window.SH_PEDS = { PedManager: PedManager };
})();
