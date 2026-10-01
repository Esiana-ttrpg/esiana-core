import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT_SYNC_COLLECTIONS, ContentSyncError } from './contentSyncService.js';

test('content sync catalog exposes the eight v1 collections and deferred catalog entries', () => {
  const available = CONTENT_SYNC_COLLECTIONS.filter((item) => item.available).map((item) => item.key);
  assert.deepEqual(available, ['characters', 'journal', 'session-notes', 'bestiary', 'locations', 'organizations', 'quests', 'timeline-events']);
  assert.equal(CONTENT_SYNC_COLLECTIONS.find((item) => item.key === 'maps')?.available, false);
  assert.ok(CONTENT_SYNC_COLLECTIONS.every((item) => item.operations.delete === false));
});

test('content sync errors retain safe conflict state', () => {
  const current = { collection: 'characters', id: 'page-1' } as any;
  const error = new ContentSyncError('CONFLICT', 'stale', current);
  assert.equal(error.code, 'CONFLICT');
  assert.equal(error.current, current);
});
