import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverImportFolders, detectWrapperPrefix, normalizePathSegments } from './importZipStructure.js';

test('discoverImportFolders auto-maps canonical folders and surfaces custom folders', () => {
  const entries = [
    'Rays Pathfinder/Characters/Party/Akumi.md',
    'Rays Pathfinder/Locations/Ravounel.md',
    'Rays Pathfinder/Sessions/Book 2/Session 40.md',
    'Rays Pathfinder/Factions/Scarlet Triad.md',
    'Rays Pathfinder/Midnight Foxes/Kintargo Chapter.md',
    '.obsidian/workspace.json',
  ];
  const result = discoverImportFolders(entries);
  assert.equal(result.wrapperPrefix, 'Rays Pathfinder');
  assert.deepEqual(result.topLevelFolders, [
    'Characters',
    'Factions',
    'Locations',
    'Midnight Foxes',
    'Sessions',
  ]);
  assert.ok(result.canonicalAutoMapped.some((row) => row.folder === 'Characters'));
  assert.ok(result.needsMapping.includes('Midnight Foxes'));
});

test('detectWrapperPrefix does not strip canonical root folder names', () => {
  const paths = ['Characters/NPC.md', 'Characters/Party/PC.md'];
  assert.equal(detectWrapperPrefix(paths), undefined);
});

test('normalizePathSegments strips wrapper prefix only', () => {
  const result = normalizePathSegments('Rays Pathfinder/Characters/Citadel.md', 'Rays Pathfinder');
  assert.deepEqual(result.segments, ['Characters']);
  assert.equal(result.filename, 'Citadel.md');
});
