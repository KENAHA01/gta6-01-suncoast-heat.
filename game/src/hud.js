// hud.js - the on-screen display: health, money, wanted stars, clock,
// objective and a small minimap. One job: read the game state and draw the
// interface on top of the world, in screen space.

export function drawHud(ctx, game, w, h) {
  const p = game.player;
  ctx.textBaseline = 'alphabetic';

  // Top-left: health bar and money.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 14, 220, 54);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('DARIO CRUZ', 24, 36);
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 44, 150, 12);
  ctx.fillStyle = p.health > 30 ? '#37b24d' : '#e03131';
  ctx.fillRect(24, 44, 150 * (p.health / 100), 12);
  ctx.fillStyle = '#ffd43b';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillText('$' + game.money, 186, 57);

  // Top-right: wanted stars and clock.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(w - 214, 14, 200, 54);
  ctx.font = 'bold 22px Arial, sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < game.wanted ? '★' : '☆';
  ctx.fillStyle = game.wanted > 0 ? '#ffd43b' : '#888888';
  ctx.fillText(stars, w - 204, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText(formatClock(game.hour), w - 204, 62);

  // Bottom-left: current objective.
  if (game.objective) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const ow = ctx.measureText(game.objective).width + 28;
    ctx.fillRect(14, h - 46, ow, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText(game.objective, 28, h - 24);
  }

  drawMinimap(ctx, game, w, h);
}

export function formatClock(hour) {
  const hh = Math.floor(hour) % 24;
  const mm = Math.floor((hour - Math.floor(hour)) * 60);
  const hhStr = hh < 10 ? '0' + hh : '' + hh;
  const mmStr = mm < 10 ? '0' + mm : '' + mm;
  return hhStr + ':' + mmStr;
}

// A small live map: district blocks, water, the player dot.
function drawMinimap(ctx, game, w, h) {
  const mw = 168;
  const mh = 126;
  const mx = w - mw - 14;
  const my = h - mh - 14;
  const sx = mw / game.city.width;
  const sy = mh / game.city.height;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#22262c';
  ctx.fillRect(mx, my, mw, mh);
  for (let i = 0; i < game.city.buildings.length; i++) {
    const b = game.city.buildings[i];
    ctx.fillStyle = '#9aa5ad';
    ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }
  const wt = game.city.water;
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(mx + wt.x * sx, my + wt.y * sy, wt.w * sx, wt.h * sy);
  const px = mx + game.player.x * sx;
  const py = my + game.player.y * sy;
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.stroke();
}
