// shots.js - deterministic staged scenes for screenshots.
// One job: given a shot name from ?shot=, place the player, set the time,
// the wanted level and the dialog so the scene renders the same every run.
// The game reads these scenes at boot; normal play never calls this file.

export const SHOT_NAMES = ['title', 'chase', 'mission', 'wasted'];

export function applyShot(game, name) {
  const city = game.city;
  if (name === 'title') {
    // Morning light over the marina, title card on top.
    game.state = 'title';
    game.hour = 10;
    game.player.x = city.spawn.x;
    game.player.y = city.spawn.y;
    game.wanted = 0;
    game.dialog = null;
    return;
  }
  if (name === 'chase') {
    // Golden hour on the Palmetto Strip, two stars, mid-pursuit.
    game.state = 'playing';
    game.hour = 17.6;
    game.player.x = city.grid.x + 8 * city.grid.pitch;
    game.player.y = city.grid.y + 2 * city.grid.pitch;
    game.player.dir = 0;
    game.wanted = 2;
    game.money = 1480;
    game.objective = 'Lose the patrol. Reach the Las Brisas safehouse.';
    game.dialog = null;
    return;
  }
  if (name === 'mission') {
    // Midday at the marina, a contact waiting with a job.
    game.state = 'playing';
    game.hour = 12.5;
    game.player.x = city.grid.x + 3 * city.grid.pitch;
    game.player.y = city.grid.y + 1 * city.grid.pitch + 60;
    game.player.dir = Math.PI / 2;
    game.wanted = 0;
    game.money = 250;
    game.objective = 'Mission 1: Meet Marisol at the marina cafe.';
    game.dialog = {
      speaker: 'MARISOL',
      text: 'Dario, the courier job pays five hundred. No questions, no cops.',
    };
    return;
  }
  if (name === 'wasted') {
    // Night in the Old Cannery, the run ends.
    game.state = 'wasted';
    game.hour = 22;
    game.player.x = city.grid.x + 9 * city.grid.pitch;
    game.player.y = city.grid.y + 6 * city.grid.pitch;
    game.player.health = 0;
    game.wanted = 3;
    game.money = 60;
    game.objective = 'Mission 1: Meet Marisol at the marina cafe.';
    game.dialog = null;
  }
}
