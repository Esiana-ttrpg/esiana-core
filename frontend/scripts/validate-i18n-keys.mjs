#!/usr/bin/env node
/**
 * Validates frontend/src/i18n locale JSON:
 * - en: complete structural validation (CI gate)
 * - other locales: same structural rules when present; missing keys vs en are OK
 * - --report-locales: informational completion summary (non-gating)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18nRoot = path.join(frontendRoot, 'src', 'i18n');
const enRoot = path.join(i18nRoot, 'en');

const KEY_PATTERN = /^[a-z]+(?:\.[a-z]+)*\.[a-z][a-zA-Z0-9]*$/;
const reportLocales = process.argv.includes('--report-locales');

function expectedKeyPrefix(relativeJsonPath) {
  const normalized = relativeJsonPath.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.json$/i, '');
  if (!withoutExt.includes('/')) return withoutExt;
  return withoutExt.replace(/\//g, '.');
}

function collectJsonFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
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

function loadLocaleKeys(localeRoot) {
  const files = collectJsonFiles(localeRoot);
  const keys = new Map();
  let errorCount = 0;

  for (const relativePath of files) {
    const normalized = relativePath.split(path.sep).join('/');
    const prefix = expectedKeyPrefix(normalized);
    const fullPath = path.join(localeRoot, relativePath);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      console.error(
        `i18n validation error: invalid JSON in ${normalized}: ${err.message}`,
      );
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
      if (keys.has(key)) {
        console.error(`i18n validation error: duplicate key "${key}"`);
        errorCount += 1;
      }
      keys.set(key, normalized);
    }
  }

  return { files, keys, errorCount };
}

if (!fs.existsSync(enRoot)) {
  fail(`missing English locale root: ${enRoot}`);
}

const english = loadLocaleKeys(enRoot);
let errorCount = english.errorCount;

const localeDirs = fs
  .readdirSync(i18nRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'en')
  .map((entry) => entry.name);

for (const locale of localeDirs) {
  const localeRoot = path.join(i18nRoot, locale);
  const community = loadLocaleKeys(localeRoot);
  errorCount += community.errorCount;

  for (const key of community.keys.keys()) {
    if (!english.keys.has(key)) {
      console.error(
        `i18n validation error: ${locale} key "${key}" is not defined in en`,
      );
      errorCount += 1;
    }
  }
}

if (reportLocales) {
  console.log(`English: ${english.keys.size} keys across ${english.files.length} files`);
  for (const locale of localeDirs) {
    const localeRoot = path.join(i18nRoot, locale);
    const community = loadLocaleKeys(localeRoot);
    const translated = [...community.keys.keys()].filter((key) =>
      english.keys.has(key),
    ).length;
    const pct =
      english.keys.size === 0
        ? 0
        : Math.round((translated / english.keys.size) * 1000) / 10;
    console.log(
      `${locale}: ${translated}/${english.keys.size} keys (${pct}%) in ${community.files.length} files`,
    );
  }
}

if (errorCount > 0) {
  console.error(`i18n validation failed with ${errorCount} error(s).`);
  process.exit(1);
}

console.log(
  `i18n validation passed (${english.files.length} en files, ${english.keys.size} keys${
    localeDirs.length ? `; community: ${localeDirs.join(', ')}` : ''
  }).`,
);
