// Solmarina Heat - game loop and state.
// Fixed-step 60 Hz simulation, per-axis collision, four game states.

import {
  VIEW_W,
  VIEW_H,
  WALK_SPEED,
  STEP,
  PLAYER_START,
  GAME_TITLE,
} from "./config.js";
import { City } from "./city.js";
import { Camera, drawWorld } from "./render.js";
import { drawHud, drawTitle, drawEnd } from "./hud.js";
import { Input } from "./input.js";
import { AudioSys } from "./audio.js";
import { stageShot } from "./shots.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const city = new City();
const cam = new Camera();
const input = new Input(canvas);
const audio = new AudioSys();

const state = {
  mode: "title",
  clock: 600,
  money: 1250,
  wanted: 0,
  objective: "Explore Solmarina",
  dialog: null,
  marker: null,
  muted: false,
  shot: null,
  player: {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    face: Math.PI / 2,
    health: 100,
    moving: false,
  },
  props: {
    cars: [],
  },
};

window.__game = state;
window.__city = city;
document.title = GAME_TITLE;

const params = new URLSearchParams(window.location.search);
const shotName = params.get("shot");
if (shotName) {
  state.shot = shotName;
  stageShot(state, city, shotName);
}

function playerBoxBlocked(px, py) {
  const half = 11;
  return (
    city.isBlocked(px - half, py - half) ||
    city.isBlocked(px + half, py - half) ||
    city.isBlocked(px - half, py + half) ||
    city.isBlocked(px + half, py + half)
  );
}

function movePlayer(dt) {
  const p = state.player;
  const axis = input.moveAxis();
  p.moving = axis.x !== 0 || axis.y !== 0;
  if (!p.moving) {
    return;
  }
  p.face = Math.atan2(axis.y, axis.x);
  const dx = axis.x * WALK_SPEED * dt;
  const dy = axis.y * WALK_SPEED * dt;
  if (!playerBoxBlocked(p.x + dx, p.y)) {
    p.x += dx;
  }
  if (!playerBoxBlocked(p.x, p.y + dy)) {
    p.y += dy;
  }
}

function update(dt) {
  if (state.mode === "playing") {
    movePlayer(dt);
    if (!state.shot) {
      state.clock += dt;
    }
    if (state.player.health <= 0) {
      state.mode = "wasted";
      state.dialog = null;
    }
  }
  cam.follow(state.player.x, state.player.y);
}

function render(timeMs) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.mode === "title") {
    const panX = state.player.x + Math.sin(timeMs / 9000) * 220;
    const panY = state.player.y + Math.cos(timeMs / 11000) * 120;
    cam.follow(panX, panY);
    drawWorld(ctx, city, cam, state, timeMs);
    drawTitle(ctx, timeMs);
    return;
  }
  drawWorld(ctx, city, cam, state, timeMs);
  drawHud(ctx, state, city);
  if (state.mode === "wasted" || state.mode === "busted") {
    drawEnd(ctx, state.mode);
  }
}

let last = performance.now();
let acc = 0;
let timeMs = 0;

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  timeMs += elapsed * 1000;
  acc += elapsed;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    update(STEP);
    acc -= STEP;
    steps += 1;
  }
  if (steps === 5) {
    acc = 0;
  }

  if (state.mode === "title") {
    if (input.wasPressed("Enter", " ") || input.clicked) {
      state.mode = "playing";
      audio.ensure();
      audio.confirm();
      audio.startPad();
    }
  } else if (state.mode === "wasted" || state.mode === "busted") {
    if (input.wasPressed("r", "R")) {
      state.mode = "title";
      state.player.x = PLAYER_START.x;
      state.player.y = PLAYER_START.y;
      state.player.health = 100;
      state.wanted = 0;
      state.dialog = null;
    }
  } else if (input.wasPressed("m", "M")) {
    state.muted = !state.muted;
    if (audio.master) {
      audio.master.gain.value = state.muted ? 0 : 0.5;
    }
  }

  render(timeMs);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
