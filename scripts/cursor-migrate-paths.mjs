#!/usr/bin/env node
/**
 * Rewrite old GIT\esiana paths in text files and Cursor state.vscdb.
 * Usage: node cursor-migrate-paths.mjs <file-or-dir> [file-or-dir...]
 *        node cursor-migrate-paths.mjs --sqlite <path-to-state.vscdb>
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const REPLACEMENTS = [
  // URL-encoded (longest first)
  [
    'file:///c%3A/Users/allison/Documents/GIT/esiana/docs/',
    'file:///c%3A/Users/allison/Documents/GIT/Esiana-ttrpg/docs/',
  ],
  [
    'file:///c%3A/Users/allison/Documents/GIT/esiana',
    'file:///c%3A/Users/allison/Documents/GIT/Esiana-ttrpg/esiana-core',
  ],
  // Forward slashes
  [
    'c:/Users/allison/Documents/GIT/esiana/docs/',
    'c:/Users/allison/Documents/GIT/Esiana-ttrpg/docs/',
  ],
  [
    'C:/Users/allison/Documents/GIT/esiana/docs/',
    'C:/Users/allison/Documents/GIT/Esiana-ttrpg/docs/',
  ],
  [
    'c:/Users/allison/Documents/GIT/esiana',
    'c:/Users/allison/Documents/GIT/Esiana-ttrpg/esiana-core',
  ],
  [
    'C:/Users/allison/Documents/GIT/esiana',
    'C:/Users/allison/Documents/GIT/Esiana-ttrpg/esiana-core',
  ],
  // JSON-escaped backslashes (as stored in .jsonl)
  [
    'c:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\esiana\\\\docs\\\\',
    'c:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\Esiana-ttrpg\\\\docs\\\\',
  ],
  [
    'C:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\esiana\\\\docs\\\\',
    'C:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\Esiana-ttrpg\\\\docs\\\\',
  ],
  [
    'c:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\esiana',
    'c:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\Esiana-ttrpg\\\\esiana-core',
  ],
  [
    'C:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\esiana',
    'C:\\\\Users\\\\allison\\\\Documents\\\\GIT\\\\Esiana-ttrpg\\\\esiana-core',
  ],
  // Single-backslash Windows paths (markdown / plain text)
  [
    'c:\\Users\\allison\\Documents\\GIT\\esiana\\docs\\',
    'c:\\Users\\allison\\Documents\\GIT\\Esiana-ttrpg\\docs\\',
  ],
  [
    'C:\\Users\\allison\\Documents\\GIT\\esiana\\docs\\',
    'C:\\Users\\allison\\Documents\\GIT\\Esiana-ttrpg\\docs\\',
  ],
  [
    'c:\\Users\\allison\\Documents\\GIT\\esiana',
    'c:\\Users\\allison\\Documents\\GIT\\Esiana-ttrpg\\esiana-core',
  ],
  [
    'C:\\Users\\allison\\Documents\\GIT\\esiana',
    'C:\\Users\\allison\\Documents\\GIT\\Esiana-ttrpg\\esiana-core',
  ],
];

function applyReplacements(text) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const TEXT_EXTS = new Set(['.jsonl', '.md', '.json', '.txt', '.log']);

function migrateFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (!TEXT_EXTS.has(ext)) return false;
  const before = readFileSync(filePath, 'utf8');
  const after = applyReplacements(before);
  if (after !== before) {
    writeFileSync(filePath, after, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dirPath, changed) {
  for (const name of readdirSync(dirPath)) {
    const full = join(dirPath, name);
    const st = statSync(full);
    if (st.isDirectory()) walkDir(full, changed);
    else if (migrateFile(full)) changed.push(full);
  }
}

function migrateSqlite(dbPath) {
  const db = new DatabaseSync(dbPath);
  let updated = 0;
  const updateRow = db.prepare('UPDATE ItemTable SET value = ? WHERE rowid = ?');
  const rows = db.prepare('SELECT rowid, value FROM ItemTable').all();
  for (const row of rows) {
    if (typeof row.value !== 'string') continue;
    const next = applyReplacements(row.value);
    if (next !== row.value) {
      updateRow.run(next, row.rowid);
      updated++;
    }
  }
  // SQL-level pass for rows still containing legacy paths (JSON blobs, etc.)
  for (const [from, to] of REPLACEMENTS) {
    const info = db
      .prepare('UPDATE ItemTable SET value = replace(value, ?, ?) WHERE cast(value as text) LIKE ?')
      .run(from, to, `%${from.slice(0, 24)}%`);
    updated += info.changes;
  }
  db.close();
  return updated;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node cursor-migrate-paths.mjs [--sqlite db] <paths...>');
  process.exit(1);
}

let sqlitePath = null;
const paths = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sqlite') {
    sqlitePath = args[++i];
  } else {
    paths.push(args[i]);
  }
}

if (sqlitePath) {
  const n = migrateSqlite(sqlitePath);
  console.log(`Updated ${n} rows in ${sqlitePath}`);
}

const changed = [];
for (const p of paths) {
  const st = statSync(p);
  if (st.isDirectory()) walkDir(p, changed);
  else if (migrateFile(p)) changed.push(p);
}
console.log(`Updated ${changed.length} text file(s)`);
