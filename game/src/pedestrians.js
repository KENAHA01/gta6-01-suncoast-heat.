// Solmarina Heat - AI pedestrians.
// People walk the road edges between intersections, step aside for the
// player on foot, and run when a fast car comes at them.

import { SEED, CELL, ROAD, COLS, ROWS, WORLD_W, WORLD_H } from "./config.js";
import { makeRng } from "./random.js";

const TARGET = 18;
const SHIRTS = ["#e4572e", "#2e86ab", "#f2c200", "#4a7c59", "#8e44ad", "#e8e8e8", "#d62828", "#5d6b52"];
const SKINS = ["#f2c79b", "#c98d5f", "#8a5a3b", "#e8b48a"];

function interX(i) {
  return i * CELL + ROAD / 2;
}

function interY(j) {
  return j * CELL + ROAD / 2;
}

export class PedestrianManager {
  constructor(city) {
    this.city = city;
    this.rng = makeRng(SEED + 131);
    this.list = [];
  }

  spawnInitial(count) {
    for (let n = 0; n < count; n += 1) {
      this.spawnOne();
    }
  }

  spawnOne() {
    const i = this.rng.int(0, COLS);
    const j = this.rng.int(0, ROWS);
    const edge = this.rng.pick([-1, 1]);
    const x = interX(i) + edge * this.rng.range(14, 20);
    const y = interY(j) + this.rng.pick([-1, 1]) * this.rng.range(14, 20);
    const p = {
      x,
      y,
      tx: interX(this.rng.int(0, COLS)),
      ty: interY(this.rng.int(0, ROWS)),
      speed: this.rng.range(42, 58),
      state: "walk",
      fleeT: 0,
      fx: 0,
      fy: 0,
      shirt: this.rng.pick(SHIRTS),
      skin: this.rng.pick(SKINS),
      phase: this.rng.range(0, Math.PI * 2),
    };
    this.list.push(p);
    return p;
  }

  pickTarget(p) {
    p.tx = interX(this.rng.int(0, COLS));
    p.ty = interY(this.rng.int(0, ROWS));
  }

  stepBlocked(px, py) {
    const half = 8;
    return (
      this.city.isBlocked(px - half, py - half) ||
      this.city.isBlocked(px + half, py - half) ||
      this.city.isBlocked(px - half, py + half) ||
      this.city.isBlocked(px + half, py + half)
    );
  }

  update(dt, cars, player) {
    for (const p of this.list) {
      p.phase += dt * 9;
      if (p.state === "flee") {
        p.fleeT -= dt;
        const nx = p.x + p.fx * 130 * dt;
        const ny = p.y + p.fy * 130 * dt;
        if (!this.stepBlocked(nx, p.y)) {
          p.x = nx;
        }
        if (!this.stepBlocked(p.x, ny)) {
          p.y = ny;
        }
        p.x = Math.min(WORLD_W - 10, Math.max(10, p.x));
        p.y = Math.min(WORLD_H - 10, Math.max(10, p.y));
        if (p.fleeT <= 0) {
          p.state = "walk";
          this.pickTarget(p);
        }
        continue;
      }

      let threat = null;
      let threatD = 95 * 95;
      for (const c of cars) {
        const sp = Math.abs(c.speed || 0);
        if (sp < 80) {
          continue;
        }
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < threatD) {
          threatD = d2;
          threat = c;
        }
      }
      if (threat) {
        const d = Math.sqrt(threatD) || 1;
        p.fx = (p.x - threat.x) / d;
        p.fy = (p.y - threat.y) / d;
        p.state = "flee";
        p.fleeT = 1.4;
        continue;
      }

      if (player) {
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 26 * 26 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const nx = p.x + (dx / d) * 60 * dt;
          const ny = p.y + (dy / d) * 60 * dt;
          if (!this.stepBlocked(nx, p.y)) {
            p.x = nx;
          }
          if (!this.stepBlocked(p.x, ny)) {
            p.y = ny;
          }
        }
      }

      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      if (Math.abs(dx) > 6) {
        const step = Math.sign(dx) * p.speed * dt;
        const nx = p.x + step;
        if (!this.stepBlocked(nx, p.y)) {
          p.x = nx;
        } else {
          this.pickTarget(p);
        }
      } else if (Math.abs(dy) > 6) {
        const step = Math.sign(dy) * p.speed * dt;
        const ny = p.y + step;
        if (!this.stepBlocked(p.x, ny)) {
          p.y = ny;
        } else {
          this.pickTarget(p);
        }
      } else {
        this.pickTarget(p);
      }
    }
    while (this.list.length < TARGET) {
      this.spawnOne();
    }
  }
}

export function drawPedestrian(ctx, p) {
  const bob = Math.sin(p.phase) * 1.5;
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(p.x + 1, p.y + 4, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.shirt;
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob * 0.4, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 3 + bob * 0.4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#20242a";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 4 + bob * 0.4, 4.5, Math.PI, Math.PI * 2);
  ctx.fill();
}
