// Solmarina Heat - missions.js
// 5 sequential missions: short dialog, a beacon marker, objectives, win/fail.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  // Mission definitions. Each has steps; a step completes when the player
  // reaches its target (or does its action). Reward in cash.
  var DEFS = [
    {
      name: 'First Wheels', giver: 'Marisol',
      briefing: 'Dario, you need wheels. Steal any car and bring it to the Palmetto garage.',
      steps: [
        { type: 'steal', text: 'Steal any car (walk up and press E)' },
        { type: 'goto', x: 52, z: 0, text: 'Drive it to the garage on Palmetto Strip' }
      ],
      reward: 150
    },
    {
      name: 'Package Run', giver: 'Marisol',
      briefing: 'A package is waiting at the marina. Pick it up, then drop it at Las Brisas.',
      steps: [
        { type: 'goto', x: 0, z: 150, text: 'Pick up the package at Marina Bay' },
        { type: 'goto', x: -130, z: 90, text: 'Deliver it to Las Brisas' }
      ],
      reward: 250
    },
    {
      name: 'Clear the Corner', giver: 'Rico',
      briefing: 'Rico says the Cannery crew is muscling in. Take out 3 of them near Old Cannery.',
      steps: [
        { type: 'kill', count: 3, x: 130, z: 90, text: 'Take out 3 Cannery thugs (Old Cannery)' }
      ],
      reward: 400
    },
    {
      name: 'Hot Wheels', giver: 'Marisol',
      briefing: 'The cops are watching. Steal the Palmetto GT from the beach and lose any heat.',
      steps: [
        { type: 'stealGT', text: 'Steal the red Palmetto GT at the beach' },
        { type: 'loseheat', text: 'Lose the heat (stay out of sight until the stars clear)' }
      ],
      reward: 500
    },
    {
      name: 'The Cannery Job', giver: 'Rico',
      briefing: 'Last one. Hit the Cannery warehouse, grab the cash, and get out. The whole crew is there.',
      steps: [
        { type: 'goto', x: 130, z: 90, text: 'Reach the Cannery warehouse' },
        { type: 'kill', count: 4, x: 130, z: 90, text: 'Take out 4 guards' },
        { type: 'goto', x: -130, z: 90, text: 'Escape to Las Brisas' }
      ],
      reward: 800
    }
  ];

  function Missions(scene) {
    this.scene = scene;
    this.idx = 0;
    this.stepIdx = 0;
    this.state = 'idle';   // idle | active | done | failed
    this.kills = 0;
    this.beacon = null;
    this.onEvent = null;   // callback(type, data)
  }

  Missions.prototype.current = function () {
    if (this.idx >= DEFS.length) return null;
    return DEFS[this.idx];
  };
  Missions.prototype.currentStep = function () {
    var m = this.current();
    if (!m) return null;
    return m.steps[this.stepIdx];
  };

  Missions.prototype.start = function () {
    if (this.idx >= DEFS.length) return;
    this.state = 'active';
    this.stepIdx = 0;
    this.kills = 0;
    this.showBeacon();
    if (this.onEvent) this.onEvent('briefing', this.current());
  };

  Missions.prototype.showBeacon = function () {
    this.hideBeacon();
    var step = this.currentStep();
    if (!step || step.x === undefined) return;
    var geo = new THREE.CylinderGeometry(1.6, 1.6, 30, 12, 1, true);
    var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false
    }));
    m.position.set(step.x, 15, step.z);
    this.scene.add(m);
    this.beacon = m;
  };
  Missions.prototype.hideBeacon = function () {
    if (this.beacon) { this.scene.remove(this.beacon); this.beacon = null; }
  };

  Missions.prototype.advance = function () {
    this.stepIdx++;
    var m = this.current();
    if (this.stepIdx >= m.steps.length) {
      this.complete();
      return;
    }
    this.kills = 0;
    this.showBeacon();
    if (this.onEvent) this.onEvent('step', this.currentStep());
  };

  Missions.prototype.complete = function () {
    var m = this.current();
    this.hideBeacon();
    this.state = 'done';
    if (this.onEvent) this.onEvent('complete', m);
  };

  Missions.prototype.fail = function (reason) {
    this.hideBeacon();
    this.state = 'failed';
    if (this.onEvent) this.onEvent('failed', { reason: reason, mission: this.current() });
  };

  Missions.prototype.retry = function () {
    this.state = 'idle';
    this.stepIdx = 0;
    this.kills = 0;
  };

  Missions.prototype.next = function () {
    this.idx++;
    this.state = 'idle';
    this.stepIdx = 0;
    this.kills = 0;
  };

  Missions.prototype.allDone = function () { return this.idx >= DEFS.length; };

  // Called every frame with the live game state. Returns events via onEvent.
  Missions.prototype.update = function (dt, game) {
    if (this.state !== 'active') return;
    var step = this.currentStep();
    if (!step) return;
    var px = game.playerCar ? game.playerCar.x : game.player.x;
    var pz = game.playerCar ? game.playerCar.z : game.player.z;
    if (step.type === 'goto') {
      var dx = px - step.x, dz = pz - step.z;
      if (dx * dx + dz * dz < 100) this.advance();
    } else if (step.type === 'steal') {
      if (game.playerCar) this.advance();
    } else if (step.type === 'stealGT') {
      if (game.playerCar && game.playerCar.spec.name === 'Palmetto GT') this.advance();
    } else if (step.type === 'kill') {
      if (this.kills >= step.count) this.advance();
    } else if (step.type === 'loseheat') {
      if (game.police.stars === 0) this.advance();
    }
    // beacon spin
    if (this.beacon) this.beacon.rotation.y += dt * 1.5;
  };

  Missions.prototype.onKill = function () {
    if (this.state !== 'active') return;
    var step = this.currentStep();
    if (step && step.type === 'kill') this.kills++;
  };

  window.SH_MISSIONS = { Missions: Missions, DEFS: DEFS };
})();
