// Solmarina Heat - vehicles and driving physics.
// Five original vehicle types with distinct speed, grip and shape.
// Arcade top-down model: velocity vector, grip kills lateral slide,
// hard steering at speed keeps a little drift.

import { SEED } from "./config.js";
import { makeRng } from "./random.js";

export const VEHICLE_TYPES = [
  {
    id: "sedan",
    name: "Solmarina Sedan",
    top: 300,
    accel: 220,
    brake: 420,
    turn: 2.6,
    grip: 7,
    len: 48,
    wid: 26,
    colors: ["#c0392b", "#2e86ab", "#e8e8e8", "#5d6b52"],
  },
  {
    id: "taxi",
    name: "Bay Cab",
    top: 290,
    accel: 235,
    brake: 420,
    turn: 2.7,
    grip: 7,
    len: 48,
    wid: 26,
    colors: ["#f2c200"],
    taxi: true,
  },
  {
    id: "pickup",
    name: "Cannery Pickup",
    top: 260,
    accel: 180,
    brake: 380,
    turn: 2.2,
    grip: 7,
    len: 52,
    wid: 26,
    colors: ["#7a3b2e", "#4a7c59", "#2e5f8a"],
  },
  {
    id: "sports",
    name: "Palmetto GT",
    top: 420,
    accel: 320,
    brake: 480,
    turn: 3.0,
    grip: 6,
    len: 46,
    wid: 24,
    colors: ["#e4572e", "#d62828", "#ffd640"],
  },
  {
    id: "van",
    name: "Brisas Van",
    top: 230,
    accel: 150,
    brake: 340,
    turn: 1.9,
    grip: 7,
    len: 56,
    wid: 28,
    colors: ["#e8e8e8", "#8a7f72", "#3c6e8f"],
  },
];

const rng = makeRng(SEED + 41);

export function typeById(id) {
  for (const t of VEHICLE_TYPES) {
    if (t.id === id) {
      return t;
    }
  }
  return VEHICLE_TYPES[0];
}

export function makeVehicle(typeId, x, y, angle, kind) {
  const t = typeById(typeId);
  return {
    type: t.id,
    name: t.name,
    x,
    y,
    angle: angle || 0,
    speed: 0,
    vx: 0,
    vy: 0,
    top: t.top,
    accel: t.accel,
    brake: t.brake,
    turn: t.turn,
    grip: t.grip,
    len: t.len,
    wid: t.wid,
    color: rng.pick(t.colors),
    taxi: !!t.taxi,
    police: false,
    kind: kind || "parked",
  };
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function carCorners(v, px, py) {
  const hl = v.len / 2 - 2;
  const hw = v.wid / 2 - 2;
  const c = Math.cos(v.angle);
  const s = Math.sin(v.angle);
  const pts = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      pts.push([px + c * sx * hl - s * sy * hw, py + s * sx * hl + c * sy * hw]);
    }
  }
  pts.push([px + c * hl, py + s * hl]);
  pts.push([px - c * hl, py - s * hl]);
  pts.push([px, py]);
  return pts;
}

function carBlocked(v, px, py, city) {
  const pts = carCorners(v, px, py);
  for (const p of pts) {
    if (city.isBlocked(p[0], p[1])) {
      return true;
    }
  }
  return false;
}

function overlapsOther(v, px, py, others) {
  for (const o of others) {
    if (o === v) {
      continue;
    }
    const dx = px - o.x;
    const dy = py - o.y;
    const rr = (v.len + o.len) / 2 - 6;
    if (dx * dx + dy * dy < rr * rr) {
      return true;
    }
  }
  return false;
}

// Drive one step. ctl: {throttle, brake, steer} with steer in -1..1.
// Returns the forward speed after the step.
export function updateVehicle(v, ctl, dt, city, others) {
  let fx = Math.cos(v.angle);
  let fy = Math.sin(v.angle);
  let rx = -fy;
  let ry = fx;
  let fwd = v.vx * fx + v.vy * fy;
  let lat = v.vx * rx + v.vy * ry;

  if (ctl.throttle) {
    fwd += v.accel * dt;
  }
  if (ctl.brake) {
    if (fwd > 1) {
      fwd -= v.brake * dt;
    } else {
      fwd -= v.accel * 0.55 * dt;
    }
  }
  fwd -= fwd * 0.35 * dt;
  if (Math.abs(fwd) < 2 && !ctl.throttle && !ctl.brake) {
    fwd = 0;
  }
  fwd = clamp(fwd, -v.top * 0.38, v.top);

  const spdF = 1 / (1 + Math.abs(fwd) / 260);
  const steer = (ctl.steer || 0) * v.turn * spdF;
  v.angle += steer * dt * (fwd >= 0 ? 1 : -1);

  const grip = Math.abs(steer) > 1.6 && Math.abs(fwd) > 180 ? v.grip * 0.45 : v.grip;
  lat *= Math.exp(-grip * dt);

  fx = Math.cos(v.angle);
  fy = Math.sin(v.angle);
  rx = -fy;
  ry = fx;
  v.vx = fx * fwd + rx * lat;
  v.vy = fy * fwd + ry * lat;
  v.speed = fwd;

  const nx = v.x + v.vx * dt;
  if (!carBlocked(v, nx, v.y, city) && !overlapsOther(v, nx, v.y, others)) {
    v.x = nx;
  } else {
    v.vx *= -0.2;
    v.speed *= 0.4;
  }
  const ny = v.y + v.vy * dt;
  if (!carBlocked(v, v.x, ny, city) && !overlapsOther(v, v.x, ny, others)) {
    v.y = ny;
  } else {
    v.vy *= -0.2;
    v.speed *= 0.4;
  }
  return v.speed;
}

// Push overlapping cars apart so traffic never stacks on one spot.
export function separateCars(cars) {
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.kind === "driven" || b.kind === "driven") {
        continue;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = (a.len + b.len) / 2 - 8;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (rr - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

export function nearestVehicle(x, y, cars, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const c of cars) {
    const dx = c.x - x;
    const dy = c.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD) {
      bestD = d2;
      best = c;
    }
  }
  return best;
}

export function drawVehicle(ctx, car) {
  const t = typeById(car.type || "sedan");
  const len = car.len || t.len;
  const wid = car.wid || t.wid;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle || 0);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(-len / 2 + 2, -wid / 2 + 2, len, wid);
  ctx.fillStyle = car.police ? "#1d3557" : car.color || t.colors[0];
  ctx.fillRect(-len / 2, -wid / 2, len, wid);
  if (car.taxi) {
    ctx.fillStyle = "#111";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(-len / 2 + 4 + i * 11, -wid / 2 + 2, 6, 4);
      ctx.fillRect(-len / 2 + 4 + i * 11, wid / 2 - 6, 6, 4);
    }
    ctx.fillStyle = "#ffd640";
    ctx.fillRect(-4, -wid / 2, 8, 4);
  }
  if (car.type === "pickup") {
    ctx.fillStyle = "#bfe3ee";
    ctx.fillRect(-2, -wid / 2 + 3, 12, wid - 6);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(-len / 2 + 3, -wid / 2 + 3, len / 2 - 8, wid - 6);
  } else if (car.type === "van") {
    ctx.fillStyle = "#bfe3ee";
    ctx.fillRect(len / 2 - 12, -wid / 2 + 3, 7, wid - 6);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(-len / 2 + 4, -wid / 2 + 3, len - 20, 4);
  } else {
    ctx.fillStyle = "#bfe3ee";
    ctx.fillRect(-8, -wid / 2 + 3, 14, wid - 6);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(len / 2 - 10, -wid / 2 + 3, 6, wid - 6);
  }
  if (car.type === "sports") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(-len / 2 - 3, -wid / 2 + 1, 4, wid - 2);
  }
  if (car.police) {
    ctx.fillStyle = "#d62828";
    ctx.fillRect(-2, -wid / 2, 8, 5);
    ctx.fillStyle = "#2a6fdb";
    ctx.fillRect(-2, wid / 2 - 5, 8, 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(8, -wid / 2 + 3, 6, wid - 6);
  }
  ctx.fillStyle = "#141414";
  ctx.fillRect(-len / 2 + 4, -wid / 2 - 3, 10, 4);
  ctx.fillRect(-len / 2 + 4, wid / 2 - 1, 10, 4);
  ctx.fillRect(len / 2 - 14, -wid / 2 - 3, 10, 4);
  ctx.fillRect(len / 2 - 14, wid / 2 - 1, 10, 4);
  ctx.restore();
}
