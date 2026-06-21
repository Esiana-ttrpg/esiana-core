#!/usr/bin/env node
/**
 * Copy plugin packages from ../community-plugins into esiana-core/plugins/
 * for local runtime dev (PLUGINS_DIR). Skips catalog files and scripts.
 *
 * Discovers manifest.json in repo root, examples/*, and stubs/*.
 * Copies flat to plugins/{manifest.id}/ — folder layout in community-plugins
 * is invisible at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coreRoot = path.resolve(__dirname, '..');
const catalogRoot = path.resolve(coreRoot, '..', 'community-plugins');
const pluginsDir = path.join(coreRoot, 'plugins');

const SKIP_TOP_LEVEL = new Set([
  'README.md',
  'registry.json',
  'manifest.json',
  'scripts',
  '.git',
  'node_modules',
  'examples',
  'stubs',
  'CONTRIBUTING.md',
]);

function readPluginId(manifestPath) {
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  } catch {
    return null;
  }
}

function collectPluginSourceDirs(root) {
  const dirs = [];

  for (const name of fs.readdirSync(root)) {
    if (SKIP_TOP_LEVEL.has(name)) continue;
    const src = path.join(root, name);
    if (!fs.statSync(src).isDirectory()) continue;
    if (fs.existsSync(path.join(src, 'manifest.json'))) {
      dirs.push(src);
    }
  }

  for (const bucket of ['examples', 'stubs']) {
    const bucketDir = path.join(root, bucket);
    if (!fs.existsSync(bucketDir)) continue;
    for (const name of fs.readdirSync(bucketDir)) {
      const src = path.join(bucketDir, name);
      if (!fs.statSync(src).isDirectory()) continue;
      if (fs.existsSync(path.join(src, 'manifest.json'))) {
        dirs.push(src);
      }
    }
  }

  return dirs;
}

if (!fs.existsSync(catalogRoot)) {
  console.error(`community-plugins not found at ${catalogRoot}`);
  process.exit(1);
}

fs.mkdirSync(pluginsDir, { recursive: true });

let linked = 0;
for (const src of collectPluginSourceDirs(catalogRoot)) {
  const pluginId = readPluginId(path.join(src, 'manifest.json'));
  if (!pluginId) {
    console.warn(`Skipping ${src} — manifest missing id`);
    continue;
  }

  const dest = path.join(pluginsDir, pluginId);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  linked += 1;
  console.log(`Linked ${pluginId}`);
}

console.log(`Done — ${linked} plugin(s) in ${pluginsDir}`);
