#!/usr/bin/env node
/**
 * Copy plugin packages from ../community-plugins into esiana-core/plugins/
 * for local runtime dev (PLUGINS_DIR). Skips catalog files and scripts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coreRoot = path.resolve(__dirname, '..');
const catalogRoot = path.resolve(coreRoot, '..', 'community-plugins');
const pluginsDir = path.join(coreRoot, 'plugins');

const SKIP = new Set([
  'README.md',
  'registry.json',
  'manifest.json',
  'scripts',
  '.git',
  'node_modules',
]);

if (!fs.existsSync(catalogRoot)) {
  console.error(`community-plugins not found at ${catalogRoot}`);
  process.exit(1);
}

fs.mkdirSync(pluginsDir, { recursive: true });

let linked = 0;
for (const name of fs.readdirSync(catalogRoot)) {
  if (SKIP.has(name)) continue;
  const src = path.join(catalogRoot, name);
  if (!fs.statSync(src).isDirectory()) continue;
  if (!fs.existsSync(path.join(src, 'manifest.json'))) continue;

  const dest = path.join(pluginsDir, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  linked += 1;
  console.log(`Linked ${name}`);
}

console.log(`Done — ${linked} plugin(s) in ${pluginsDir}`);
