// main.js - Solmarina Heat: game state, the fixed-step loop and the player.
// One job: own the loop (update at 60 Hz, render every frame), move the
// player on foot with collision, and advance the clock. Vehicles, traffic,
// police, combat and missions plug into this state on later days.

import { CONFIG } from './config.js';
import { generateCity } from './city.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Camera, drawWorld, drawPlayer, drawDaylight } from './render.js';
import { drawHud } from './hud.js';
import { applyShot, SHOT_NAMES } from './shots.js';

const STEP = 1 / 60;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = generateCity(CONFIG.seed);
    this.input = new Input(canvas);
    this.audio = new AudioSys();
    this.camera = new Camera();
    this.state = 'title'; // title | playing | wasted | busted
    this.player = {
      x: this.city.spawn.x,
      y: this.city.spawn.y,
      dir: -Math.PI / 2,
      health: 100,
      moving: false,
    };
    this.money = 250;
    this.wanted = 0;
    this.hour = CONFIG.startHour;
    this.objective = 'Explore Solmarina. Find work, stay out of trouble.';
    this.dialog = null; // {speaker, text} shown in a box, or null
    this.title = 'SOLMARINA HEAT';
    this.subtitle = 'A sun-soaked open-world story';
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = this.canvas.clientWidth || CONFIG.canvasWidth;
    const h = this.canvas.clientHeight || CONFIG.canvasHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.camera.resize(w, h);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.accumulator += dt;
      while (this.accumulator >= STEP) {
        this.update(STEP);
        this.accumulator -= STEP;
      }
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    // The clock always runs; the world only moves while playing.
    this.hour += (dt / CONFIG.dayLengthSeconds) * 24;
    if (this.hour >= 24) this.hour -= 24;
    if (this.state === 'title') {
      if (this.input.anyKey) {
        this.input.anyKey = false;
        this.audio.ensure();
        this.audio.click();
        this.state = 'playing';
      }
      return;
    }
    if (this.state !== 'playing') return;
    this.audio.ensure();
    const mv = this.input.moveVector();
    this.player.moving = mv.x !== 0 || mv.y !== 0;
    if (this.player.moving) {
      this.player.dir = Math.atan2(mv.y, mv.x);
      const nx = this.player.x + mv.x * CONFIG.walkSpeed * dt;
      const ny = this.player.y + mv.y * CONFIG.walkSpeed * dt;
      if (!this.city.isBlocked(nx, this.player.y, CONFIG.playerRadius)) {
        this.player.x = nx;
      }
      if (!this.city.isBlocked(this.player.x, ny, CONFIG.playerRadius)) {
        this.player.y = ny;
      }
    }
    this.camera.follow(this.player.x, this.player.y, this.city.width, this.city.height);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, w, h);
    drawWorld(ctx, this, this.camera);
    drawPlayer(ctx, this.player, this.camera);
    drawDaylight(ctx, this.hour, w, h);
    if (this.state === 'title') {
      this.drawTitle(ctx, w, h);
      return;
    }
    drawHud(ctx, this, w, h);
    if (this.dialog) this.drawDialog(ctx, w, h);
    if (this.state === 'wasted') this.drawEndCard(ctx, w, h, 'WASTED', '#e03131');
    if (this.state === 'busted') this.drawEndCard(ctx, w, h, 'BUSTED', '#1971c2');
  }

  drawTitle(ctx, w, h) {
    ctx.fillStyle = 'rgba(6,8,18,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd43b';
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.fillText(this.title, w / 2, h / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText(this.subtitle, w / 2, h / 2 + 8);
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = '#ced4da';
    ctx.fillText('Press any key to start', w / 2, h / 2 + 52);
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('WASD or arrows to walk  •  Explore the city', w / 2, h - 28);
    ctx.textAlign = 'left';
  }

  drawDialog(ctx, w, h) {
    const boxW = Math.min(640, w - 80);
    const boxH = 92;
    const x = (w - boxW) / 2;
    const y = h - boxH - 70;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillStyle = '#ffd43b';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText(this.dialog.speaker, x + 16, y + 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText(this.dialog.text, x + 16, y + 54);
  }

  drawEndCard(ctx, w, h, word, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.fillText(word, w / 2, h / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('Press any key to try again', w / 2, h / 2 + 48);
    ctx.textAlign = 'left';
  }
}

// Boot the game from index.html. ?shot=name stages a deterministic scene.
export function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot && SHOT_NAMES.includes(shot)) {
    applyShot(game, shot);
  }
  game.camera.follow(game.player.x, game.player.y, game.city.width, game.city.height);
  game.start();
  // Exposed for automated playtests; the game never reads this itself.
  window.__solmarina = game;
  return game;
}
