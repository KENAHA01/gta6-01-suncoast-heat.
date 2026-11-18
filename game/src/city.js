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

  // Jitter a colour per channel (clamped). Never add a raw integer to a
  // hex colour: borrows across channels shift the hue (that is how
  // buildings turned purple/magenta). amt = max shift per channel.
  function jitterColor(base, amt) {
    var r = (base >> 16) & 255, g = (base >> 8) & 255, b = base & 255;
    r = Math.max(0, Math.min(255, r + R.randInt(-amt, amt)));
    g = Math.max(0, Math.min(255, g + R.randInt(-amt, amt)));
    b = Math.max(0, Math.min(255, b + R.randInt(-amt, amt)));
    return (r << 16) | (g << 8) | b;
  }

  function box(w, h, d, color, x, y, z, group) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  // Which side of a building faces the nearest street? Returns
  // {axis: 'x'|'z', dir: +1|-1} meaning the facade on that side.
  // roadsX holds z-values of east-west streets, roadsZ holds x-values
  // of north-south streets.
  function nearestRoadFace(x, z, roadsX, roadsZ) {
    var bestZ = null, bestDz = 1e9;
    for (var i = 0; i < roadsZ.length; i++) {
      var dz = Math.abs(x - roadsZ[i]);
      if (dz < bestDz) { bestDz = dz; bestZ = roadsZ[i]; }
    }
    var bestX = null, bestDx = 1e9;
    for (var j = 0; j < roadsX.length; j++) {
      var dx = Math.abs(z - roadsX[j]);
      if (dx < bestDx) { bestDx = dx; bestX = roadsX[j]; }
    }
    if (bestDz <= bestDx) return { axis: 'x', dir: bestZ >= x ? 1 : -1 };
    return { axis: 'z', dir: bestX >= z ? 1 : -1 };
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
    // Warm sand-grey so the city reads as a sun-soaked coastal town,
    // not a grey concrete slab.
    var landDepth = C.WATER_Y + half;
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(C.CITY_SIZE, landDepth),
      new THREE.MeshLambertMaterial({ color: 0x9a8a6e })
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
    var roadMat = mat(0x565660);
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

    // Sidewalks: a lighter warm strip under every road, wider than the
    // asphalt, so each street reads as road + curb + pavement.
    var walkMat = mat(0xb8a888);
    roadsX.forEach(function (z) {
      var s = new THREE.Mesh(new THREE.PlaneGeometry(C.CITY_SIZE, C.ROAD_WIDTH + 7), walkMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(0, 0.02, z);
      group.add(s);
    });
    roadsZ.forEach(function (x) {
      var s2 = new THREE.Mesh(new THREE.PlaneGeometry(C.ROAD_WIDTH + 7, C.CITY_SIZE), walkMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(x, 0.02, 0);
      group.add(s2);
    });

    // Crosswalks + traffic lights at the nine central intersections:
    // zebra stripes across the east-west road, and a pole with a
    // red/amber/green head on one corner.
    var crossMat = mat(0xe8e8d8);
    var tlPoleMat = mat(0x2a2a2a);
    var tlRed = new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x550000 });
    var tlAmber = new THREE.MeshLambertMaterial({ color: 0xcc9922, emissive: 0x443300 });
    var tlGreen = new THREE.MeshLambertMaterial({ color: 0x22aa44, emissive: 0x003311 });
    [-104, 0, 104].forEach(function (ix) {
      [-104, 0, 104].forEach(function (iz) {
        for (var cs = 0; cs < 5; cs++) {
          var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 12), crossMat);
          stripe.position.set(ix - 8 + cs * 2.2, 0.07, iz);
          group.add(stripe);
        }
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 4.6, 6), tlPoleMat);
        pole.position.set(ix + 9, 2.3, iz + 9);
        group.add(pole);
        var head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.5), tlPoleMat);
        head.position.set(ix + 9, 5.1, iz + 9);
        group.add(head);
        [[tlRed, 5.6], [tlAmber, 5.1], [tlGreen, 4.6]].forEach(function (lamp) {
          var bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.1), lamp[0]);
          bulb.position.set(ix + 9, lamp[1], iz + 8.7);
          group.add(bulb);
        });
      });
    });

    // Red hydrants along the main roads.
    var hydMat = mat(0xaa2222);
    for (var hy = 0; hy < 8; hy++) {
      var hx = -156 + hy * 44, hz = -52 + (hy % 2) * 104;
      var hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8), hydMat);
      hyd.position.set(hx, 0.45, hz + 8);
      group.add(hyd);
      var hydTop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), hydMat);
      hydTop.position.set(hx, 0.95, hz + 8);
      group.add(hydTop);
    }

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

    // Benches in the parks (parkBlocks is defined just above).
    var benchMat = mat(0x6a4a2a);
    parkBlocks.forEach(function (p) {
      var bcx = p.bx * step + step / 2, bcz = p.bz * step + step / 2;
      for (var bi = 0; bi < 2; bi++) {
        var bx2 = bcx + (bi === 0 ? -8 : 8), bz2 = bcz + 6;
        var seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.7), benchMat);
        seat.position.set(bx2, 0.5, bz2);
        group.add(seat);
        var back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.12), benchMat);
        back.position.set(bx2, 0.95, bz2 + 0.32);
        group.add(back);
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
          // jitter the colour a little, per channel (see jitterColor)
          var col = jitterColor(base, 14);
          var mesh = box(w, h, d, col, x, h / 2, z, group);
          mesh.castShadow = true;
          // window bands: one dark stripe per floor, wrapped around the
          // building. A flat slab with no windows reads as a 2D shape;
          // the bands make every facade read as a real building.
          var winMat = mat(C.WINDOW_COLOR);
          var floors = Math.max(1, Math.round(h / 5));
          for (var f = 0; f < floors; f++) {
            var wy = 2.4 + f * 5;
            if (wy > h - 1) break;
            var band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.9, d + 0.15), winMat);
            band.position.set(x, wy, z);
            group.add(band);
          }
          // setback top: tall buildings step in at the roof, so the
          // skyline has real depth instead of flat-topped slabs.
          if (h >= 18) {
            var sw = w * 0.62, sd = d * 0.62, sh = h * 0.22;
            var set = box(sw, sh, sd, jitterColor(base, 22), x, h + sh / 2, z, group);
            set.castShadow = true;
            var setBand = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.15, 0.8, sd + 0.15), winMat);
            setBand.position.set(x, h + sh / 2, z);
            group.add(setBand);
          }
          // parapet accent: a warm rim at the roofline on some buildings.
          if (R.chance(0.25)) {
            box(w + 0.3, 0.6, d + 0.3, 0xe8d8b0, x, h - 0.3, z, group);
          }
          // storefronts: ground-floor awning + sign strip on the side
          // facing the nearest street, so the base of each building
          // reads as shops instead of a blank wall.
          var face = nearestRoadFace(x, z, roadsX, roadsZ);
          if (R.chance(0.3)) {
            var awnCol = [0xc94a3a, 0x2a7a6a, 0xe8b400, 0x3a6ac9][R.randInt(0, 3)];
            if (face.axis === 'x') {
              var sx = x + face.dir * (w / 2 + 0.6);
              box(1.2, 0.25, w * 0.7, 0x3a3a3a, sx, 2.2, z, group);
              box(0.4, 0.9, w * 0.7, awnCol, x + face.dir * (w / 2 + 0.15), 3.6, z, group);
            } else {
              var sz = z + face.dir * (d / 2 + 0.6);
              box(d * 0.7, 0.25, 1.2, 0x3a3a3a, x, 2.2, sz, group);
              box(d * 0.7, 0.9, 0.4, awnCol, x, 3.6, z + face.dir * (d / 2 + 0.15), group);
            }
          }
          // lit windows: a few warm glowing windows on the street face,
          // so facades feel inhabited at dusk and night.
          if (R.chance(0.5)) {
            var litMat = new THREE.MeshLambertMaterial({ color: 0xffe0a0, emissive: 0x775522 });
            for (var lw = 0; lw < 3; lw++) {
              var ly = 2.4 + R.randInt(0, Math.max(0, floors - 1)) * 5;
              var lo = R.randRange(-w * 0.25, w * 0.25);
              var win;
              if (face.axis === 'x') {
                win = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 1.6), litMat);
                win.position.set(x + face.dir * (w / 2 + 0.1), ly, z + lo);
              } else {
                win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.15), litMat);
                win.position.set(x + lo, ly, z + face.dir * (d / 2 + 0.1));
              }
              group.add(win);
            }
          }
          // rooftop box (AC unit / parapet) for silhouette variety
          if (R.chance(0.6)) box(w * 0.3, 1.2, d * 0.3, 0x8a8a7a, x + R.randRange(-3, 3), h + 0.6, z + R.randRange(-3, 3), group);
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

    // Street lamps along the two main north-south roads: thin poles with
    // a warm head. They mark the road edges and show vertical scale.
    var poleMat = mat(0x3a3a3a);
    var lampMat = new THREE.MeshLambertMaterial({ color: 0xffeebb, emissive: 0x665500 });
    [-52, 52].forEach(function (lx) {
      for (var lz = -208; lz <= 156; lz += 52) {
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.5, 6), poleMat);
        pole.position.set(lx + (lx < 0 ? 8 : -8), 2.75, lz);
        group.add(pole);
        var head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.5), lampMat);
        head.position.set(lx + (lx < 0 ? 7.4 : -7.4), 5.5, lz);
        group.add(head);
      }
    });

    // Palm trees along the beach strip: tall thin trunk + wide crown.
    // Palms are the quickest "this is a 3D coastal city" read.
    var palmTrunk = mat(0x7a5a3a);
    var palmTop = mat(0x3a7a3a);
    for (var px = -234; px <= 234; px += 26) {
      if (Math.abs(px) < 16) continue; // keep the bridge mouth clear
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 6, 6), palmTrunk);
      trunk.position.set(px, 3, C.WATER_Y - 8);
      group.add(trunk);
      var crown = new THREE.Mesh(new THREE.SphereGeometry(1.9, 7, 5), palmTop);
      crown.scale.y = 0.55;
      crown.position.set(px, 6.4, C.WATER_Y - 8);
      group.add(crown);
      trees.push({ x: px, z: C.WATER_Y - 8 });
    }

    // Palm-lined boulevard: 26 palms down both sidewalks of the main
    // strip (x = 0, the road the chase shot drives up), so the strip
    // reads as a resort avenue from the chase camera.
    for (var bp = 0; bp < 13; bp++) {
      var bz = -156 + bp * 26;
      [-9.5, 9.5].forEach(function (bx) {
        var btrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 5.5, 6), palmTrunk);
        btrunk.position.set(bx, 2.75, bz);
        group.add(btrunk);
        var bcrown = new THREE.Mesh(new THREE.SphereGeometry(1.7, 7, 5), palmTop);
        bcrown.scale.y = 0.5;
        bcrown.position.set(bx, 5.9, bz);
        group.add(bcrown);
        trees.push({ x: bx, z: bz });
      });
    }

    // Neon billboards: big glowing signs with our own Solmarina names,
    // canvas-drawn text on unlit material so they glow at night and
    // read as landmarks in the chase and mission shots.
    function neonSign(lines, accent, w, h, x, y, z, rotY) {
      var sc = document.createElement('canvas');
      sc.width = 512; sc.height = 192;
      var sx = sc.getContext('2d');
      sx.fillStyle = '#101018';
      sx.fillRect(0, 0, 512, 192);
      sx.strokeStyle = accent;
      sx.lineWidth = 6;
      sx.strokeRect(8, 8, 496, 176);
      sx.fillStyle = accent;
      sx.textAlign = 'center';
      sx.font = 'bold 64px Arial';
      sx.fillText(lines[0], 256, 84);
      sx.font = 'bold 34px Arial';
      sx.fillStyle = '#ffffff';
      sx.fillText(lines[1], 256, 148);
      var tex = new THREE.CanvasTexture(sc);
      var face = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      face.position.set(x, y, z);
      face.rotation.y = rotY;
      group.add(face);
      var frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, h + 0.6, 0.4), mat(0x1a1a22));
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;
      frame.position.x -= Math.sin(rotY) * 0.3;
      frame.position.z -= Math.cos(rotY) * 0.3;
      group.add(frame);
      // support posts down to the street, so the sign reads as a
      // freestanding pylon, not a floating plane.
      var postMat = mat(0x2a2a2a);
      [-w / 2 + 1, w / 2 - 1].forEach(function (off) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, y - h / 2, 6), postMat);
        if (Math.abs(Math.sin(rotY)) > 0.5) post.position.set(x, (y - h / 2) / 2, z + off);
        else post.position.set(x + off, (y - h / 2) / 2, z);
        group.add(post);
      });
    }
    // along the strip, facing the road so the chase camera sees them.
    // The hotel sign sits at the north end (z = -130), clear of the
    // night mission shot at the marina end of the strip.
    neonSign(['SOLMARINA FM', '88.1 - NEON DRIVE'], '#ff5aa0', 16, 6, -14, 9, -30, Math.PI / 2);
    neonSign(['CLUB PALMETTO', 'DANCE ALL NIGHT'], '#3ad0ff', 16, 6, 14, 9, 30, -Math.PI / 2);
    neonSign(['MARINA BAY HOTEL', 'ROOMS - POOL - BAR'], '#ffd23e', 16, 6, -14, 9, -130, Math.PI / 2);

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
