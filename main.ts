// Solmarina Heat - entrypoint.
// Copies game/ and screenshots/ to the output directory and writes
// dossier.json with buildDossier from the kit's vendored library.
// Runs on Node 22 with the standard library only; the output is
// deterministic, so two runs write identical bytes.

import { buildDossier } from "./vendor/makefun-game.ts";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : resolve(repoRoot, "out");

if (!existsSync(join(repoRoot, "game", "index.html"))) {
  throw new Error("game/index.html is missing");
}
const shots = existsSync(join(repoRoot, "screenshots"))
  ? readdirSync(join(repoRoot, "screenshots")).filter((f) => !f.startsWith("."))
  : [];
if (shots.length < 3) {
  throw new Error("need at least 3 screenshots, found " + shots.length);
}

mkdirSync(outDir, { recursive: true });

for (const name of ["game", "screenshots"]) {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  rmSync(dst, { recursive: true, force: true });
  if (existsSync(src)) {
    cpSync(src, dst, { recursive: true });
  }
}

const dossier = buildDossier(repoRoot, { text_max_bytes: 163840 });
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("wrote " + outDir + " (" + shots.length + " screenshots, dossier " + dossier.byteLength + " bytes)");
