import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeRecentEntitiesConfig,
  parseRecentEntitiesConfig,
  sanitizeRecentEntitiesConfig,
} from './dashboardRecentEntitiesCatalog.js';

test('parseRecentEntitiesConfig accepts valid config', () => {
  const parsed = parseRecentEntitiesConfig({
    category: 'characters',
    limit: 5,
    sortBy: 'alphabetical',
  });
  assert.deepEqual(parsed, {
    category: 'characters',
    limit: 5,
    sortBy: 'alphabetical',
  });
});

test('parseRecentEntitiesConfig rejects invalid category and limit', () => {
  assert.equal(
    parseRecentEntitiesConfig({ category: 'npcs', limit: 10, sortBy: 'updated' }),
    null,
  );
  assert.equal(
    parseRecentEntitiesConfig({ category: 'all', limit: 15, sortBy: 'updated' }),
    null,
  );
});

test('normalizeRecentEntitiesConfig falls back to defaults', () => {
  assert.deepEqual(normalizeRecentEntitiesConfig({}), {
    category: 'all',
    limit: 10,
    sortBy: 'updated',
  });
});

test('sanitizeRecentEntitiesConfig merges normalized values', () => {
  assert.deepEqual(
    sanitizeRecentEntitiesConfig({ category: 'maps', limit: 99, sortBy: 'bogus' }),
    { category: 'all', limit: 10, sortBy: 'updated' },
  );
});
