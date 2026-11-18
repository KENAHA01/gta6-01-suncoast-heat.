// Solmarina Heat - config.js
// All tunable constants for the 3D game. One place, no magic numbers elsewhere.
(function () {
  'use strict';
  var C = {};

  // World
  C.SEED = 20261118;
  C.CITY_SIZE = 520;          // city is CITY_SIZE x CITY_SIZE metres, centred on 0,0
  C.BLOCK = 52;               // street grid spacing (metres)
  C.ROAD_WIDTH = 14;
  C.WATER_Y = 170;            // south bay starts here (z beyond this is water)
  C.BRIDGE_X = 0;             // bridge crosses the bay at x = 0
  C.BRIDGE_WIDTH = 20;

  // Districts: name, centre, palette (building colours, ground tint)
  C.DISTRICTS = [
    { name: 'Marina Bay', cx: 0, cz: -130, color: 0x2e6f8e, ground: 0x3a7a8c },
    { name: 'Palmetto Strip', cx: 0, cz: 0, color: 0xc96a2e, ground: 0x8a6a4a },
    { name: 'Las Brisas', cx: -130, cz: 90, color: 0x7a9e4a, ground: 0x5a7a3a },
    { name: 'Old Cannery', cx: 130, cz: 90, color: 0x8a4a3a, ground: 0x6a5a4a }
  ];

  // Player
  C.WALK_SPEED = 6;           // m/s on foot
  C.RUN_SPEED = 10;           // m/s holding Shift
  C.PLAYER_HEALTH = 100;
  C.PLAYER_RADIUS = 0.7;

  // Camera (third person, behind and above the player)
  C.CAM_DIST = 11;
  C.CAM_HEIGHT = 6.5;
  C.CAM_LOOK_UP = 1.6;

  // Vehicles: name, top speed (m/s), accel, brake, turn, grip, colour, size
  C.VEHICLES = [
    { name: 'Solmarina Sedan', top: 26, accel: 14, brake: 26, turn: 1.9, grip: 0.92, color: 0x3a6ac9, len: 4.4, wid: 2.0 },
    { name: 'Bay Cab', top: 24, accel: 13, brake: 26, turn: 2.0, grip: 0.92, color: 0xe8b400, len: 4.4, wid: 2.0 },
    { name: 'Cannery Pickup', top: 22, accel: 11, brake: 24, turn: 1.7, grip: 0.88, color: 0x7a4a2a, len: 5.0, wid: 2.1 },
    { name: 'Palmetto GT', top: 38, accel: 20, brake: 30, turn: 2.3, grip: 0.86, color: 0xc92a2a, len: 4.2, wid: 1.9 },
    { name: 'Brisas Van', top: 20, accel: 9, brake: 22, turn: 1.5, grip: 0.94, color: 0x4a7a8a, len: 5.4, wid: 2.2 }
  ];
  C.TRAFFIC_COUNT = 10;
  C.PARKED_COUNT = 8;
  C.PED_COUNT = 18;

  // Weapons: name, damage, fire rate (shots/sec), range (m), mag size, spread (rad), auto
  C.WEAPONS = [
    { name: 'Pistol', dmg: 25, rate: 3, range: 60, mag: 12, spread: 0.02, auto: false, color: 0x222222 },
    { name: 'Shotgun', dmg: 14, rate: 1.1, range: 28, mag: 6, spread: 0.12, auto: false, pellets: 6, color: 0x5a3a1a },
    { name: 'SMG', dmg: 14, rate: 9, range: 45, mag: 30, spread: 0.05, auto: true, color: 0x333344 },
    { name: 'Rifle', dmg: 45, rate: 2.2, range: 110, mag: 20, spread: 0.01, auto: false, color: 0x2a3a2a }
  ];

  // Wanted / police
  C.WANTED_MAX = 5;
  C.WANTED_DECAY_SEC = 45;    // seconds hidden before one star drops
  C.POLICE_FOOT_SPEED = 5.5;
  C.POLICE_CAR_TOP = 32;

  // Clock / day-night (game minutes per real second)
  C.MIN_PER_SEC = 2;
  C.DAY_START_MIN = 10 * 60;  // 10:00

  // Missions
  C.MISSION_COUNT = 5;

  window.SH_CONFIG = C;
})();
