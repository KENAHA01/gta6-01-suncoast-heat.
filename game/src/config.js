// config.js - constants for Solmarina Heat: canvas, world, seed and tuning.
// One job: hold every magic number so the rest of the game reads plainly.

export const CONFIG = {
  // Fixed world seed. Same seed, same city, same screenshots every run.
  seed: 20261118,
  // Canvas is sized to the window at runtime; these are the design values.
  canvasWidth: 1280,
  canvasHeight: 720,
  // City dimensions in world units.
  cityWidth: 2560,
  cityHeight: 1920,
  // Street grid: blocks are square, roads run between them.
  blockSize: 160,
  roadWidth: 48,
  // Player on foot.
  playerRadius: 14,
  walkSpeed: 190,
  // Game clock: one full day lasts this many real seconds.
  dayLengthSeconds: 240,
  // Clock starts at 10:00 on a sunny morning.
  startHour: 10,
};
