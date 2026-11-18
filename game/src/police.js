// Solmarina Heat - police.js
// Wanted stars 1-5, police foot patrol and pursuit cars, roadblocks, BUSTED.
(function () {
  'use strict';
  var C = window.SH_CONFIG;
  var R = window.SH_RANDOM;
  var V = window.SH_VEHICLES;

  var POLICE_SPEC = { name: 'Police Interceptor', top: 32, accel: 18, brake: 30, turn: 2.2, grip: 0.9, color: 0x1a1a2a, len: 4.4, wid: 2.0 };

  function buildPoliceCarMesh() {
    var g = V.buildCarMesh(POLICE_SPEC);
    // light bar
    var barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x880000 }));
    barR.position.set(-0.45, 1.62, -0.3);
    g.add(barR);
    var barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x000088 }));
    barB.position.set(0.45, 1.62, -0.3);
    g.add(barB);
    // white doors
    var door = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.5, 1.6), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
    door.position.set(0, 0.55, 0.1);
    g.add(door);
    return g;
  }

  function buildOfficerMesh() {
    var g = new THREE.Group();
    var uni = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
    var skin = new THREE.MeshLambertMaterial({ color: 0xe8b890 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.38), uni);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
    head.position.y = 1.66;
    g.add(head);
    var cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.48), new THREE.MeshLambertMaterial({ color: 0x0a1a3a }));
    cap.position.y = 1.88;
    g.add(cap);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.26), uni);
    legL.position.set(-0.16, 0.32, 0);
    g.add(legL);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.26), uni);
    legR.position.set(0.16, 0.32, 0);
    g.add(legR);
    return g;
  }

  function Police(scene, city) {
    this.scene = scene;
    this.city = city;
    this.stars = 0;
    this.heat = 0;              // 0..100, drives star count
    this.hiddenTimer = 0;       // seconds out of sight, decays heat
    this.cars = [];
    this.officers = [];
    this.roadblocks = [];
    this.rng = R.stream(C.SEED + 301);
    this.spawnTimer = 0;
    this.unitIdx = 0;           // rotating index into C.POLICE_UNITS
  }

  // Next named response unit (SPD-12, SPD-27, ...), cycling the pool so
  // the HUD's SPD RESPONSE list shows distinct named units.
  Police.prototype.nextUnit = function () {
    var u = C.POLICE_UNITS[this.unitIdx % C.POLICE_UNITS.length];
    this.unitIdx++;
    return u;
  };

  Police.prototype.addHeat = function (amount) {
    this.heat = Math.min(100, this.heat + amount);
    this.stars = Math.ceil(this.heat / 20);
    if (this.stars > C.WANTED_MAX) this.stars = C.WANTED_MAX;
    this.hiddenTimer = 0;
  };

  Police.prototype.spawnCar = function (player) {
    var a = this.rng() * Math.PI * 2;
    var d = R.randRange(55, 90);
    var x = player.x + Math.sin(a) * d, z = player.z + Math.cos(a) * d;
    x = Math.max(-240, Math.min(240, x));
    z = Math.max(-240, Math.min(C.WATER_Y - 10, z));
    if (this.city.isBlocked(x, z, 2)) return;
    var v = V.makeVehicle(POLICE_SPEC, x, z, 0, 'police', this.scene);
    // swap in the police mesh (lights + white doors)
    this.scene.remove(v.group);
    v.group = buildPoliceCarMesh();
    v.group.position.set(x, 0, z);
    this.scene.add(v.group);
    v.speed = 10;
    v.unit = this.nextUnit();
    this.cars.push(v);
  };

  Police.prototype.spawnOfficer = function (player) {
    var a = this.rng() * Math.PI * 2;
    var d = R.randRange(25, 45);
    var x = player.x + Math.sin(a) * d, z = player.z + Math.cos(a) * d;
    if (this.city.isBlocked(x, z, 1)) return;
    var mesh = buildOfficerMesh();
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.officers.push({ mesh: mesh, x: x, z: z, heading: 0 });
  };

  Police.prototype.spawnRoadblock = function (player, playerHeading) {
    // two police cars parked across the road ahead of the player
    var fx = Math.sin(playerHeading), fz = Math.cos(playerHeading);
    var bx = player.x + fx * 45, bz = player.z + fz * 45;
    if (this.city.isBlocked(bx, bz, 3)) return;
    for (var i = -1; i <= 1; i += 2) {
      var px = bx + (-fz) * i * 4, pz = bz + fx * i * 4;
      var v = V.makeVehicle(POLICE_SPEC, px, pz, playerHeading + Math.PI / 2, 'roadblock', this.scene);
      this.scene.remove(v.group);
      v.group = buildPoliceCarMesh();
      v.group.position.set(px, 0, pz);
      v.group.rotation.y = playerHeading + Math.PI / 2;
      this.scene.add(v.group);
      v.unit = this.nextUnit();
      this.roadblocks.push(v);
    }
  };

  Police.prototype.clearRoadblocks = function () {
    for (var i = 0; i < this.roadblocks.length; i++) this.scene.remove(this.roadblocks[i].group);
    this.roadblocks = [];
  };

  // Returns 'busted' when an officer catches the player on foot, else null.
  Police.prototype.update = function (dt, player, playerCar) {
    var px = playerCar ? playerCar.x : player.x;
    var pz = playerCar ? playerCar.z : player.z;
    // decay: if no police can see the player, heat falls
    var anyNear = false;
    for (var i = 0; i < this.cars.length; i++) {
      var c = this.cars[i];
      var dx = c.x - px, dz = c.z - pz;
      if (dx * dx + dz * dz < 60 * 60) { anyNear = true; break; }
    }
    if (!anyNear && this.officers.length === 0 && this.stars > 0) {
      this.hiddenTimer += dt;
      if (this.hiddenTimer > C.WANTED_DECAY_SEC) {
        this.heat = Math.max(0, this.heat - 20);
        this.stars = Math.ceil(this.heat / 20);
        this.hiddenTimer = 0;
        this.clearRoadblocks();
      }
    } else {
      this.hiddenTimer = 0;
    }
    // desired force scales with stars
    var wantCars = this.stars >= 2 ? Math.min(this.stars, 4) : 0;
    var wantOfficers = this.stars === 1 ? 2 : (this.stars >= 4 ? 3 : 1);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 2.5;
      if (this.cars.length < wantCars) this.spawnCar(player);
      if (this.officers.length < wantOfficers) this.spawnOfficer(player);
      if (this.stars >= 4 && this.roadblocks.length === 0 && playerCar) {
        this.spawnRoadblock(player, playerCar.heading);
      }
    }
    // pursuit cars: steer toward the player, ram on contact
    for (var c2 = 0; c2 < this.cars.length; c2++) {
      var car = this.cars[c2];
      var dx2 = px - car.x, dz2 = pz - car.z;
      var d2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
      if (d2 < 0.5) d2 = 0.5;
      var wantHeading = Math.atan2(dx2 / d2, dz2 / d2);
      var dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      car.speed += ((d2 > 12 ? 30 : 22) - car.speed) * Math.min(1, dt * 1.2);
      var nx = car.x + Math.sin(car.heading) * car.speed * dt;
      var nz = car.z + Math.cos(car.heading) * car.speed * dt;
      if (!this.city.isBlocked(nx, nz, 1.6)) { car.x = nx; car.z = nz; }
      else { car.heading += Math.PI * 0.5; }
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.heading;
      // ram the player's car: a bump, not a kill. The old code multiplied
      // the player's speed by 0.55 EVERY frame while touching, which
      // zeroed the car in a tenth of a second. Now one bump per second.
      if (playerCar && d2 < 4) {
        car.ramCooldown = (car.ramCooldown || 0) - dt;
        if (car.ramCooldown <= 0) {
          playerCar.speed *= 0.55;
          car.ramCooldown = 1.0;
        }
      } else {
        car.ramCooldown = (car.ramCooldown || 0) - dt;
      }
      // run the player over on foot
      if (!playerCar && d2 < 2.2 && !player.dead) {
        player.hp -= 25 * dt;
      }
    }
    // officers on foot: chase and try to bust the player
    for (var o = 0; o < this.officers.length; o++) {
      var off = this.officers[o];
      var odx = player.x - off.x, odz = player.z - off.z;
      var od = Math.sqrt(odx * odx + odz * odz);
      if (od < 0.5) od = 0.5;
      off.heading = Math.atan2(odx / od, odz / od);
      off.mesh.rotation.y = off.heading;
      if (od > 2) {
        var ox = off.x + Math.sin(off.heading) * C.POLICE_FOOT_SPEED * dt;
        var oz = off.z + Math.cos(off.heading) * C.POLICE_FOOT_SPEED * dt;
        if (!this.city.isBlocked(ox, oz, 0.7)) { off.x = ox; off.z = oz; }
        off.mesh.position.set(off.x, 0, off.z);
      } else if (!playerCar && !player.dead) {
        return 'busted';
      }
    }
    // despawn the force when the heat is gone
    if (this.stars === 0) {
      for (var d3 = 0; d3 < this.cars.length; d3++) this.scene.remove(this.cars[d3].group);
      for (var d4 = 0; d4 < this.officers.length; d4++) this.scene.remove(this.officers[d4].mesh);
      this.cars = [];
      this.officers = [];
      this.clearRoadblocks();
    }
    return null;
  };

  window.SH_POLICE = { Police: Police };
})();
