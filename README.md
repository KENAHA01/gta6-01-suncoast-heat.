# Solmarina Heat

An original open-world crime game built for make.fun's "Make GTA 6" bounty
(gta6-01). Canvas 2D, top-down, procedural city, no external assets, no
network. Open `game/index.html` in desktop Chrome and play.

## The game

Solmarina is a sun-soaked coastal city with four districts (Marina Bay,
Palmetto Strip, Las Brisas, Old Cannery), a park, a bay with a bridge and a
beach, and a full day-night cycle. You play Dario Cruz, a driver looking for
work. Walk the streets with WASD or arrow keys, watch your health, money,
wanted stars and the clock, and follow the objective.

## Controls

- WASD / arrow keys: walk
- Any key on the title screen: start

## Build

`node main.ts` copies `game/` and `screenshots/` into `MAKEFUN_OUTPUT_DIR`
and writes `dossier.json` there (Node 22, standard library only).

## Screenshots

Staged renders are captured from the game itself with
`game/src/shots.js` (`?shot=chase|title|mission|wasted`).
