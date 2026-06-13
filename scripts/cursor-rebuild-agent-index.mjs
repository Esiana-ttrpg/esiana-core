#!/usr/bin/env node
/**
 * Rebuild composer.composerData selectedComposerIds from agent-transcripts folders.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const projectDir = process.argv[2];
const dbPath = process.argv[3];

const transcriptsDir = join(projectDir, 'agent-transcripts');
const ids = readdirSync(transcriptsDir).filter((name) => {
  const p = join(transcriptsDir, name);
  return statSync(p).isDirectory();
});

function titleFromTranscript(id) {
  const file = join(transcriptsDir, id, `${id}.jsonl`);
  try {
    const firstLine = readFileSync(file, 'utf8').split('\n')[0];
    const row = JSON.parse(firstLine);
    const text = row?.message?.content?.find?.((c) => c.type === 'text')?.text ?? '';
    const m = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/);
    const raw = (m ? m[1] : text).replace(/\s+/g, ' ').trim();
    return raw.slice(0, 80) || id.slice(0, 8);
  } catch {
    return id.slice(0, 8);
  }
}

const composers = ids.map((id) => ({
  composerId: id,
  name: titleFromTranscript(id),
  createdAt: statSync(join(transcriptsDir, id)).mtimeMs,
}));

composers.sort((a, b) => b.createdAt - a.createdAt);
const allIds = composers.map((c) => c.composerId);

const db = new DatabaseSync(dbPath);
const row = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get('composer.composerData');
let data = {};
try {
  data = JSON.parse(row?.value ?? '{}');
} catch {
  data = {};
}

data.selectedComposerIds = allIds;
data.lastFocusedComposerIds = allIds.slice(0, 8);
data.allComposers = composers;
data.hasMigratedComposerData = true;
data.hasMigratedMultipleComposers = true;

const value = JSON.stringify(data);
db.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run(value, 'composer.composerData');
db.close();

console.log(`Indexed ${allIds.length} agent transcripts in composer.composerData`);
