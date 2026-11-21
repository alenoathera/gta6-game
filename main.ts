/**
 * Solara Bay (GTA 6 Open-World Action Entry)
 * Main packaging and submission exporter for Make.fun
 *
 * This script exports the game static distribution along with verified screenshots
 * into the competition output directory and generates the submission dossier.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve source repository base path and target output directory
const sourceDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Guarantee output directory structure
mkdirSync(outputDir, { recursive: true });

// Copy the game directory (static web runtime)
const gameSourcePath = join(sourceDir, 'game');
const gameDestPath = join(outputDir, 'game');
if (existsSync(gameSourcePath)) {
  cpSync(gameSourcePath, gameDestPath, { recursive: true });
}

// Copy the screenshots directory (real browser renders)
const shotsSourcePath = join(sourceDir, 'screenshots');
const shotsDestPath = join(outputDir, 'screenshots');
mkdirSync(shotsDestPath, { recursive: true });
if (existsSync(shotsSourcePath)) {
  cpSync(shotsSourcePath, shotsDestPath, { recursive: true });
}

// Build and serialize competition dossier conforming to harness gates
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: {
    max: 4,
    max_bytes: 262144,
  },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const dossierData = buildDossier(outputDir, dossierCaps);
writeFileSync(join(outputDir, 'dossier.json'), dossierData, 'utf-8');

console.log(`[Solara Bay] Dossier generated at ${join(outputDir, 'dossier.json')}`);
