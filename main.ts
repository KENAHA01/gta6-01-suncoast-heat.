// main.ts - Solmarina Heat entrypoint for make.fun (gta6-01).
// One job: copy game/ and screenshots/ into the grader output directory and
// write dossier.json from them with the kit's buildDossier. Node 22,
// standard library only, no network, deterministic: two runs write identical
// bytes. Run as: MAKEFUN_OUTPUT_DIR=/output node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));

function outputDir(): string {
  const env = process.env.MAKEFUN_OUTPUT_DIR;
  const out = resolve(env && env.length > 0 ? env : join(REPO_ROOT, 'output'));
  if (out === REPO_ROOT) {
    throw new Error('main.ts: MAKEFUN_OUTPUT_DIR must not be the repo root');
  }
  return out;
}

function main(): void {
  const out = outputDir();
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(REPO_ROOT, 'game'), join(out, 'game'), { recursive: true });
  cpSync(join(REPO_ROOT, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  const gameFiles = countFiles(join(out, 'game'));
  const shotFiles = countFiles(join(out, 'screenshots'));
  console.log('wrote ' + join(out, 'dossier.json') + ' (' + dossier.length + ' bytes, '
    + gameFiles + ' game files, ' + shotFiles + ' screenshots)');
}

function countFiles(dir: string): number {
  let n = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const name of readdirSync(cur, { withFileTypes: true })) {
      const p = join(cur, name.name);
      if (name.isDirectory()) stack.push(p);
      else n++;
    }
  }
  return n;
}

main();
