// Solmarina Heat - deterministic staged scenes for screenshots.
// Loaded with ?shot=chase, ?shot=title, ?shot=mission or ?shot=wasted.
// Each scene fixes the clock, the player spot, the wanted level and the
// dialog so the same URL always renders the same picture.

import { MARINA_MARKER } from "./config.js";

export function stageShot(state, city, name) {
  const p = state.player;
  state.props.cars = [];
  state.marker = null;
  state.dialog = null;

  if (name === "title") {
    state.mode = "title";
    state.clock = 1020;
    state.wanted = 0;
    state.objective = "Explore Solmarina";
    return;
  }

  if (name === "chase") {
    state.mode = "playing";
    state.clock = 1020;
    state.wanted = 3;
    state.money = 3420;
    state.objective = "Lose the heat";
    p.x = 1250;
    p.y = 415;
    p.face = 0;
    p.health = 68;
    state.props.cars = [
      { x: 1400, y: 415, angle: 0, color: "#e4572e", police: false },
      { x: 1060, y: 415, angle: 0, color: "#1d3557", police: true },
      { x: 880, y: 415, angle: 0, color: "#1d3557", police: true },
    ];
    return;
  }

  if (name === "mission") {
    state.mode = "playing";
    state.clock = 600;
    state.wanted = 0;
    state.money = 1250;
    state.objective = "Meet Marisol at the marina";
    p.x = 620;
    p.y = 380;
    p.face = -Math.PI / 2;
    p.health = 100;
    state.marker = { x: MARINA_MARKER.x, y: MARINA_MARKER.y };
    state.dialog = {
      speaker: "Marisol",
      text: "Dario, the drop is at the old cannery. Do not keep me waiting, and do not bring the heat with you.",
    };
    return;
  }

  if (name === "wasted") {
    state.mode = "wasted";
    state.clock = 780;
    state.wanted = 2;
    state.money = 860;
    state.objective = "Lose the heat";
    p.x = 900;
    p.y = 600;
    p.face = Math.PI / 2;
    p.health = 0;
    return;
  }

  state.mode = "title";
  state.clock = 1020;
}
