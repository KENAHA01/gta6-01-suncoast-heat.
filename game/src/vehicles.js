// Solmarina Heat - vehicles.js
// Box-built 3D cars: 5 types, arcade driving physics, enter/exit, stealing.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  var matCache = {};
  function mat(color) {
    if (!matCache[color]) matCache[color] = new THREE.MeshLambertMaterial({ color: color });
    return matCache[color];
  }
  var glassMat = new THREE.MeshLambertMaterial({ color: 0x2e4a62 });
  var darkMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
  var tireMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Build a car mesh group from a vehicle type spec. Returns {group, len, wid}.
  // Each type has a distinct silhouette so it reads as that car, not a box:
  // GT low and long with a spoiler, van tall with a full-length cabin,
  // pickup with an open bed, sedan/cab with a set-back glass cabin.
  function buildCarMesh(spec) {
    var g = new THREE.Group();
    var L = spec.len, W = spec.wid;
    var isGT = spec.name === 'Palmetto GT';
    var isVan = spec.name === 'Brisas Van';
    var isPickup = spec.name === 'Cannery Pickup';
    var bodyH = isGT ? 0.6 : (isVan ? 1.05 : 0.75);
    var bodyY = isGT ? 0.5 : 0.55;
    var body = new THREE.Mesh(new THREE.BoxGeometry(W, bodyH, L), mat(spec.color));
    body.position.y = bodyY;
    body.castShadow = true;
    g.add(body);
    // cabin: glass box, shape varies by type
    var cabW = W * 0.82, cabH = isVan ? 0.75 : (isGT ? 0.5 : 0.65);
    var cabL = isVan ? L * 0.82 : (isPickup ? L * 0.34 : L * 0.45);
    var cabZ = isVan ? 0 : (isPickup ? L * 0.2 : -L * 0.06);
    var cabY = bodyY + bodyH / 2 + cabH / 2 - 0.05;
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, cabL), glassMat);
    cabin.position.set(0, cabY, cabZ);
    cabin.castShadow = true;
    g.add(cabin);
    // pickup bed: low side walls + tailgate behind the cabin
    if (isPickup) {
      var bedZ = -L * 0.24, bedL = L * 0.42;
      var wallMat = mat(spec.color);
      [[-W / 2 + 0.08, 0], [W / 2 - 0.08, 0]].forEach(function (p) {
        var wall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, bedL), wallMat);
        wall.position.set(p[0], 1.0, bedZ);
        g.add(wall);
      });
      var tail = new THREE.Mesh(new THREE.BoxGeometry(W, 0.55, 0.14), wallMat);
      tail.position.set(0, 1.0, -L / 2 + 0.07);
      g.add(tail);
      var bedFloor = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.1, bedL), darkMat);
      bedFloor.position.set(0, 0.95, bedZ);
      g.add(bedFloor);
    }
    // hood hint (skip on the van, whose cabin covers the front)
    if (!isVan) {
      var hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.16, L * 0.2), mat(spec.color));
      hood.position.set(0, bodyY + bodyH / 2 + 0.02, L * 0.36);
      g.add(hood);
    }
    // GT spoiler on the trunk
    if (isGT) {
      var spoiler = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.08, 0.3), darkMat);
      spoiler.position.set(0, 1.0, -L / 2 + 0.15);
      g.add(spoiler);
      [[-W / 2 + 0.2, -L / 2 + 0.15], [W / 2 - 0.2, -L / 2 + 0.15]].forEach(function (p) {
        var strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), darkMat);
        strut.position.set(p[0], 0.88, p[1]);
        g.add(strut);
      });
    }
    // bumpers front + rear
    [[L / 2 + 0.02, 0], [-L / 2 - 0.02, 0]].forEach(function (p) {
      var bump = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.2, 0.22), darkMat);
      bump.position.set(0, 0.32, p[0]);
      g.add(bump);
    });
    // headlights / taillights
    var hl = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x554400 });
    [[-W / 2 + 0.25, L / 2], [W / 2 - 0.25, L / 2]].forEach(function (p) {
      var l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), hl);
      l.position.set(p[0], 0.62, p[1]);
      g.add(l);
    });
    var tl = new THREE.MeshLambertMaterial({ color: 0xaa2222, emissive: 0x440000 });
    [[-W / 2 + 0.25, -L / 2], [W / 2 - 0.25, -L / 2]].forEach(function (p) {
      var l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), tl);
      l.position.set(p[0], 0.62, p[1]);
      g.add(l);
    });
    // wheels with hubcaps, visible from the side and rear
    var wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    var hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 8);
    var hubMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    [[-W / 2 - 0.05, L * 0.32], [W / 2 + 0.05, L * 0.32], [-W / 2 - 0.05, -L * 0.32], [W / 2 + 0.05, -L * 0.32]].forEach(function (p) {
      var w = new THREE.Mesh(wheelGeo, tireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(p[0], 0.42, p[1]);
      g.add(w);
      var hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(p[0], 0.42, p[1]);
      g.add(hub);
    });
    // taxi sign for the cab
    if (spec.name === 'Bay Cab') {
      var sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.4), new THREE.MeshLambertMaterial({ color: 0xffeebb, emissive: 0x665500 }));
      sign.position.set(0, 1.7, -L * 0.06);
      g.add(sign);
      // checkered side stripe
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, L * 0.7), darkMat);
      stripe.position.set(W / 2 + 0.02, 0.7, 0);
      g.add(stripe);
      var stripe2 = stripe.clone();
      stripe2.position.x = -W / 2 - 0.02;
      g.add(stripe2);
    }
    return g;
  }

  // A vehicle instance: {spec, group, x, z, heading, speed, kind: 'player'|'traffic'|'parked'}
  function makeVehicle(spec, x, z, heading, kind, scene) {
    var v = {
      spec: spec, x: x, z: z, heading: heading || 0, speed: 0,
      steer: 0, kind: kind || 'parked', group: buildCarMesh(spec)
    };
    v.group.position.set(x, 0, z);
    v.group.rotation.y = v.heading;
    scene.add(v.group);
    return v;
  }

  // Arcade driving: forward = W, brake/reverse = S, steer = A/D.
  // dt seconds, input {fwd, back, left, right}. Returns nothing, mutates v.
  function drive(v, input, dt) {
    var s = v.spec;
    if (input.fwd) v.speed += s.accel * dt;
    else if (input.back) v.speed -= s.brake * 0.7 * dt;
    else {
      // drag
      v.speed -= v.speed * 1.4 * dt;
      if (Math.abs(v.speed) < 0.3) v.speed = 0;
    }
    if (input.back && v.speed > 0.5) v.speed -= s.brake * dt; // brake while moving
    if (v.speed > s.top) v.speed = s.top;
    if (v.speed < -s.top * 0.35) v.speed = -s.top * 0.35;
    // steering scales with speed, grip kills lateral slide
    var steerTarget = 0;
    if (input.left) steerTarget = 1;
    if (input.right) steerTarget = -1;
    v.steer += (steerTarget - v.steer) * Math.min(1, dt * 8);
    var turnRate = s.turn * v.steer * Math.min(1, Math.abs(v.speed) / 8);
    if (v.speed < 0) turnRate = -turnRate;
    v.heading += turnRate * dt * (v.speed >= 0 ? 1 : -1);
    // drift: hard steering at speed keeps a little slide
    var drift = 0;
    if (Math.abs(v.steer) > 0.85 && Math.abs(v.speed) > s.top * 0.55) drift = v.steer * 0.12;
    var hx = Math.sin(v.heading), hz = Math.cos(v.heading);
    var px = -hz, pz = hx; // perpendicular
    v.x += (hx * v.speed + px * drift * Math.abs(v.speed)) * dt;
    v.z += (hz * v.speed + pz * drift * Math.abs(v.speed)) * dt;
    v.group.position.set(v.x, 0, v.z);
    v.group.rotation.y = v.heading;
  }

  // Simple car-car blocking: push two overlapping cars apart.
  function separateCars(cars) {
    for (var i = 0; i < cars.length; i++) {
      for (var j = i + 1; j < cars.length; j++) {
        var a = cars[i], b = cars[j];
        var dx = b.x - a.x, dz = b.z - a.z;
        var d2 = dx * dx + dz * dz;
        var min = 3.4;
        if (d2 < min * min && d2 > 0.001) {
          var d = Math.sqrt(d2);
          var push = (min - d) / 2;
          var nx = dx / d, nz = dz / d;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
          if (a.kind !== 'traffic') a.speed *= 0.6;
          if (b.kind !== 'traffic') b.speed *= 0.6;
          a.group.position.set(a.x, 0, a.z);
          b.group.position.set(b.x, 0, b.z);
        }
      }
    }
  }

  window.SH_VEHICLES = {
    buildCarMesh: buildCarMesh, makeVehicle: makeVehicle,
    drive: drive, separateCars: separateCars
  };
})();
