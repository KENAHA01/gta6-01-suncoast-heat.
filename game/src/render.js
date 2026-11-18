// Solmarina Heat - camera and world drawing.
// Top-down: ground, roads, buildings, water, bridge, props, player, night.

import {
  VIEW_W,
  VIEW_H,
  WORLD_W,
  WORLD_H,
  BLOCK,
  ROAD,
  CELL,
  COLS,
  ROWS,
  CITY_W,
  CITY_H,
  BAY_H,
  BEACH_H,
  DISTRICTS,
  WATER,
  WATER_DEEP,
  SAND,
  ROAD_COLOR,
  ROAD_LINE,
  blockX,
  blockY,
  roadX,
  roadY,
} from "./config.js";
import { drawVehicle } from "./vehicles.js";
import { drawPedestrian } from "./pedestrians.js";

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
  }

  follow(px, py) {
    const maxX = Math.max(0, WORLD_W - VIEW_W);
    const maxY = Math.max(0, WORLD_H - VIEW_H);
    this.x = Math.min(maxX, Math.max(0, px - VIEW_W / 2));
    this.y = Math.min(maxY, Math.max(0, py - VIEW_H / 2));
  }
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function drawWorld(ctx, city, cam, state, timeMs) {
  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  ctx.fillStyle = "#5d6b52";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (const d of DISTRICTS) {
    const x0 = blockX(d.col0) - ROAD;
    const y0 = blockY(d.row0) - ROAD;
    const x1 = blockX(d.col1) + BLOCK + ROAD;
    const y1 = blockY(d.row1) + BLOCK + ROAD;
    ctx.fillStyle = d.ground;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  ctx.fillStyle = ROAD_COLOR;
  for (let k = 0; k <= COLS; k += 1) {
    ctx.fillRect(roadX(k), 0, ROAD, CITY_H);
  }
  for (let k = 0; k <= ROWS; k += 1) {
    ctx.fillRect(0, roadY(k), CITY_W, ROAD);
  }

  ctx.strokeStyle = ROAD_LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (let k = 0; k <= COLS; k += 1) {
    const x = roadX(k) + ROAD / 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CITY_H);
    ctx.stroke();
  }
  for (let k = 0; k <= ROWS; k += 1) {
    const y = roadY(k) + ROAD / 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CITY_W, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const d of DISTRICTS) {
    const cx = (blockX(d.col0) + blockX(d.col1) + BLOCK) / 2;
    const cy = (blockY(d.row0) + blockY(d.row1) + BLOCK) / 2;
    ctx.fillStyle = "rgba(20, 20, 20, 0.28)";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.name.toUpperCase(), cx, cy);
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (city.isPark(col, row)) {
        ctx.fillStyle = "#6da34f";
        ctx.fillRect(blockX(col), blockY(row), BLOCK, BLOCK);
      }
    }
  }

  ctx.fillStyle = WATER_DEEP;
  ctx.fillRect(0, CITY_H, CITY_W, BAY_H);
  ctx.fillStyle = WATER;
  ctx.fillRect(0, CITY_H + 8, CITY_W, BAY_H - 16);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i += 1) {
    const x = 80 + i * 200;
    const y = CITY_H + 40 + (i % 3) * 70;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 46, y);
    ctx.stroke();
  }

  const b = city.bridgeRect();
  ctx.fillStyle = "#8a7a5c";
  ctx.fillRect(b.x - 6, b.y, b.w + 12, b.h);
  ctx.fillStyle = ROAD_COLOR;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = ROAD_LINE;
  ctx.setLineDash([14, 16]);
  ctx.beginPath();
  ctx.moveTo(b.x + b.w / 2, b.y);
  ctx.lineTo(b.x + b.w / 2, b.y + b.h);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = SAND;
  ctx.fillRect(0, CITY_H + BAY_H, CITY_W, BEACH_H);

  for (const t of city.trees) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(t.x + 3, t.y + 4, t.r, t.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f7a3d";
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4c9a4f";
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bd of city.buildings) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(bd.x + 5, bd.y + 6, bd.w, bd.h);
    ctx.fillStyle = bd.color;
    ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.fillRect(bd.x + 6, bd.y + 6, bd.w - 12, bd.h - 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.20)";
    ctx.fillRect(bd.x + 6, bd.y + 6, bd.w - 12, 5);
  }

  if (state.marker) {
    const pulse = 0.6 + 0.4 * Math.sin(timeMs / 280);
    ctx.fillStyle = "rgba(255, 214, 64, " + pulse.toFixed(2) + ")";
    const mx = state.marker.x;
    const my = state.marker.y;
    ctx.beginPath();
    ctx.moveTo(mx, my - 16);
    ctx.lineTo(mx + 12, my);
    ctx.lineTo(mx, my + 16);
    ctx.lineTo(mx - 12, my);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 214, 64, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 22 + 6 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const car of state.props.cars) {
    drawVehicle(ctx, car);
  }

  if (state.peds) {
    for (const ped of state.peds.list) {
      drawPedestrian(ctx, ped);
    }
  }

  if (!state.driving) {
    drawPlayer(ctx, state.player);
  }

  const light = city.daylight(state.clock);
  if (light < 0.98) {
    ctx.fillStyle = "rgba(8, 12, 42, " + ((1 - light) * 0.5).toFixed(3) + ")";
    ctx.fillRect(cam.x, cam.y, VIEW_W, VIEW_H);
  }

  ctx.restore();
}

function drawPlayer(ctx, p) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(p.x + 2, p.y + 5, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e4572e";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c79b";
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.face) * 4, p.y + Math.sin(p.face) * 4, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#20242a";
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.face) * 4, p.y + Math.sin(p.face) * 4 - 2, 6.5, Math.PI, Math.PI * 2);
  ctx.fill();
}
