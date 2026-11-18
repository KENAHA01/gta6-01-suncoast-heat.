// render.js - camera and world drawing for Solmarina Heat.
// One job: turn the city, the player and the time of day into pixels on the
// canvas. No game logic lives here, only drawing.

import { CONFIG } from './config.js';
import { daylight } from './city.js';

// A viewport into the world that follows a point and stays inside the city.
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = CONFIG.canvasWidth;
    this.h = CONFIG.canvasHeight;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
  }

  follow(px, py, cityW, cityH) {
    this.x = px - this.w / 2;
    this.y = py - this.h / 2;
    if (this.x < 0) this.x = 0;
    if (this.y < 0) this.y = 0;
    if (this.x > cityW - this.w) this.x = Math.max(0, cityW - this.w);
    if (this.y > cityH - this.h) this.y = Math.max(0, cityH - this.h);
  }
}

function drawRoads(ctx, city, cam) {
  const g = city.grid;
  const rw = CONFIG.roadWidth;
  ctx.fillStyle = '#33363d';
  // Vertical roads.
  for (let k = 0; k <= g.cols; k++) {
    const x = g.x + k * g.pitch - rw / 2;
    ctx.fillRect(x - cam.x, 0 - cam.y, rw, city.height);
  }
  // Horizontal roads.
  for (let k = 0; k <= g.rows; k++) {
    const y = g.y + k * g.pitch - rw / 2;
    ctx.fillRect(0 - cam.x, y - cam.y, city.width, rw);
  }
  // Centre dashes on the roads.
  ctx.fillStyle = 'rgba(240,230,180,0.75)';
  for (let k = 0; k <= g.cols; k++) {
    const x = g.x + k * g.pitch;
    for (let y = 0; y < city.height; y += 44) {
      ctx.fillRect(x - 2 - cam.x, y - cam.y, 4, 22);
    }
  }
  for (let k = 0; k <= g.rows; k++) {
    const y = g.y + k * g.pitch;
    for (let x = 0; x < city.width; x += 44) {
      ctx.fillRect(x - cam.x, y - 2 - cam.y, 22, 4);
    }
  }
}

function drawBuildings(ctx, city, cam) {
  for (let i = 0; i < city.buildings.length; i++) {
    const b = city.buildings[i];
    // Fake height: a soft shadow offset down-right, then the roof.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + b.hgt * 0.4 - cam.x, b.y + b.hgt * 0.6 - cam.y, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4 - cam.x, b.y + 4 - cam.y, b.w - 8, b.h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + 4 - cam.x, b.y + 4 - cam.y, b.w - 8, 5);
  }
}

function drawParks(ctx, city, cam) {
  for (let i = 0; i < city.parks.length; i++) {
    const p = city.parks[i];
    ctx.fillStyle = '#5d8a4a';
    ctx.fillRect(p.x - cam.x, p.y - cam.y, p.w, p.h);
    ctx.fillStyle = '#6f9e57';
    ctx.fillRect(p.x + 6 - cam.x, p.y + 6 - cam.y, p.w - 12, p.h - 12);
    for (let j = 0; j < p.trees.length; j++) {
      const t = p.trees[j];
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(t.x + 3 - cam.x, t.y + 4 - cam.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f6b2f';
      ctx.beginPath();
      ctx.arc(t.x - cam.x, t.y - cam.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f8a3f';
      ctx.beginPath();
      ctx.arc(t.x - 2 - cam.x, t.y - 2 - cam.y, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWater(ctx, city, cam) {
  const w = city.water;
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(w.x - cam.x, w.y - cam.y, w.w, w.h);
  ctx.fillStyle = '#3a93bf';
  for (let y = w.y + 12; y < w.y + w.h; y += 26) {
    for (let x = 8; x < w.w; x += 74) {
      ctx.fillRect(x - cam.x, y - cam.y, 34, 3);
    }
  }
  // Beach sand and a few palms.
  const b = city.beach;
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
  ctx.fillStyle = '#2f6b2f';
  ctx.beginPath(); ctx.arc(b.x + 22 - cam.x, b.y + 22 - cam.y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(b.x + b.w - 22 - cam.x, b.y + 26 - cam.y, 9, 0, Math.PI * 2); ctx.fill();
  // Bridge planks over the bay.
  const br = city.bridge;
  ctx.fillStyle = '#8a6b4a';
  ctx.fillRect(br.x - cam.x, br.y - cam.y, br.w, br.h);
  ctx.fillStyle = '#a8845c';
  for (let y = br.y + 4; y < br.y + br.h; y += 14) {
    ctx.fillRect(br.x + 3 - cam.x, y - cam.y, br.w - 6, 8);
  }
}

// Draw the whole world in camera space.
export function drawWorld(ctx, game, cam) {
  const city = game.city;
  const g = city.grid;
  // District ground colours, quadrant by quadrant.
  ctx.fillStyle = '#7e8891';
  ctx.fillRect(0 - cam.x, 0 - cam.y, city.width, city.height);
  const midX = g.x + 6 * g.pitch;
  const midY = g.y + 4 * g.pitch;
  ctx.fillStyle = city.districts[0].ground;
  ctx.fillRect(0 - cam.x, 0 - cam.y, midX, midY);
  ctx.fillStyle = city.districts[1].ground;
  ctx.fillRect(midX - cam.x, 0 - cam.y, city.width - midX, midY);
  ctx.fillStyle = city.districts[2].ground;
  ctx.fillRect(0 - cam.x, midY - cam.y, midX, city.height - midY);
  ctx.fillStyle = city.districts[3].ground;
  ctx.fillRect(midX - cam.x, midY - cam.y, city.width - midX, city.height - midY);
  drawRoads(ctx, city, cam);
  drawParks(ctx, city, cam);
  drawWater(ctx, city, cam);
  drawBuildings(ctx, city, cam);
}

// Draw the player: a small figure with a facing tick.
export function drawPlayer(ctx, player, cam) {
  const x = player.x - cam.x;
  const y = player.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 5, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b13c';
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.playerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242a';
  ctx.beginPath();
  ctx.arc(x, y - 3, 7, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = '#20242a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(player.dir) * 20, y + Math.sin(player.dir) * 20);
  ctx.stroke();
}

// Day-night overlay across the whole screen.
export function drawDaylight(ctx, hour, w, h) {
  const light = daylight(hour);
  if (light.tint) {
    ctx.fillStyle = light.tint;
    ctx.fillRect(0, 0, w, h);
  }
  if (light.darkness > 0) {
    ctx.fillStyle = 'rgba(8,10,38,' + light.darkness.toFixed(3) + ')';
    ctx.fillRect(0, 0, w, h);
  }
}
