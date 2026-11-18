// Solmarina Heat - traffic.js
// AI traffic: cars drive the street grid on right-hand lanes, turn at
// intersections, slow/stop for the car ahead, the player and parked cars.
(function () {
  'use strict';
  var C = window.SH_CONFIG;
  var R = window.SH_RANDOM;
  var V = window.SH_VEHICLES;

  function TrafficManager(city, scene) {
    this.city = city;
    this.scene = scene;
    this.cars = [];
    this.rng = R.stream(C.SEED + 77);
  }

  TrafficManager.prototype.spawnOne = function () {
    var rng = this.rng;
    var spec = C.VEHICLES[Math.floor(rng() * C.VEHICLES.length)];
    // pick a random street and a random point on it
    var alongX = rng() < 0.5;
    var line = alongX ? this.city.roadsX[Math.floor(rng() * this.city.roadsX.length)]
                      : this.city.roadsZ[Math.floor(rng() * this.city.roadsZ.length)];
    var pos = R.randRange(-220, 220);
    var dir = rng() < 0.5 ? 1 : -1;
    var x, z, heading;
    if (alongX) { x = pos; z = line + (dir > 0 ? 3.5 : -3.5); heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { x = line + (dir > 0 ? -3.5 : 3.5); z = pos; heading = dir > 0 ? 0 : Math.PI; }
    var v = V.makeVehicle(spec, x, z, heading, 'traffic', this.scene);
    v.speed = R.randRange(8, 14);
    v.dir = dir;
    v.alongX = alongX;
    v.line = line;
    this.cars.push(v);
    return v;
  };

  TrafficManager.prototype.init = function (count) {
    for (var i = 0; i < count; i++) this.spawnOne();
  };

  // Is there a car (or the player car) ahead within look distance?
  TrafficManager.prototype.aheadBlocked = function (car, allCars, playerCar, look) {
    var hx = Math.sin(car.heading), hz = Math.cos(car.heading);
    var list = allCars.concat(playerCar ? [playerCar] : []);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === car) continue;
      var dx = o.x - car.x, dz = o.z - car.z;
      var along = dx * hx + dz * hz;
      var side = Math.abs(dx * hz - dz * hx);
      if (along > 0 && along < look && side < 2.6) return true;
    }
    return false;
  };

  TrafficManager.prototype.update = function (dt, player, playerCar, parkedCars) {
    var half = C.CITY_SIZE / 2;
    for (var i = this.cars.length - 1; i >= 0; i--) {
      var car = this.cars[i];
      // respawn at the far edge if it left the city
      if (Math.abs(car.x) > half - 10 || Math.abs(car.z) > half - 10 || car.z > C.WATER_Y - 4) {
        this.scene.remove(car.group);
        this.cars.splice(i, 1);
        this.spawnOne();
        continue;
      }
      // slow/stop for traffic ahead
      var blocked = this.aheadBlocked(car, this.cars.concat(parkedCars), playerCar, 12);
      var target = blocked ? 0 : R.randRange(9, 14);
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      // intersection: when close to a cross street, sometimes turn
      var nearX = null, nearZ = null;
      for (var k = 0; k < this.city.roadsX.length; k++) {
        if (Math.abs(car.z - this.city.roadsX[k]) < 2.2) nearX = this.city.roadsX[k];
      }
      for (var k2 = 0; k2 < this.city.roadsZ.length; k2++) {
        if (Math.abs(car.x - this.city.roadsZ[k2]) < 2.2) nearZ = this.city.roadsZ[k2];
      }
      if ((car.alongX && nearZ !== null) || (!car.alongX && nearX !== null)) {
        if (this.rng() < dt * 0.25) {
          // turn onto the cross street (no U-turns)
          var turnLeft = this.rng() < 0.5;
          if (car.alongX) {
            car.alongX = false;
            car.line = nearZ;
            car.heading = turnLeft ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI : 0);
            car.dir = turnLeft ? (car.dir > 0 ? 1 : -1) : (car.dir > 0 ? -1 : 1);
            car.z = nearZ + (car.heading === 0 ? -3.5 : 3.5);
          } else {
            car.alongX = true;
            car.line = nearX;
            car.heading = turnLeft ? (car.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
            car.dir = turnLeft ? (car.dir > 0 ? -1 : 1) : (car.dir > 0 ? 1 : -1);
            car.x = nearX + (car.heading === Math.PI / 2 ? 3.5 : -3.5);
          }
        }
      }
      // move along current heading
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      // stay in the lane (nudge back to the line)
      if (car.alongX) car.z += (car.line + (car.dir > 0 ? 3.5 : -3.5) - car.z) * Math.min(1, dt * 2);
      else car.x += (car.line + (car.dir > 0 ? -3.5 : 3.5) - car.x) * Math.min(1, dt * 2);
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.heading;
    }
  };

  window.SH_TRAFFIC = { TrafficManager: TrafficManager };
})();
