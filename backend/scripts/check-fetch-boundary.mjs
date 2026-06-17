#!/usr/bin/env node
/**
 * Ensures untrusted outbound fetch stays in networkFetch.ts (plus explicit trusted-URL files).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(scriptDir, '../src');

const ALLOWED_RELATIVE = new Set([
  path.normalize('lib/networkFetch.ts'),
  path.normalize('controllers/systemController.ts'),
  path.normalize('lib/capacityProfiling/runCapacityProfile.ts'),
  path.normalize('lib/sampleData/networkExecutor.ts'),
]);

const FETCH_PATTERN = /\bfetch\s*\(/;

function shouldSkip(relativePath) {
  const normalized = path.normalize(relativePath);
  if (normalized.includes(`${path.sep}node_modules${path.sep}`)) return true;
  if (normalized.includes(`${path.sep}__mocks__${path.sep}`)) return true;
  if (normalized.includes(`${path.sep}mocks${path.sep}`)) return true;
  if (normalized.endsWith('.test.ts')) return true;
  if (normalized.endsWith('.spec.ts')) return true;
  return false;
}

function collectTsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(srcRoot, full);
    if (shouldSkip(relative)) continue;
    if (entry.isDirectory()) {
      collectTsFiles(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push({ full, relative });
    }
  }
  return files;
}

const violations = [];

for (const { full, relative } of collectTsFiles(srcRoot)) {
  if (ALLOWED_RELATIVE.has(path.normalize(relative))) continue;
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (FETCH_PATTERN.test(lines[i])) {
      violations.push(`${relative}:${i + 1}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Disallowed fetch() usage outside networkFetch boundary:\n');
  for (const line of violations) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}

console.log('fetch boundary check passed');
