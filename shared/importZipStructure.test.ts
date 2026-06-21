import assert from 'node:assert/strict';
import test from 'node:test';
import {
  discoverImportFolders,
  discoverKankaJsonFolders,
  detectZipImportFormat,
  detectWrapperPrefix,
  normalizePathSegments,
} from './importZipStructure.js';

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

test('detectZipImportFormat recognizes Kanka JSON exports', () => {
  const entries = [
    'info.json',
    'campaign.json',
    'characters/anya_6401071.json',
    'abilities/power_1.json',
  ];
  const result = detectZipImportFormat(entries);
  assert.equal(result.format, 'kanka-json');
  assert.ok(result.confidence > 0);
});

test('discoverKankaJsonFolders auto-maps entity folders and reports skipped modules', () => {
  const entries = [
    'characters/anya_1.json',
    'locations/city_2.json',
    'abilities/power_3.json',
    'items/sword_4.json',
    'w/portrait.webp',
  ];
  const result = discoverKankaJsonFolders(entries);
  assert.ok(result.canonicalAutoMapped.some((row) => row.folder === 'characters'));
  assert.ok(result.skippedFolders.some((row) => row.folder === 'abilities'));
  assert.ok(result.skippedFolders.some((row) => row.folder === 'items'));
});
