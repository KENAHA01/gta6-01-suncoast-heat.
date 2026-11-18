// Solmarina Heat - the procedural city.
// One fixed seed places every building and tree, so the city never changes.

import {
  SEED,
  BLOCK,
  ROAD,
  CELL,
  COLS,
  ROWS,
  CITY_W,
  CITY_H,
  BAY_H,
  BEACH_H,
  WORLD_W,
  WORLD_H,
  BRIDGE_ROAD,
  PARKS,
  DISTRICTS,
  blockX,
  blockY,
  roadX,
  districtAt,
} from "./config.js";
import { makeRng } from "./random.js";

export class City {
  constructor() {
    this.rng = makeRng(SEED);
    this.buildings = [];
    this.trees = [];
    this.build();
  }

  isPark(col, row) {
    for (const p of PARKS) {
      if (p.col === col && p.row === row) {
        return true;
      }
    }
    return false;
  }

  build() {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const d = districtAt(col, row);
        const bx = blockX(col);
        const by = blockY(row);
        if (this.isPark(col, row)) {
          const count = this.rng.int(6, 9);
          for (let i = 0; i < count; i += 1) {
            this.trees.push({
              x: bx + this.rng.range(18, BLOCK - 18),
              y: by + this.rng.range(18, BLOCK - 18),
              r: this.rng.range(9, 15),
            });
          }
          continue;
        }
        const layout = this.rng.pick(["one", "two", "four"]);
        if (layout === "one") {
          const m = this.rng.range(14, 30);
          this.addBuilding(bx + m, by + m, BLOCK - m * 2, BLOCK - m * 2, d);
        } else if (layout === "two") {
          const gap = 12;
          const w = (BLOCK - gap) / 2;
          const m = this.rng.range(12, 20);
          this.addBuilding(bx + m, by + m, w - m, BLOCK - m * 2, d);
          this.addBuilding(bx + w + gap, by + m, w - m, BLOCK - m * 2, d);
        } else {
          const gap = 10;
          const w = (BLOCK - gap) / 2;
          const h = (BLOCK - gap) / 2;
          const m = this.rng.range(10, 16);
          this.addBuilding(bx + m, by + m, w - m, h - m, d);
          this.addBuilding(bx + w + gap, by + m, w - m, h - m, d);
          this.addBuilding(bx + m, by + h + gap, w - m, h - m, d);
          this.addBuilding(bx + w + gap, by + h + gap, w - m, h - m, d);
        }
      }
    }
    for (let i = 0; i < 14; i += 1) {
      this.trees.push({
        x: this.rng.range(60, WORLD_W - 60),
        y: CITY_H + BAY_H + this.rng.range(24, BEACH_H - 24),
        r: this.rng.range(10, 16),
      });
    }
  }

  addBuilding(x, y, w, h, district) {
    if (w < 24 || h < 24) {
      return;
    }
    this.buildings.push({
      x,
      y,
      w,
      h,
      color: this.rng.pick(district.buildings),
      district: district.id,
    });
  }

  bridgeRect() {
    return {
      x: roadX(BRIDGE_ROAD),
      y: CITY_H,
      w: ROAD,
      h: BAY_H,
    };
  }

  onBridge(x, y) {
    const b = this.bridgeRect();
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  inWater(x, y) {
    return y >= CITY_H && y < CITY_H + BAY_H && !this.onBridge(x, y);
  }

  isBlocked(x, y) {
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) {
      return true;
    }
    if (this.inWater(x, y)) {
      return true;
    }
    for (const b of this.buildings) {
      if (x > b.x + 1 && x < b.x + b.w - 1 && y > b.y + 1 && y < b.y + b.h - 1) {
        return true;
      }
    }
    return false;
  }

  daylight(minutes) {
    const t = (minutes - 360) / 720;
    if (t <= 0 || t >= 1) {
      return 0.16;
    }
    const sun = Math.sin(Math.PI * t);
    return 0.16 + 0.84 * Math.pow(sun, 0.7);
  }

  clockText(minutes) {
    const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return hh + ":" + mm;
  }
}
