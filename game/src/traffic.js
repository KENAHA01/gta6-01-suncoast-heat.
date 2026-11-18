// Solmarina Heat - AI traffic.
// Cars drive the street grid on right-hand lanes, pick a turn at every
// intersection, slow for the car ahead and for the player, and respawn so
// the streets stay alive. Positions come from intersection legs, so a car
// can never drift off the road.

import { SEED, CELL, ROAD, COLS, ROWS } from "./config.js";
import { makeRng } from "./random.js";
import { makeVehicle, VEHICLE_TYPES } from "./vehicles.js";

const LANE = 11;
const TARGET = 10;

function interX(i) {
  return i * CELL + ROAD / 2;
}

function interY(j) {
  return j * CELL + ROAD / 2;
}

function neighbors(i, j) {
  const out = [];
  if (i > 0) {
    out.push([i - 1, j]);
  }
  if (i < COLS) {
    out.push([i + 1, j]);
  }
  if (j > 0) {
    out.push([i, j - 1]);
  }
  if (j < ROWS) {
    out.push([i, j + 1]);
  }
  return out;
}

export class TrafficManager {
  constructor(city, cars) {
    this.city = city;
    this.cars = cars;
    this.rng = makeRng(SEED + 77);
    this.list = [];
  }

  spawnInitial(count) {
    for (let n = 0; n < count; n += 1) {
      this.spawnOne(null, null);
    }
  }

  randomType() {
    const roll = this.rng.next();
    if (roll < 0.16) {
      return "taxi";
    }
    if (roll < 0.26) {
      return "pickup";
    }
    if (roll < 0.33) {
      return "van";
    }
    if (roll < 0.4) {
      return "sports";
    }
    return "sedan";
  }

  spawnOne(px, py) {
    for (let tries = 0; tries < 12; tries += 1) {
      const i = this.rng.int(0, COLS);
      const j = this.rng.int(0, ROWS);
      const nbs = neighbors(i, j);
      const nb = this.rng.pick(nbs);
      const x = interX(i);
      const y = interY(j);
      if (px !== null && Math.hypot(x - px, y - py) < 420) {
        continue;
      }
      let clear = true;
      for (const c of this.list) {
        if (Math.hypot(c.x - x, c.y - y) < 110) {
          clear = false;
          break;
        }
      }
      if (!clear) {
        continue;
      }
      const car = makeVehicle(this.randomType(), x, y, 0, "traffic");
      car.leg = { ax: i, ay: j, bx: nb[0], by: nb[1] };
      car.t = this.rng.range(0, 0.8);
      car.cruise = this.rng.range(90, 135);
      car.speed = car.cruise;
      car.prevI = i;
      car.prevJ = j;
      this.list.push(car);
      this.cars.push(car);
      return car;
    }
    return null;
  }

  // A car is stolen: drop it from traffic and keep the streets full.
  onStolen(car, px, py) {
    const at = this.list.indexOf(car);
    if (at >= 0) {
      this.list.splice(at, 1);
    }
    this.spawnOne(px, py);
  }

  aheadBlocked(car, px, py) {
    const hx = Math.cos(car.angle);
    const hy = Math.sin(car.angle);
    const obstacles = [];
    for (const o of this.list) {
      if (o !== car) {
        obstacles.push({ x: o.x, y: o.y, r: 78 });
      }
    }
    for (const o of this.cars) {
      if (o === car || this.list.includes(o)) {
        continue;
      }
      obstacles.push({ x: o.x, y: o.y, r: 72 });
    }
    if (px !== null && py !== null) {
      obstacles.push({ x: px, y: py, r: 62 });
    }
    for (const o of obstacles) {
      const dx = o.x - car.x;
      const dy = o.y - car.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > o.r * o.r) {
        continue;
      }
      const along = dx * hx + dy * hy;
      if (along > 8) {
        return true;
      }
    }
    return false;
  }

  update(dt, player, driven) {
    const px = player && !driven ? player.x : null;
    const py = player && !driven ? player.y : null;
    for (const car of this.list) {
      const blocked = this.aheadBlocked(car, px, py);
      const target = blocked ? 0 : car.cruise;
      if (car.speed < target) {
        car.speed = Math.min(target, car.speed + 70 * dt);
      } else if (car.speed > target) {
        car.speed = Math.max(target, car.speed - 240 * dt);
      }
      if (car.speed > 0.5) {
        car.t += (car.speed * dt) / CELL;
      }
      if (car.t >= 1) {
        car.t = 0;
        car.prevI = car.leg.bx;
        car.prevJ = car.leg.by;
        const nbs = neighbors(car.leg.bx, car.leg.by).filter(
          (n) => !(n[0] === car.leg.ax && n[1] === car.leg.ay),
        );
        const nb = this.rng.pick(nbs.length ? nbs : neighbors(car.leg.bx, car.leg.by));
        car.leg = { ax: car.leg.bx, ay: car.leg.by, bx: nb[0], by: nb[1] };
      }
      const ax = interX(car.leg.ax);
      const ay = interY(car.leg.ay);
      const bx = interX(car.leg.bx);
      const by = interY(car.leg.by);
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const ease = Math.min(1, car.t / 0.16, (1 - car.t) / 0.16);
      const off = LANE * ease;
      car.x = ax + dx * car.t - uy * off;
      car.y = ay + dy * car.t + ux * off;
      const want = Math.atan2(dy, dx);
      let diff = want - car.angle;
      while (diff > Math.PI) {
        diff -= Math.PI * 2;
      }
      while (diff < -Math.PI) {
        diff += Math.PI * 2;
      }
      car.angle += diff * Math.min(1, 7 * dt);
    }
    while (this.list.length < TARGET) {
      if (!this.spawnOne(player ? player.x : null, player ? player.y : null)) {
        break;
      }
    }
  }
}

export { VEHICLE_TYPES };
