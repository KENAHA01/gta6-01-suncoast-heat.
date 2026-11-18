// Solmarina Heat - shared constants.
// One fixed seed drives the whole city so every screenshot matches.

export const GAME_TITLE = "Solmarina Heat";
export const SEED = 20261118;

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const BLOCK = 150;
export const ROAD = 46;
export const COLS = 12;
export const ROWS = 8;
export const CELL = BLOCK + ROAD;

export const CITY_W = COLS * CELL + ROAD;
export const CITY_H = ROWS * CELL + ROAD;
export const BAY_H = 260;
export const BEACH_H = 120;
export const WORLD_W = CITY_W;
export const WORLD_H = CITY_H + BAY_H + BEACH_H;

export const WALK_SPEED = 190;
export const STEP = 1 / 60;

export const TRAFFIC_COUNT = 10;
export const PED_COUNT = 18;

export const BRIDGE_ROAD = 6;

export const PARKS = [
  { col: 2, row: 1 },
  { col: 8, row: 5 },
];

export const DISTRICTS = [
  {
    id: "marina",
    name: "Marina Bay",
    col0: 0,
    col1: 5,
    row0: 0,
    row1: 3,
    ground: "#9fc7b4",
    buildings: ["#f4efe4", "#cfe3ea", "#8fb8c9", "#e8d9a8"],
    accent: "#2e7f9e",
  },
  {
    id: "palmetto",
    name: "Palmetto Strip",
    col0: 6,
    col1: 11,
    row0: 0,
    row1: 3,
    ground: "#e8c98f",
    buildings: ["#ff9e7d", "#ffd166", "#5ec8c0", "#f7f3e8"],
    accent: "#e4572e",
  },
  {
    id: "brisas",
    name: "Las Brisas",
    col0: 0,
    col1: 5,
    row0: 4,
    row1: 7,
    ground: "#a8c98a",
    buildings: ["#f2e3c6", "#d98f5f", "#c96f4a", "#efe6d0"],
    accent: "#4a7c59",
  },
  {
    id: "cannery",
    name: "Old Cannery",
    col0: 6,
    col1: 11,
    row0: 4,
    row1: 7,
    ground: "#b0a696",
    buildings: ["#8a7f72", "#a4553f", "#6e6258", "#c2b49a"],
    accent: "#7a3b2e",
  },
];

export const WATER = "#2f7fae";
export const WATER_DEEP = "#1f5f8a";
export const SAND = "#ecd9a0";
export const ROAD_COLOR = "#3c3a38";
export const ROAD_LINE = "#d8c95a";

export const PLAYER_START = { x: 620, y: 480 };
export const MARINA_MARKER = { x: 620, y: 300 };

export function blockX(col) {
  return ROAD + col * CELL;
}

export function blockY(row) {
  return ROAD + row * CELL;
}

export function roadX(k) {
  return k * CELL;
}

export function roadY(k) {
  return k * CELL;
}

export function districtAt(col, row) {
  for (const d of DISTRICTS) {
    if (col >= d.col0 && col <= d.col1 && row >= d.row0 && row <= d.row1) {
      return d;
    }
  }
  return DISTRICTS[0];
}
