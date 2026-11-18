// Solmarina Heat - combat.js
// Weapons, hitscan shooting with tracers, armed enemies who shoot back.
(function () {
  'use strict';
  var C = window.SH_CONFIG;
  var R = window.SH_RANDOM;

  var ENEMY_SHIRTS = [0x5a2a2a, 0x2a2a5a, 0x3a3a3a];

  function buildEnemyMesh(rng) {
    var g = new THREE.Group();
    var shirt = new THREE.MeshLambertMaterial({ color: ENEMY_SHIRTS[Math.floor(rng() * ENEMY_SHIRTS.length)] });
    var skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
    var pants = new THREE.MeshLambertMaterial({ color: 0x222222 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.38), shirt);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
    head.position.y = 1.66;
    g.add(head);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.26), pants);
    legL.position.set(-0.16, 0.32, 0);
    g.add(legL);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.26), pants);
    legR.position.set(0.16, 0.32, 0);
    g.add(legR);
    // gun in hand
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.55), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.35, 1.15, 0.3);
    g.add(gun);
    // red bandana marker so the player can tell enemies apart
    var band = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), new THREE.MeshLambertMaterial({ color: 0xc92a2a }));
    band.position.y = 1.82;
    g.add(band);
    return g;
  }

  function Combat(scene, city) {
    this.scene = scene;
    this.city = city;
    this.weaponIdx = 0;
    this.ammo = C.WEAPONS.map(function (w) { return w.mag; });
    this.reserve = [48, 18, 120, 60];
    this.cooldown = 0;
    this.reloading = 0;
    this.enemies = [];
    this.tracers = [];
    this.rng = R.stream(C.SEED + 201);
    this.enemyBullets = [];
  }

  Combat.prototype.weapon = function () { return C.WEAPONS[this.weaponIdx]; };

  Combat.prototype.switchWeapon = function (idx) {
    if (idx >= 0 && idx < C.WEAPONS.length) { this.weaponIdx = idx; this.reloading = 0; }
  };

  Combat.prototype.startReload = function () {
    var w = this.weapon();
    if (this.reloading > 0 || this.ammo[this.weaponIdx] === w.mag || this.reserve[this.weaponIdx] <= 0) return;
    this.reloading = 1.1;
  };

  Combat.prototype.spawnEnemy = function (x, z) {
    var mesh = buildEnemyMesh(this.rng);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    var e = { mesh: mesh, x: x, z: z, hp: 100, cooldown: R.randRange(0.5, 1.5), heading: 0, speed: 3.2 };
    this.enemies.push(e);
    return e;
  };

  Combat.prototype.spawnEnemyNear = function (player, minD, maxD) {
    for (var tries = 0; tries < 12; tries++) {
      var a = this.rng() * Math.PI * 2;
      var d = R.randRange(minD, maxD);
      var x = player.x + Math.sin(a) * d, z = player.z + Math.cos(a) * d;
      if (!this.city.isBlocked(x, z, 1) && Math.abs(x) < 240 && Math.abs(z) < 240 && z < C.WATER_Y - 4) {
        return this.spawnEnemy(x, z);
      }
    }
    return null;
  };

  // Hitscan shot from the camera through the crosshair. Returns what was hit.
  Combat.prototype.shoot = function (origin, dir, player) {
    var w = this.weapon();
    if (this.cooldown > 0 || this.reloading > 0) return null;
    if (this.ammo[this.weaponIdx] <= 0) { this.startReload(); return null; }
    this.ammo[this.weaponIdx]--;
    this.cooldown = 1 / w.rate;
    var pellets = w.pellets || 1;
    var hit = null;
    for (var p = 0; p < pellets; p++) {
      var spread = w.spread;
      var d = new THREE.Vector3(
        dir.x + (this.rng() - 0.5) * spread * 2,
        dir.y + (this.rng() - 0.5) * spread * 2,
        dir.z + (this.rng() - 0.5) * spread * 2
      ).normalize();
      // nearest enemy within range and roughly along the ray
      var best = null, bestT = w.range;
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        var ex = e.x - origin.x, ey = 1.2 - origin.y, ez = e.z - origin.z;
        var t = ex * d.x + ey * d.y + ez * d.z;
        if (t < 0 || t > bestT) continue;
        var px = origin.x + d.x * t, py = origin.y + d.y * t, pz = origin.z + d.z * t;
        var dist = Math.sqrt((px - e.x) * (px - e.x) + (py - 1.2) * (py - 1.2) + (pz - e.z) * (pz - e.z));
        if (dist < 1.1) { best = e; bestT = t; }
      }
      if (best) {
        best.hp -= w.dmg;
        hit = best;
        if (best.hp <= 0) {
          this.scene.remove(best.mesh);
          this.enemies.splice(this.enemies.indexOf(best), 1);
          player.money += 60;
          this.reserve[this.weaponIdx] += 6;
        }
      }
      // tracer line
      var end = new THREE.Vector3(origin.x + d.x * bestT, origin.y + d.y * bestT, origin.z + d.z * bestT);
      var geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), end]);
      var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffeebb }));
      line.userData.life = 0.06;
      this.scene.add(line);
      this.tracers.push(line);
    }
    return hit;
  };

  Combat.prototype.update = function (dt, player, onPlayerHit) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        var w = this.weapon();
        var need = w.mag - this.ammo[this.weaponIdx];
        var take = Math.min(need, this.reserve[this.weaponIdx]);
        this.ammo[this.weaponIdx] += take;
        this.reserve[this.weaponIdx] -= take;
      }
    }
    // tracers fade
    for (var i = this.tracers.length - 1; i >= 0; i--) {
      var t = this.tracers[i];
      t.userData.life -= dt;
      if (t.userData.life <= 0) { this.scene.remove(t); this.tracers.splice(i, 1); }
    }
    // enemies: walk toward the player and shoot when close
    for (var e = 0; e < this.enemies.length; e++) {
      var en = this.enemies[e];
      var dx = player.x - en.x, dz = player.z - en.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      en.heading = Math.atan2(dx, dz);
      en.mesh.rotation.y = en.heading;
      if (d > 18) {
        en.x += Math.sin(en.heading) * en.speed * dt;
        en.z += Math.cos(en.heading) * en.speed * dt;
        if (!this.city.isBlocked(en.x, en.z, 0.7)) {
          en.mesh.position.set(en.x, 0, en.z);
        } else {
          en.x -= Math.sin(en.heading) * en.speed * dt;
          en.z -= Math.cos(en.heading) * en.speed * dt;
        }
      }
      en.cooldown -= dt;
      if (d < 42 && en.cooldown <= 0 && !player.dead) {
        en.cooldown = R.randRange(0.9, 1.6);
        // enemy fires: 35% hit chance at close range, less far away
        var hitChance = d < 15 ? 0.4 : 0.2;
        if (this.rng() < hitChance) onPlayerHit(9);
        var o = new THREE.Vector3(en.x, 1.3, en.z);
        var dir = new THREE.Vector3(player.x - en.x, 1.1 - 1.3, player.z - en.z).normalize();
        var end = new THREE.Vector3(player.x, 1.1, player.z);
        var geo = new THREE.BufferGeometry().setFromPoints([o, end]);
        var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff6666 }));
        line.userData.life = 0.08;
        this.scene.add(line);
        this.tracers.push(line);
      }
    }
  };

  window.SH_COMBAT = { Combat: Combat };
})();
