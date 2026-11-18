// Solmarina Heat - city.js
// Procedural 3D city from the fixed seed. Builds THREE meshes into the scene and
// returns collision data (building AABBs), road lines for traffic, and spawn points.
(function () {
  'use strict';
  var C = window.SH_CONFIG;
  var R = window.SH_RANDOM;

  // Shared materials (one per colour keeps draw programs low)
  var matCache = {};
  function mat(color) {
    if (!matCache[color]) matCache[color] = new THREE.MeshLambertMaterial({ color: color });
    return matCache[color];
  }

  function box(w, h, d, color, x, y, z, group) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  function buildCity(scene) {
    var group = new THREE.Group();
    group.name = 'city';
    scene.add(group);

    var buildings = [];   // {minX,maxX,minZ,maxZ,h}
    var trees = [];
    var roadsX = [];      // street centre lines along x
    var roadsZ = [];

    var half = C.CITY_SIZE / 2;
    var step = C.BLOCK;

    // Ground: land plane only (z from -half to WATER_Y); the bay is water.
    var landDepth = C.WATER_Y + half;
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(C.CITY_SIZE, landDepth),
      new THREE.MeshLambertMaterial({ color: 0x5a5a52 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, (-half + C.WATER_Y) / 2);
    ground.receiveShadow = true;
    group.add(ground);

    // Street centre lines (grid every BLOCK, skipping the water band)
    var i, v;
    for (v = -half + step; v < half; v += step) {
      if (v < C.WATER_Y + 40) roadsX.push(v);
      if (v < C.WATER_Y + 40) roadsZ.push(v);
    }

    // Roads: dark strips along every street line
    var roadMat = mat(0x2a2a2e);
    roadsX.forEach(function (z) {
      var r = new THREE.Mesh(new THREE.PlaneGeometry(C.CITY_SIZE, C.ROAD_WIDTH), roadMat);
      r.rotation.x = -Math.PI / 2;
      r.position.set(0, 0.04, z);
      group.add(r);
    });
    roadsZ.forEach(function (x) {
      var r = new THREE.Mesh(new THREE.PlaneGeometry(C.ROAD_WIDTH, C.CITY_SIZE), roadMat);
      r.rotation.x = -Math.PI / 2;
      r.position.set(x, 0.04, 0);
      group.add(r);
    });

    // Road centre dashes (small white boxes, cheap and readable)
    var dashMat = mat(0xd8d8c8);
    roadsX.forEach(function (z) {
      for (var x = -half + 10; x < half; x += 18) {
        if (Math.abs(x - C.BRIDGE_X) < 14 && z > C.WATER_Y) continue;
        var d = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 0.6), dashMat);
        d.position.set(x, 0.06, z);
        group.add(d);
      }
    });

    // Parks: two blocks with green ground + trees (same step/2 offset)
    var parkBlocks = [{ bx: -2, bz: 1 }, { bx: 2, bz: -1 }];
    parkBlocks.forEach(function (p) {
      var cx = p.bx * step + step / 2, cz = p.bz * step + step / 2;
      var lawn = new THREE.Mesh(
        new THREE.PlaneGeometry(step - C.ROAD_WIDTH - 4, step - C.ROAD_WIDTH - 4),
        new THREE.MeshLambertMaterial({ color: 0x4a7a3a })
      );
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(cx, 0.05, cz);
      group.add(lawn);
      for (var t = 0; t < 8; t++) {
        var tx = cx + R.randRange(-16, 16), tz = cz + R.randRange(-16, 16);
        var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.4, 6), mat(0x6a4a2a));
        trunk.position.set(tx, 1.2, tz);
        group.add(trunk);
        var top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.5, 7), mat(0x2a6a2a));
        top.position.set(tx, 4.2, tz);
        group.add(top);
        trees.push({ x: tx, z: tz });
      }
    });

    // Buildings: one or two boxes per block. Block centres sit HALFWAY
    // between road lines (step/2 offset), so buildings never overlap roads.
    var blockHalf = (step - C.ROAD_WIDTH) / 2 - 2;
    for (var bx = -5; bx <= 4; bx++) {
      for (var bz = -5; bz <= 4; bz++) {
        var cx = bx * step + step / 2, cz = bz * step + step / 2;
        if (cz > C.WATER_Y) continue;              // water band, no buildings
        var isPark = parkBlocks.some(function (p) { return p.bx === bx && p.bz === bz; });
        if (isPark) continue;
        // district palette by quadrant
        var dist = C.DISTRICTS[0];
        if (cx >= 0 && cz >= 0) dist = C.DISTRICTS[3];
        else if (cx < 0 && cz >= 0) dist = C.DISTRICTS[2];
        else if (cx >= 0 && cz < 0) dist = C.DISTRICTS[1];
        var base = dist.color;
        var n = R.chance(0.55) ? 2 : 1;
        for (var b = 0; b < n; b++) {
          var w = R.randRange(10, 18), d = R.randRange(10, 18);
          var h = R.randRange(6, 26) * (dist === C.DISTRICTS[1] ? 1.4 : 1);
          var ox = n === 2 ? (b === 0 ? -9 : 9) : 0;
          var oz = n === 2 ? (b === 0 ? -9 : 9) : 0;
          var x = cx + ox, z = cz + oz;
          // jitter the colour a little
          var col = base + R.randInt(-0x0a0a0a, 0x0a0a0a);
          var mesh = box(w, h, d, col, x, h / 2, z, group);
          mesh.castShadow = true;
          // rooftop box (AC unit / parapet) for silhouette variety
          if (R.chance(0.6)) box(w * 0.3, 1.2, d * 0.3, 0x888888, x + R.randRange(-3, 3), h + 0.6, z + R.randRange(-3, 3), group);
          buildings.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h: h });
        }
      }
    }

    // Water: south bay (z beyond WATER_Y), blue plane slightly below ground
    var water = new THREE.Mesh(
      new THREE.PlaneGeometry(C.CITY_SIZE, half - C.WATER_Y),
      new THREE.MeshLambertMaterial({ color: 0x1a5a7a })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.4, (C.WATER_Y + half) / 2);
    group.add(water);

    // Beach strip along the bay edge
    var beach = new THREE.Mesh(
      new THREE.PlaneGeometry(C.CITY_SIZE, 16),
      new THREE.MeshLambertMaterial({ color: 0xd8c89a })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, 0.03, C.WATER_Y - 8);
    group.add(beach);

    // Bridge over the bay at x = 0 (a long flat box + rails)
    var bridge = box(C.BRIDGE_WIDTH, 1.2, half - C.WATER_Y + 16, 0x8a8a8a, C.BRIDGE_X, 0.6, (C.WATER_Y + half) / 2, group);
    bridge.receiveShadow = true;
    box(1, 1.2, half - C.WATER_Y + 16, 0xb8b8b8, C.BRIDGE_X - C.BRIDGE_WIDTH / 2, 1.6, (C.WATER_Y + half) / 2, group);
    box(1, 1.2, half - C.WATER_Y + 16, 0xb8b8b8, C.BRIDGE_X + C.BRIDGE_WIDTH / 2, 1.6, (C.WATER_Y + half) / 2, group);

    // Collision helpers
    function isBlocked(x, z, radius) {
      // water (except on the bridge)
      if (z > C.WATER_Y + 2) {
        if (Math.abs(x - C.BRIDGE_X) > C.BRIDGE_WIDTH / 2 - radius) return true;
      }
      // city bounds
      if (Math.abs(x) > half - 2 || Math.abs(z) > half - 2) return true;
      for (var k = 0; k < buildings.length; k++) {
        var b = buildings[k];
        if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) return true;
      }
      return false;
    }
    function onRoad(x, z) {
      for (var k = 0; k < roadsX.length; k++) {
        if (Math.abs(z - roadsX[k]) < C.ROAD_WIDTH / 2) return true;
      }
      for (var k2 = 0; k2 < roadsZ.length; k2++) {
        if (Math.abs(x - roadsZ[k2]) < C.ROAD_WIDTH / 2) return true;
      }
      return false;
    }

    return {
      group: group, buildings: buildings, trees: trees,
      roadsX: roadsX, roadsZ: roadsZ,
      isBlocked: isBlocked, onRoad: onRoad,
      spawn: { x: 0, z: -40 }
    };
  }

  window.SH_CITY = { buildCity: buildCity };
})();
