// Solmarina Heat - game loop and state.
// Fixed-step 60 Hz simulation, per-axis collision, four game states.

import {
  VIEW_W,
  VIEW_H,
  WALK_SPEED,
  STEP,
  PLAYER_START,
  GAME_TITLE,
  TRAFFIC_COUNT,
  PED_COUNT,
} from "./config.js";
import { City } from "./city.js";
import { Camera, drawWorld } from "./render.js";
import { drawHud, drawTitle, drawEnd } from "./hud.js";
import { Input } from "./input.js";
import { AudioSys } from "./audio.js";
import { stageShot } from "./shots.js";
import { makeVehicle, updateVehicle, nearestVehicle } from "./vehicles.js";
import { TrafficManager } from "./traffic.js";
import { PedestrianManager } from "./pedestrians.js";

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
  driving: null,
  nearCar: false,
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

const traffic = new TrafficManager(city, state.props.cars);
const peds = new PedestrianManager(city);
state.traffic = traffic;
state.peds = peds;

window.__game = state;
window.__city = city;
document.title = GAME_TITLE;

const params = new URLSearchParams(window.location.search);
const shotName = params.get("shot");
if (shotName) {
  state.shot = shotName;
  stageShot(state, city, shotName);
}

if (!state.shot) {
  const parked = [
    makeVehicle("sedan", 490, 300, 0, "parked"),
    makeVehicle("pickup", 540, 340, Math.PI / 2, "parked"),
    makeVehicle("taxi", 1660, 1080, 0, "parked"),
    makeVehicle("van", 1710, 1120, Math.PI, "parked"),
    makeVehicle("sports", 400, 1920, 0, "parked"),
    makeVehicle("sedan", 1800, 1920, Math.PI, "parked"),
  ];
  for (const car of parked) {
    state.props.cars.push(car);
  }
  traffic.spawnInitial(TRAFFIC_COUNT);
  peds.spawnInitial(PED_COUNT);
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

function driveCar(dt) {
  const car = state.driving;
  const axis = input.moveAxis();
  const ctl = {
    throttle: input.down("w", "W", "ArrowUp"),
    brake: input.down("s", "S", "ArrowDown"),
    steer: axis.x,
  };
  updateVehicle(car, ctl, dt, city, state.props.cars);
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.face = car.angle;
}

function tryEnterCar() {
  const car = nearestVehicle(state.player.x, state.player.y, state.props.cars, 55);
  if (!car) {
    return;
  }
  if (car.kind === "traffic") {
    traffic.onStolen(car, state.player.x, state.player.y);
  }
  car.kind = "driven";
  car.speed = 0;
  car.vx = 0;
  car.vy = 0;
  state.driving = car;
  state.player.moving = false;
  state.nearCar = false;
  state.objective = "Drive the " + car.name;
  audio.ensure();
  audio.blip(520, 0.08, "square", 0.05);
}

function exitCar() {
  const car = state.driving;
  const px = state.player.x;
  const py = state.player.y;
  const spots = [
    [Math.cos(car.angle + Math.PI / 2), Math.sin(car.angle + Math.PI / 2)],
    [Math.cos(car.angle - Math.PI / 2), Math.sin(car.angle - Math.PI / 2)],
    [Math.cos(car.angle), Math.sin(car.angle)],
    [-Math.cos(car.angle), -Math.sin(car.angle)],
  ];
  let placed = false;
  for (const s of spots) {
    const nx = car.x + s[0] * 36;
    const ny = car.y + s[1] * 36;
    if (!playerBoxBlocked(nx, ny)) {
      state.player.x = nx;
      state.player.y = ny;
      placed = true;
      break;
    }
  }
  if (!placed) {
    state.player.x = px;
    state.player.y = py;
  }
  car.kind = "parked";
  car.speed = 0;
  car.vx = 0;
  car.vy = 0;
  state.driving = null;
  state.player.face = car.angle;
  state.objective = "Explore Solmarina";
  audio.blip(330, 0.08, "square", 0.05);
}

function update(dt) {
  if (state.mode === "playing") {
    if (state.driving) {
      driveCar(dt);
    } else {
      movePlayer(dt);
      state.nearCar = !!nearestVehicle(state.player.x, state.player.y, state.props.cars, 55);
    }
    if (!state.shot) {
      traffic.update(dt, state.player, state.driving);
      peds.update(dt, state.props.cars, state.driving ? null : state.player);
    }
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
  } else if (input.wasPressed("e", "E")) {
    if (state.driving) {
      exitCar();
    } else {
      tryEnterCar();
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
