# Solmarina Heat

An original open-world crime game in the spirit of GTA 6, built for the
make.fun gta6-01 bounty. It runs in a desktop browser from its own static
files, played with keyboard and mouse. No network, no external assets, no
build step: every pixel is drawn by code.

## The game

Dario Cruz comes home to Solmarina, a sun-soaked coastal city of four
districts: Marina Bay, the Palmetto Strip, Las Brisas and the Old Cannery.
Walk the streets, cross the bridge to the beach, take jobs from Marisol,
and stay ahead of the Solmarina PD as the wanted level climbs.

Day 1 covers the skeleton: a procedural city from a fixed seed, camera,
walking with collision, a HUD with health, money, wanted stars, clock and a
live minimap, a title screen, wasted and busted states, and deterministic
screenshot scenes.

## Play

```text
node serve: any static server over game/
# example: python3 -m http.server 8080 --directory game
```

Open http://localhost:8080, press Enter, walk with WASD or the arrow keys.

Screenshots are staged with `?shot=chase`, `?shot=title`, `?shot=mission`
or `?shot=wasted`.

## Layout

- `game/index.html` - the page and canvas
- `game/src/config.js` - constants, districts, fixed seed
- `game/src/random.js` - seeded RNG
- `game/src/input.js` - keyboard and mouse
- `game/src/audio.js` - synthetic WebAudio
- `game/src/city.js` - procedural city, collision, day and night
- `game/src/render.js` - camera and world drawing
- `game/src/hud.js` - HUD, minimap, dialog, title and end screens
- `game/src/main.js` - fixed-step loop and game states
- `game/src/shots.js` - deterministic staged scenes
- `main.ts` - hands game/ and screenshots/ to make.fun with a dossier

## License

MIT. See LICENSE.
