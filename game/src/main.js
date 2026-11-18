// Solmarina Heat - main.js
// Game loop (fixed-step 60 Hz), third-person player, states, and all glue.
(function () {
  'use strict';
  var C = window.SH_CONFIG;
  var IN = window.SH_INPUT;
  var RND = window.SH_RANDOM;

  var canvas, renderer, scene, lights, city, hud;
  var game = null;

  // Player figure: simple readable person (shirt, head, cap, arms, legs).
  function buildPlayerMesh() {
    var g = new THREE.Group();
    var shirt = new THREE.MeshLambertMaterial({ color: 0x2a6ac9 });
    var skin = new THREE.MeshLambertMaterial({ color: 0xe8b890 });
    var pants = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.38), shirt);
    body.position.y = 1.05; body.castShadow = true;
    g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
    head.position.y = 1.66; head.castShadow = true;
    g.add(head);
    // red cap so the hero reads at a glance, even from behind
    var cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.48), new THREE.MeshLambertMaterial({ color: 0xc92a2a }));
    cap.position.y = 1.92;
    g.add(cap);
    var brim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.2), new THREE.MeshLambertMaterial({ color: 0xc92a2a }));
    brim.position.set(0, 1.88, 0.3);
    g.add(brim);
    // arms pivot at the shoulder: geometry translated down so the
    // rotation point sits at the shoulder, not the arm's middle.
    var armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.22);
    armGeo.translate(0, -0.35, 0);
    var armL = new THREE.Mesh(armGeo, shirt);
    armL.position.set(-0.42, 1.4, 0);
    armL.castShadow = true;
    g.add(armL);
    var armR = new THREE.Mesh(armGeo, shirt);
    armR.position.set(0.42, 1.4, 0);
    armR.castShadow = true;
    g.add(armR);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.26), pants);
    legL.position.set(-0.16, 0.32, 0);
    g.add(legL);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.26), pants);
    legR.position.set(0.16, 0.32, 0);
    g.add(legR);
    g.userData.legs = [legL, legR];
    g.userData.arms = [armL, armR];
    return g;
  }

  function newGame() {
    return {
      state: 'title',           // title | playing | paused | wasted | busted | complete
      minutes: C.DAY_START_MIN,
      yaw: 0, pitch: 0.12,      // camera orbit
      player: {
        x: 0, z: -40, heading: 0, hp: C.PLAYER_HEALTH,
        money: 0, mesh: buildPlayerMesh(), dead: false, walkPhase: 0
      },
      playerCar: null,
      prompt: '',
      saveFlash: 0,
      endTimer: 0,
      mapOpen: false,           // city map overlay open (paused)
      shot: null                // staged scene name from ?shot=
    };
  }

  // City map overlay: opens on top of the paused game.
  function openMap() {
    game.mapOpen = true;
    game.state = 'paused';
    window.SH_HUD.hideCenter(hud);
    hud.map.style.display = 'block';
    window.SH_MAP.draw(hud, game);
  }
  function closeMap() {
    game.mapOpen = false;
    game.state = 'playing';
    hud.map.style.display = 'none';
  }

  function init() {
    canvas = document.getElementById('game');
    renderer = window.SH_RENDER.createRenderer(canvas);
    scene = window.SH_RENDER.createScene();
    lights = window.SH_RENDER.createLights(scene);
    city = window.SH_CITY.buildCity(scene);
    hud = window.SH_HUD.buildHUD();
    IN.init(canvas);

    game = newGame();
    game.city = city;
    game.combat = new window.SH_COMBAT.Combat(scene, city);
    game.police = new window.SH_POLICE.Police(scene, city);
    game.traffic = new window.SH_TRAFFIC.TrafficManager(city, scene);
    game.peds = new window.SH_PEDS.PedManager(city, scene);
    game.missions = new window.SH_MISSIONS.Missions(scene);
    game.parked = [];
    game.minutes = C.DAY_START_MIN;

    scene.add(game.player.mesh);
    game.traffic.init(C.TRAFFIC_COUNT);
    game.peds.init(C.PED_COUNT);
    spawnParkedCars();

    // mission events -> dialog + rewards
    game.missions.onEvent = function (type, data) {
      if (type === 'briefing') {
        window.SH_HUD.showDialog(hud, data.giver, data.briefing, 6000);
      } else if (type === 'complete') {
        game.player.money += data.reward;
        window.SH_AUDIO.pickup();
        window.SH_HUD.showDialog(hud, data.giver, 'Job done. $' + data.reward + ' is yours.', 5000);
        game.missions.next();
        if (game.missions.allDone()) {
          game.state = 'complete';
          window.SH_HUD.showEnd(hud, 'SOLMARINA IS YOURS', 'All 5 missions complete. You own this city, Dario.');
        }
      } else if (type === 'failed') {
        window.SH_HUD.showDialog(hud, 'Marisol', 'Mission failed: ' + data.reason, 5000);
        game.missions.retry();
      }
    };

    // shot mode: deterministic staged scenes for screenshots.
    // Apply the shot AFTER the title is shown, so the shot's own
    // show/hide of the title overlay is the final state.
    var params = new URLSearchParams(window.location.search);
    game.shot = params.get('shot');
    window.SH_HUD.showCenter(hud, 'SOLMARINA HEAT', window.SH_SAVE.hasSave() ? 'Press ENTER to play - L to load save' : 'Press ENTER to play');
    if (game.shot) window.SHOTS.apply(game, game.shot);
    window.addEventListener('resize', function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var last = performance.now(), acc = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      var step = 1 / 60;
      var n = 0;
      while (acc >= step && n < 5) { update(step); acc -= step; n++; }
      window.SH_RENDER.updateClouds(scene, dt);
      render();
      // HUD + minimap update every frame, in every state (title, playing,
      // wasted, busted), so the minimap is never a black box.
      window.SH_HUD.updateHUD(hud, game);
      window.SH_HUD.drawMinimap(hud, game);
      if (game.mapOpen) window.SH_MAP.draw(hud, game);
      IN.endFrame();
    }
    requestAnimationFrame(frame);
  }

  function spawnParkedCars() {
    // parked ON roads (multiples of 52 are the road lines), facing along
    // the road, so the player can steal one and drive straight off.
    var spots = [
      { x: -52, z: 0, h: 0 }, { x: 0, z: 52, h: Math.PI },
      { x: 52, z: -52, h: 0 }, { x: 104, z: 0, h: Math.PI / 2 },
      { x: -104, z: 52, h: Math.PI * 1.5 }, { x: 0, z: -104, h: Math.PI },
      { x: 156, z: 104, h: Math.PI / 2 }, { x: -156, z: -52, h: Math.PI * 1.5 }
    ];
    spots.forEach(function (s, i) {
      var spec = C.VEHICLES[i % C.VEHICLES.length];
      var v = window.SH_VEHICLES.makeVehicle(spec, s.x, s.z, s.h, 'parked', scene);
      game.parked.push(v);
    });
  }

  function nearestCar(maxD) {
    var px = game.player.x, pz = game.player.z;
    var best = null, bestD = maxD;
    var all = game.parked.concat(game.traffic.cars).concat(game.police.cars);
    all.forEach(function (v) {
      var dx = v.x - px, dz = v.z - pz;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) { best = v; bestD = d; }
    });
    return best;
  }

  function enterCar(v) {
    game.playerCar = v;
    v.kind = 'player';
    game.player.mesh.visible = false;
    game.police.addHeat(5); // stealing a car is a crime
    game.prompt = '';
  }

  function exitCar() {
    var v = game.playerCar;
    if (!v) return;
    var bx = v.x - Math.sin(v.heading) * 2.5, bz = v.z - Math.cos(v.heading) * 2.5;
    if (city.isBlocked(bx, bz, 1)) { bx = v.x + Math.sin(v.heading) * 2.5; bz = v.z + Math.cos(v.heading) * 2.5; }
    game.player.x = bx; game.player.z = bz;
    game.player.mesh.visible = true;
    game.player.mesh.position.set(bx, 0, bz);
    v.kind = 'parked';
    v.speed = 0;
    game.playerCar = null;
  }

  function update(dt) {
    // title screen
    if (game.state === 'title') {
      if (IN.consumePressed('enter')) {
        game.state = 'playing';
        window.SH_HUD.hideCenter(hud);
        window.SH_AUDIO.ensure();
        window.SH_AUDIO.startPad();
      }
      if (IN.consumePressed('l') && window.SH_SAVE.hasSave()) {
        var data = window.SH_SAVE.load();
        if (data) {
          window.SH_SAVE.apply(game, data);
          game.player.mesh.position.set(game.player.x, 0, game.player.z);
          game.state = 'playing';
          window.SH_HUD.hideCenter(hud);
          window.SH_HUD.showDialog(hud, 'System', 'Save loaded.', 3000);
        }
      }
      // slow camera orbit on the title screen
      game.yaw += dt * 0.1;
      window.SH_RENDER.updateCamera(renderer._cam || (renderer._cam = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000)), { x: 0, z: 0 }, game.yaw, 0.3);
      return;
    }
    if (game.state === 'wasted' || game.state === 'busted' || game.state === 'complete') {
      game.endTimer += dt;
      if (game.endTimer > 1 && IN.consumePressed('r')) respawn();
      return;
    }
    // paused: P resumes, N toggles the city map, S saves. (The old code
    // only checked P in the playing branch, so a paused game could never
    // resume; the map overlay needs the same treatment.)
    if (game.state === 'paused') {
      if (game.mapOpen) {
        if (IN.consumePressed('n') || IN.consumePressed('escape') || IN.consumePressed('p')) closeMap();
      } else {
        if (IN.consumePressed('p')) {
          game.state = 'playing';
          window.SH_HUD.hideCenter(hud);
        } else if (IN.consumePressed('n')) {
          openMap();
        } else if (IN.consumePressed('s')) {
          if (window.SH_SAVE.save(game)) {
            window.SH_HUD.showDialog(hud, 'System', 'Game saved.', 2500);
          }
        }
      }
      return;
    }
    if (game.state !== 'playing') return;

    // pause
    if (IN.consumePressed('p')) {
      game.state = 'paused';
      window.SH_HUD.showCenter(hud, 'PAUSED', 'Press P to resume - S to save - N for city map');
      return;
    }
    // city map (from live play)
    if (IN.consumePressed('n')) {
      openMap();
      return;
    }

    // clock + day-night
    game.minutes += dt * C.MIN_PER_SEC;
    if (game.minutes >= 1440) game.minutes -= 1440;

    // camera orbit from mouse (right = turn view right)
    var m = IN.consumeMouse();
    game.yaw += m.dx * 0.0032;
    game.pitch = Math.max(-0.15, Math.min(0.55, game.pitch + m.dy * 0.0022));

    // weapon switching + reload
    for (var wi = 0; wi < 4; wi++) {
      if (IN.consumePressed(String(wi + 1))) game.combat.switchWeapon(wi);
    }
    if (IN.consumePressed('r') && !game.playerCar) game.combat.startReload();

    // mission start
    if (IN.consumePressed('m') && game.missions.state === 'idle' && !game.missions.allDone()) {
      game.missions.start();
    }
    // save
    if (IN.consumePressed('s') && game.state === 'playing') {
      if (window.SH_SAVE.save(game)) {
        game.saveFlash = 3;
        window.SH_HUD.showDialog(hud, 'System', 'Game saved.', 2500);
      }
    }

    // enter/exit car
    if (IN.consumePressed('e')) {
      if (game.playerCar) exitCar();
      else {
        var near = nearestCar(4);
        if (near) enterCar(near);
      }
    }

    var axis = IN.axis();
    if (game.playerCar) {
      // driving
      var v = game.playerCar;
      var input = {
        fwd: axis.z < 0 || game.shot === 'chase', // staged chase drives itself
        back: axis.z > 0,
        left: axis.x < 0, right: axis.x > 0
      };
      window.SH_VEHICLES.drive(v, input, dt);
      // building collision: revert if blocked
      if (city.isBlocked(v.x, v.z, 1.8)) {
        v.x -= Math.sin(v.heading) * v.speed * dt;
        v.z -= Math.cos(v.heading) * v.speed * dt;
        v.speed *= 0.4;
        v.group.position.set(v.x, 0, v.z);
      }
      // hitting a pedestrian is a crime
      game.peds.peds.forEach(function (p) {
        var dx = p.x - v.x, dz = p.z - v.z;
        if (dx * dx + dz * dz < 4 && Math.abs(v.speed) > 5) {
          game.police.addHeat(8);
        }
      });
      game.yaw = v.heading;
      window.SH_AUDIO.setEngine(Math.abs(v.speed) / v.spec.top);
    } else {
      window.SH_AUDIO.setEngine(0);
      // walking (camera-relative). Forward = view direction (sin yaw, cos yaw),
      // right = (cos yaw, -sin yaw). W moves away from the camera, D moves right.
      var speed = (IN.keys['shift'] ? C.RUN_SPEED : C.WALK_SPEED);
      var fx = Math.sin(game.yaw), fz = Math.cos(game.yaw);
      var rx = Math.cos(game.yaw), rz = -Math.sin(game.yaw);
      var mx = fx * -axis.z + rx * axis.x;
      var mz = fz * -axis.z + rz * axis.x;
      var ml = Math.sqrt(mx * mx + mz * mz);
      if (ml > 0.01) {
        mx /= ml; mz /= ml;
        var nx = game.player.x + mx * speed * dt;
        var nz = game.player.z + mz * speed * dt;
        // per-axis collision so the player slides along walls
        if (!city.isBlocked(nx, game.player.z, C.PLAYER_RADIUS)) game.player.x = nx;
        if (!city.isBlocked(game.player.x, nz, C.PLAYER_RADIUS)) game.player.z = nz;
        game.player.heading = Math.atan2(mx, mz);
        game.player.walkPhase += dt * speed * 1.6;
      }
      game.player.mesh.position.set(game.player.x, 0, game.player.z);
      game.player.mesh.rotation.y = game.player.heading;
      var legs = game.player.mesh.userData.legs;
      var swing = ml > 0.01 ? Math.sin(game.player.walkPhase) * 0.5 : 0;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      var arms = game.player.mesh.userData.arms;
      if (arms) { arms[0].rotation.x = -swing; arms[1].rotation.x = swing; }
      // shooting: aim along the camera's horizontal forward direction, from
      // the player's chest height, so distant targets are hittable.
      if (IN.isMouseDown() || IN.consumePressed(' ')) {
        var dir = new THREE.Vector3();
        var cam = renderer._cam;
        cam.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();
        var origin = new THREE.Vector3(game.player.x, 1.3, game.player.z);
        var hit = game.combat.shoot(origin, dir, game.player);
        if (hit) {
          window.SH_AUDIO.shot();
          game.police.addHeat(6);
          game.missions.onKill();
        } else if (game.combat.ammo[game.combat.weaponIdx] > 0) {
          window.SH_AUDIO.shot();
          game.police.addHeat(2);
        }
      }
      // prompt: nearby car
      var near2 = nearestCar(4);
      game.prompt = near2 ? 'Press E to enter the ' + near2.spec.name : '';
    }

    // traffic + peds + combat + police + missions
    var allCars = game.traffic.cars.concat(game.parked).concat(game.police.cars);
    game.traffic.update(dt, game.player, game.playerCar, game.parked);
    game.peds.update(dt, game.player, game.playerCar, game.traffic.cars);
    window.SH_VEHICLES.separateCars(allCars.concat(game.playerCar ? [game.playerCar] : []));
    game.combat.update(dt, game.player, function (dmg) {
      if (game.playerCar) return; // bullets hit the car first
      game.player.hp -= dmg;
      if (game.player.hp <= 0) return wasted();
    });
    var bust = game.police.update(dt, game.player, game.playerCar);
    if (bust === 'busted') return busted();
    game.missions.update(dt, game);

    // spawn mission enemies when a kill step starts
    var step = game.missions.currentStep();
    if (game.missions.state === 'active' && step && step.type === 'kill' && game.combat.enemies.length < step.count) {
      game.combat.spawnEnemyNear(game.player, 20, 45);
    }

    // health regen slowly when not wanted
    if (game.police.stars === 0 && game.player.hp < C.PLAYER_HEALTH) {
      game.player.hp = Math.min(C.PLAYER_HEALTH, game.player.hp + dt * 2);
    }
    if (game.player.hp <= 0) return wasted();

    // HUD + minimap are updated in frame(), not here, so they run in every state.
  }

  function wasted() {
    if (game.state !== 'playing') return;
    game.state = 'wasted';
    game.player.dead = true;
    game.player.money = Math.max(0, game.player.money - 100);
    window.SH_AUDIO.wasted();
    window.SH_HUD.showEnd(hud, 'WASTED', 'Dario is down. You lost $100.');
    game.endTimer = 0;
  }

  function busted() {
    if (game.state !== 'playing') return;
    game.state = 'busted';
    game.player.money = Math.max(0, game.player.money - 150);
    window.SH_AUDIO.busted();
    window.SH_HUD.showEnd(hud, 'BUSTED', 'The Solmarina PD got you. You lost $150.');
    game.endTimer = 0;
  }

  function respawn() {
    game.state = 'playing';
    game.player.dead = false;
    game.player.hp = C.PLAYER_HEALTH;
    game.player.x = city.spawn.x;
    game.player.z = city.spawn.z;
    if (game.playerCar) { game.playerCar = null; }
    game.player.mesh.visible = true;
    game.player.mesh.position.set(game.player.x, 0, game.player.z);
    game.police.heat = 0;
    game.police.stars = 0;
    window.SH_HUD.hideEnd(hud);
    game.missions.retry();
  }

  function render() {
    if (!renderer._cam) renderer._cam = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    var cam = renderer._cam;
    var target = game.playerCar
      ? { x: game.playerCar.x, z: game.playerCar.z }
      : { x: game.player.x, z: game.player.z };
    var yaw = game.playerCar ? game.playerCar.heading : game.yaw;
    window.SH_RENDER.updateCamera(cam, target, yaw, game.pitch);
    window.SH_RENDER.applyDayNight(lights, scene, game.minutes);
    renderer.render(scene, cam);
  }

  window.addEventListener('DOMContentLoaded', init);
  window.SH_MAIN = { init: init, game: function () { return game; } };
})();
