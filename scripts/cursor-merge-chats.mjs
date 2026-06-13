#!/usr/bin/env node
/**
 * Merge sidebar chat state from old workspace vscdb into multi-root workspace.
 * Usage: node cursor-merge-chats.mjs <source.vscdb> <dest.vscdb>
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const REPLACEMENTS = [
  [
    'file:///c%3A/Users/allison/Documents/GIT/esiana/docs/',
    'file:///c%3A/Users/allison/Documents/GIT/Esiana-ttrpg/docs/',
  ],
  [
    'file:///c%3A/Users/allison/Documents/GIT/esiana',
    'file:///c%3A/Users/allison/Documents/GIT/Esiana-ttrpg/esiana-core',
  ],
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

const CHAT_KEYS = [
  'composer.composerData',
  'aiService.generations',
  'aiService.prompts',
  'workbench.backgroundComposer.workspacePersistentData',
  'history.entries',
  'memento/markdownPlanEditor',
];

function applyReplacements(text) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

function getValue(db, key) {
  const row = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key);
  return row?.value ?? null;
}

function setValue(db, key, value) {
  const exists = db.prepare('SELECT 1 FROM ItemTable WHERE key = ?').get(key);
  if (exists) {
    db.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run(value, key);
  } else {
    db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run(key, value);
  }
}

function mergeJsonArrays(oldJson, newJson, idField = 'id') {
  let oldArr;
  let newArr;
  try {
    oldArr = JSON.parse(oldJson);
    newArr = JSON.parse(newJson);
  } catch {
    return oldJson.length >= (newJson?.length ?? 0) ? oldJson : newJson;
  }
  if (!Array.isArray(oldArr)) return newJson ?? oldJson;
  if (!Array.isArray(newArr)) return oldJson;

  const byId = new Map();
  for (const item of oldArr) {
    const id = item?.[idField] ?? JSON.stringify(item);
    byId.set(id, item);
  }
  for (const item of newArr) {
    const id = item?.[idField] ?? JSON.stringify(item);
    byId.set(id, item);
  }
  const merged = [...byId.values()];
  merged.sort((a, b) => {
    const ta = a?.timestamp ?? a?.createdAt ?? a?.unixMs ?? 0;
    const tb = b?.timestamp ?? b?.createdAt ?? b?.unixMs ?? 0;
    return tb - ta;
  });
  return JSON.stringify(merged);
}

function mergeComposerData(oldRaw, newRaw) {
  let oldObj;
  let newObj;
  try {
    oldObj = JSON.parse(oldRaw);
    newObj = JSON.parse(newRaw);
  } catch {
    return oldRaw.length >= (newRaw?.length ?? 0) ? oldRaw : newRaw;
  }

  const allComposers = new Map();
  const ingest = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    const list =
      obj.allComposers ??
      obj.composers ??
      obj.conversations ??
      (Array.isArray(obj) ? obj : null);
    if (Array.isArray(list)) {
      for (const c of list) {
        const id = c?.composerId ?? c?.id ?? c?.conversationId ?? JSON.stringify(c);
        allComposers.set(id, c);
      }
    }
    if (obj.selectedComposerId && !allComposers.has(obj.selectedComposerId)) {
      // keep selection hint
    }
  };
  ingest(oldObj);
  ingest(newObj);

  const merged = {
    ...newObj,
    ...oldObj,
    allComposers: [...allComposers.values()],
  };
  if (newObj?.selectedComposerId) merged.selectedComposerId = newObj.selectedComposerId;
  return JSON.stringify(merged);
}

const [srcPath, destPath] = process.argv.slice(2);
if (!srcPath || !destPath) {
  console.error('Usage: node cursor-merge-chats.mjs <source.vscdb> <dest.vscdb>');
  process.exit(1);
}

const backupDest = `${destPath}.pre-merge-${Date.now()}`;
copyFileSync(destPath, backupDest);
console.log(`Backed up dest to ${backupDest}`);

const src = new DatabaseSync(srcPath, { readOnly: true });
const dest = new DatabaseSync(destPath);

const report = [];
for (const key of CHAT_KEYS) {
  let oldVal = getValue(src, key);
  const newVal = getValue(dest, key);
  if (oldVal == null) continue;

  oldVal = applyReplacements(String(oldVal));

  let merged;
  if (key === 'composer.composerData') {
    merged = newVal ? mergeComposerData(oldVal, String(newVal)) : oldVal;
  } else if (key.startsWith('aiService.') || key === 'history.entries') {
    merged = newVal ? mergeJsonArrays(oldVal, String(newVal)) : oldVal;
  } else {
    merged = oldVal.length >= String(newVal ?? '').length ? oldVal : String(newVal);
    if (newVal) merged = applyReplacements(merged);
  }

  merged = applyReplacements(String(merged));
  setValue(dest, key, merged);
  report.push({
    key,
    oldLen: oldVal.length,
    newLen: String(newVal ?? '').length,
    mergedLen: merged.length,
  });
}

// SQL replace pass on entire dest for any remaining legacy paths
for (const [from, to] of REPLACEMENTS) {
  dest
    .prepare(
      'UPDATE ItemTable SET value = replace(value, ?, ?) WHERE cast(value as text) LIKE ?',
    )
    .run(from, to, `%${from.slice(0, 20)}%`);
}

src.close();
dest.close();

console.log('Merged keys:');
for (const r of report) {
  console.log(`  ${r.key}: ${r.newLen} -> ${r.mergedLen} (from source ${r.oldLen})`);
}
