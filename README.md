# Solmarina Heat

A GTA-style open-world crime game in 3D, built for make.fun's "Make GTA 6" bounty.

## The game

You are Dario Cruz, new in the sun-soaked coastal city of Solmarina. Steal cars, outrun the police, take jobs from Marisol and Rico, and take over the city, one mission at a time.

- **Open world:** four districts (Marina Bay, Palmetto Strip, Las Brisas, Old Cannery), a south bay with a bridge and beach, parks, day-night cycle.
- **On foot and driving:** walk, run, steal any of 5 car types, arcade driving, AI traffic and pedestrians who react to you.
- **Combat:** 4 weapons (pistol, shotgun, SMG, rifle), mouse aim, armed enemies who shoot back.
- **Wanted:** 5 stars. Police patrol, pursue in cars, set roadblocks. Lose the heat or get BUSTED.
- **Missions:** 5 sequential jobs with dialog, markers and objectives. Finish them all to own Solmarina.
- **HUD:** health, money, weapon/ammo, wanted stars, objective, live minimap, clock. Title screen, pause, save/load.

## Controls

WASD move, mouse look (click to lock), click shoot, E enter/exit car, R reload, 1-4 switch weapon, Shift run, M start mission, S save, P pause.

## Tech

Three.js (vendored locally in `game/lib/three.min.js`), procedural 3D models from code, no external assets, no network, no build step. Open `game/index.html` in a desktop browser to play.

## Layout

- `game/index.html` - the page, canvas and HUD
- `game/lib/three.min.js` - Three.js r149 (library, vendored unchanged)
- `game/src/config.js` - constants, districts, fixed seed
- `game/src/random.js` - seeded RNG
- `game/src/city.js` - procedural 3D city, collision, roads
- `game/src/render.js` - scene, third-person camera, day-night
- `game/src/input.js` - keyboard and mouse (pointer lock)
- `game/src/audio.js` - synthetic WebAudio
- `game/src/vehicles.js` - 5 car types, driving physics
- `game/src/traffic.js` - AI traffic on the street grid
- `game/src/pedestrians.js` - AI pedestrians
- `game/src/combat.js` - weapons, shooting, enemies
- `game/src/police.js` - wanted stars, pursuit, roadblocks, BUSTED
- `game/src/missions.js` - 5 sequential missions
- `game/src/save.js` - save/load via localStorage
- `game/src/hud.js` - HUD, minimap, dialog, title and end screens
- `game/src/shots.js` - deterministic staged scenes (`?shot=chase|title|mission|wasted`)
- `game/src/main.js` - fixed-step 60 Hz loop and game states
- `main.ts` - hands game/ and screenshots/ to make.fun with a dossier

## License

MIT. See LICENSE.
