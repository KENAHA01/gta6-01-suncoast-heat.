// city.js - procedural Solmarina: four districts, streets, parks, a bay and a bridge.
// One job: build the whole city from the fixed seed and answer collision and
// district questions. Nothing here draws; render.js does that.

import { CONFIG } from './config.js';
import { makeRng, range, rangeInt, pick, chance } from './random.js';

export const DISTRICTS = [
  {
    id: 'marina',
    name: 'Marina Bay',
    ground: '#9aa5a8',
    road: '#3d4148',
    buildings: ['#7d8aa0', '#6b7c94', '#8fa3b8', '#5d6e84'],
    roof: '#4a5568',
    tall: true,
  },
  {
    id: 'palmetto',
    name: 'Palmetto Strip',
    ground: '#b5a88f',
    road: '#45403a',
    buildings: ['#d08a4e', '#c97e5a', '#e0a866', '#b56b45'],
    roof: '#7a4a2e',
    tall: false,
  },
  {
    id: 'brisas',
    name: 'Las Brisas',
    ground: '#8fae7a',
    road: '#3f4a3c',
    buildings: ['#e8dcc0', '#dcc9a3', '#f0e6cc', '#cbb98f'],
    roof: '#8a6b4a',
    tall: false,
  },
  {
    id: 'cannery',
    name: 'Old Cannery',
    ground: '#8d8578',
    road: '#3a3a38',
    buildings: ['#7a7268', '#6b655c', '#8a7f70', '#5f594f'],
    roof: '#4c463e',
    tall: false,
  },
];

const PITCH = CONFIG.blockSize + CONFIG.roadWidth; // 208
const COLS = 12;
const ROWS = 8;
const GRID_X = (CONFIG.cityWidth - COLS * PITCH) / 2; // 32
const GRID_Y = (CONFIG.cityHeight - ROWS * PITCH) / 2; // 24

// The bay runs along the south edge; the bridge crosses it to a small beach.
// The bridge sits on the central north-south road (road centre x = 1280).
const WATER_TOP = 1728;
const BEACH = { x: 1216, y: 1840, w: 128, h: 80 };
const BRIDGE = { x: 1256, y: WATER_TOP, w: 48, h: 112 };

export function generateCity(seed) {
  const rng = makeRng(seed);
  const city = {
    width: CONFIG.cityWidth,
    height: CONFIG.cityHeight,
    districts: DISTRICTS,
    buildings: [],
    parks: [],
    water: { x: 0, y: WATER_TOP, w: CONFIG.cityWidth, h: CONFIG.cityHeight - WATER_TOP },
    beach: BEACH,
    bridge: BRIDGE,
    grid: { x: GRID_X, y: GRID_Y, cols: COLS, rows: ROWS, pitch: PITCH },
  };

  const districtAtCell = (col, row) => {
    if (row < ROWS / 2) return col < COLS / 2 ? DISTRICTS[0] : DISTRICTS[1];
    return col < COLS / 2 ? DISTRICTS[2] : DISTRICTS[3];
  };

  // Two park blocks, one downtown and one residential.
  const parkCells = new Set(['3,1', '2,5']);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const district = districtAtCell(col, row);
      const bx = GRID_X + col * PITCH + CONFIG.roadWidth / 2;
      const by = GRID_Y + row * PITCH + CONFIG.roadWidth / 2;
      const bw = CONFIG.blockSize;
      const bh = CONFIG.blockSize;
      if (parkCells.has(col + ',' + row)) {
        const trees = [];
        const n = rangeInt(rng, 6, 9);
        for (let i = 0; i < n; i++) {
          trees.push({
            x: range(rng, bx + 16, bx + bw - 16),
            y: range(rng, by + 16, by + bh - 16),
            r: range(rng, 7, 12),
          });
        }
        city.parks.push({ x: bx, y: by, w: bw, h: bh, district: district.id, trees });
        continue;
      }
      const count = district.tall ? rangeInt(rng, 1, 2) : rangeInt(rng, 2, 3);
      for (let i = 0; i < count; i++) {
        const w = range(rng, 44, district.tall ? 90 : 70);
        const h = range(rng, 44, district.tall ? 110 : 70);
        const x = range(rng, bx + 6, bx + bw - w - 6);
        const y = range(rng, by + 6, by + bh - h - 6);
        city.buildings.push({
          x, y, w, h,
          color: pick(rng, district.buildings),
          roof: district.roof,
          hgt: district.tall ? rangeInt(rng, 10, 22) : rangeInt(rng, 3, 7),
          district: district.id,
        });
      }
    }
  }

  // Player starts on the central north-south road, mid-city.
  city.spawn = { x: GRID_X + 6 * PITCH, y: GRID_Y + 4 * PITCH };

  city.districtAt = (x, y) => {
    if (y >= WATER_TOP) return null;
    const col = Math.floor((x - GRID_X) / PITCH);
    const row = Math.floor((y - GRID_Y) / PITCH);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return districtAtCell(col, row);
  };

  // True when a circle at (x, y) with radius r cannot be there.
  city.isBlocked = (x, y, r) => {
    if (x - r < 0 || x + r > city.width || y - r < 0 || y + r > city.height) return true;
    if (y + r > WATER_TOP && y - r < CONFIG.cityHeight) {
      const onBridge = x + r > BRIDGE.x && x - r < BRIDGE.x + BRIDGE.w
        && y + r > BRIDGE.y && y - r < BRIDGE.y + BRIDGE.h;
      const onBeach = x + r > BEACH.x && x - r < BEACH.x + BEACH.w
        && y + r > BEACH.y && y - r < BEACH.y + BEACH.h;
      if (!onBridge && !onBeach) return true;
    }
    for (let i = 0; i < city.buildings.length; i++) {
      const b = city.buildings[i];
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  };

  return city;
}

// Daylight for a game hour (0-24). Returns a darkness overlay 0..1 and a tint.
export function daylight(hour) {
  if (hour >= 7 && hour < 17) return { darkness: 0, tint: null };
  if (hour >= 17 && hour < 19) {
    const f = (hour - 17) / 2;
    return { darkness: 0.18 * f, tint: 'rgba(255,140,60,0.10)' };
  }
  if (hour >= 19 || hour < 5) return { darkness: 0.42, tint: null };
  const f = (hour - 5) / 2;
  return { darkness: 0.42 * (1 - f), tint: 'rgba(255,170,90,0.06)' };
}
