import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFrontmatter } from './importFrontmatterNormalize.js';

test('normalizeFrontmatter maps common Obsidian type keys', () => {
  const normalized = normalizeFrontmatter({
    type: 'location',
    visibility: 'gm',
    tags: ['#character'],
  });
  assert.equal(normalized.entityType, 'locations');
  assert.equal(normalized.visibility, 'DM_Only');
  assert.equal(normalized.tags[0], 'character');
});

test('normalizeFrontmatter maps entityType alias', () => {
  const normalized = normalizeFrontmatter({ entity_type: 'npc' });
  assert.equal(normalized.entityType, 'characters');
});
