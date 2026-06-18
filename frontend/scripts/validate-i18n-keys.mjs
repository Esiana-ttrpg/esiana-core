#!/usr/bin/env node
/**
 * Validates frontend/src/i18n/en locale JSON:
 * - flat string values only
 * - keys match {domainPath}.{camelCase}
 * - key prefix matches file path
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const enRoot = path.join(frontendRoot, 'src', 'i18n', 'en');

const KEY_PATTERN = /^[a-z]+(?:\.[a-z]+)*\.[a-z][a-zA-Z0-9]*$/;

function expectedKeyPrefix(relativeJsonPath) {
  const normalized = relativeJsonPath.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.json$/i, '');
  if (!withoutExt.includes('/')) return withoutExt;
  return withoutExt.replace(/\//g, '.');
}

function collectJsonFiles(dir, base = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(full, base));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

function fail(message) {
  console.error(`i18n validation error: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(enRoot)) {
  fail(`missing English locale root: ${enRoot}`);
}

const files = collectJsonFiles(enRoot);
const allKeys = new Set();
let errorCount = 0;

for (const relativePath of files) {
  const normalized = relativePath.split(path.sep).join('/');
  const prefix = expectedKeyPrefix(normalized);
  const fullPath = path.join(enRoot, relativePath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    console.error(`i18n validation error: invalid JSON in ${normalized}: ${err.message}`);
    errorCount += 1;
    continue;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error(`i18n validation error: ${normalized} must be a flat object`);
    errorCount += 1;
    continue;
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      console.error(
        `i18n validation error: ${normalized} key "${key}" must be a string (no nested objects)`,
      );
      errorCount += 1;
      continue;
    }
    if (!KEY_PATTERN.test(key)) {
      console.error(
        `i18n validation error: ${normalized} key "${key}" must match {domainPath}.{camelCase}`,
      );
      errorCount += 1;
    }
    if (!key.startsWith(`${prefix}.`)) {
      console.error(
        `i18n validation error: ${normalized} key "${key}" must start with "${prefix}."`,
      );
      errorCount += 1;
    }
    if (allKeys.has(key)) {
      console.error(`i18n validation error: duplicate key "${key}"`);
      errorCount += 1;
    }
    allKeys.add(key);
  }
}

if (errorCount > 0) {
  console.error(`i18n validation failed with ${errorCount} error(s).`);
  process.exit(1);
}

console.log(`i18n validation passed (${files.length} files, ${allKeys.size} keys).`);
