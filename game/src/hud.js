// Solmarina Heat - HUD: health, money, wanted stars, clock, objective,
// live minimap, dialog box, title screen and end screens.

import {
  VIEW_W,
  VIEW_H,
  WORLD_W,
  WORLD_H,
  CITY_H,
  BAY_H,
  BEACH_H,
  DISTRICTS,
  GAME_TITLE,
  blockX,
  blockY,
} from "./config.js";

export function drawHud(ctx, state, city) {
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(10, 12, 14, 0.55)";
  ctx.fillRect(16, 14, 230, 64);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText("HEALTH", 28, 34);
  ctx.fillStyle = "#222";
  ctx.fillRect(96, 22, 132, 14);
  const hp = Math.max(0, state.player.health) / 100;
  ctx.fillStyle = hp > 0.5 ? "#58c96b" : hp > 0.25 ? "#f2b705" : "#e5484d";
  ctx.fillRect(96, 22, 132 * hp, 14);

  ctx.fillStyle = "#7ee787";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText("$ " + state.money.toLocaleString("en-US"), 28, 62);
  ctx.fillStyle = "#cfd6dd";
  ctx.font = "13px Arial, sans-serif";
  if (state.driving) {
    const kmh = Math.round(Math.abs(state.driving.speed) * 0.36);
    ctx.fillText(state.driving.name + "  •  " + kmh + " km/h", 150, 62);
  } else {
    ctx.fillText("Fists", 150, 62);
  }

  ctx.fillStyle = "rgba(10, 12, 14, 0.55)";
  ctx.fillRect(VIEW_W - 246, 14, 230, 64);
  ctx.font = "26px Arial, sans-serif";
  ctx.textAlign = "center";
  let stars = "";
  for (let i = 0; i < 5; i += 1) {
    stars += i < state.wanted ? "★" : "☆";
  }
  ctx.fillStyle = state.wanted > 0 ? "#ffd640" : "#8a939c";
  ctx.fillText(stars, VIEW_W - 131, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText(city.clockText(state.clock), VIEW_W - 131, 68);
  ctx.textAlign = "left";

  if (state.objective) {
    ctx.font = "bold 15px Arial, sans-serif";
    const w = ctx.measureText(state.objective).width + 32;
    ctx.fillStyle = "rgba(10, 12, 14, 0.6)";
    ctx.fillRect(16, VIEW_H - 44, w, 30);
    ctx.fillStyle = "#ffd640";
    ctx.fillText("◆ " + state.objective, 32, VIEW_H - 23);
  }

  if (state.mode === "playing") {
    const prompt = state.driving ? "E - Exit car" : state.nearCar ? "E - Steal car" : null;
    if (prompt) {
      ctx.font = "bold 15px Arial, sans-serif";
      const w = ctx.measureText(prompt).width + 28;
      ctx.fillStyle = "rgba(10, 12, 14, 0.65)";
      ctx.fillRect((VIEW_W - w) / 2, VIEW_H - 84, w, 30);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(prompt, VIEW_W / 2, VIEW_H - 63);
      ctx.textAlign = "left";
    }
  }

  drawMinimap(ctx, state, city);

  if (state.dialog) {
    const boxH = 92;
    const boxY = VIEW_H - 150;
    const boxW = 640;
    ctx.fillStyle = "rgba(8, 10, 12, 0.82)";
    ctx.fillRect(180, boxY, boxW, boxH);
    ctx.strokeStyle = "#ffd640";
    ctx.lineWidth = 2;
    ctx.strokeRect(180, boxY, boxW, boxH);
    ctx.fillStyle = "#ffd640";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText(state.dialog.speaker, 200, boxY + 26);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial, sans-serif";
    wrapText(ctx, state.dialog.text, 200, boxY + 52, boxW - 40, 22);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, yy);
  }
}

function drawMinimap(ctx, state, city) {
  const scale = 0.08;
  const mw = WORLD_W * scale;
  const mh = WORLD_H * scale;
  const ox = VIEW_W - mw - 16;
  const oy = VIEW_H - mh - 16;

  ctx.fillStyle = "rgba(8, 10, 12, 0.75)";
  ctx.fillRect(ox - 5, oy - 5, mw + 10, mh + 10);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, mw, mh);
  ctx.clip();

  for (const d of DISTRICTS) {
    const x0 = blockX(d.col0) - 46;
    const y0 = blockY(d.row0) - 46;
    const x1 = blockX(d.col1) + 150 + 46;
    const y1 = blockY(d.row1) + 150 + 46;
    ctx.fillStyle = d.ground;
    ctx.fillRect(ox + x0 * scale, oy + y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale);
  }

  ctx.fillStyle = "#2f7fae";
  ctx.fillRect(ox, oy + CITY_H * scale, mw, BAY_H * scale);
  ctx.fillStyle = "#ecd9a0";
  ctx.fillRect(ox, oy + (CITY_H + BAY_H) * scale, mw, BEACH_H * scale);

  ctx.fillStyle = "rgba(20, 20, 20, 0.55)";
  for (const b of city.buildings) {
    ctx.fillRect(ox + b.x * scale, oy + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  }

  for (const car of state.props.cars) {
    if (car.kind === "driven") {
      ctx.fillStyle = "#ffd640";
    } else if (car.kind === "traffic") {
      ctx.fillStyle = "#7ec8f7";
    } else {
      ctx.fillStyle = "#9aa5ad";
    }
    ctx.fillRect(ox + car.x * scale - 1.5, oy + car.y * scale - 1.5, 3, 3);
  }

  if (state.marker) {
    ctx.fillStyle = "#ffd640";
    ctx.beginPath();
    ctx.arc(ox + state.marker.x * scale, oy + state.marker.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const px = ox + state.player.x * scale;
  const py = oy + state.player.y * scale;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 5, oy - 5, mw + 10, mh + 10);
}

export function drawTitle(ctx, timeMs) {
  ctx.save();
  ctx.fillStyle = "rgba(6, 10, 18, 0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  const bob = Math.sin(timeMs / 600) * 6;
  ctx.fillStyle = "#ffd640";
  ctx.font = "bold 84px Arial, sans-serif";
  ctx.fillText("SOLMARINA", VIEW_W / 2, 250 + bob);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 84px Arial, sans-serif";
  ctx.fillText("HEAT", VIEW_W / 2, 340 + bob);
  ctx.fillStyle = "#ffb3a0";
  ctx.font = "20px Arial, sans-serif";
  ctx.fillText("A sun-soaked open-world crime story", VIEW_W / 2, 392);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial, sans-serif";
  const blink = Math.floor(timeMs / 500) % 2 === 0;
  if (blink) {
    ctx.fillText("Press ENTER or click to start", VIEW_W / 2, 480);
  }
  ctx.font = "16px Arial, sans-serif";
  ctx.fillStyle = "#cfd6dd";
  ctx.fillText("WASD / arrows to walk  •  E to steal a car  •  M to mute", VIEW_W / 2, 530);
  ctx.fillText("Dario Cruz  •  Marisol  •  Marina Bay  •  Palmetto Strip", VIEW_W / 2, 560);
  ctx.restore();
}

export function drawEnd(ctx, kind) {
  ctx.save();
  ctx.fillStyle = kind === "wasted" ? "rgba(90, 10, 10, 0.55)" : "rgba(10, 20, 60, 0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 92px Arial, sans-serif";
  ctx.fillText(kind === "wasted" ? "WASTED" : "BUSTED", VIEW_W / 2, 330);
  ctx.font = "20px Arial, sans-serif";
  ctx.fillStyle = "#e8e8e8";
  ctx.fillText(
    kind === "wasted"
      ? "Dario went down. The city keeps moving."
      : "The Solmarina PD caught up with Dario.",
    VIEW_W / 2,
    390,
  );
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillStyle = "#ffd640";
  ctx.fillText("Press R to try again", VIEW_W / 2, 460);
  ctx.restore();
}
