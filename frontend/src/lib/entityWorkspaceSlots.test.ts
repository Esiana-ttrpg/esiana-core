import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  entityWorkspaceReaderFirst,
  getEntityWorkspaceSlots,
} from './entityWorkspaceSlots.ts';

describe('entityWorkspaceSlots', () => {
  it('returns emphasis config for all entity workspace surfaces', () => {
    for (const key of [
      'character',
      'organization',
      'family',
      'location',
      'object',
      'bestiary',
      'ancestry',
    ] as const) {
      const slots = getEntityWorkspaceSlots(key);
      assert.ok(slots);
      assert.ok(slots.emphasisTitle.length > 0);
      assert.equal(slots.readerFirst, true);
    }
  });

  it('returns null for non-entity surfaces', () => {
    assert.equal(getEntityWorkspaceSlots('default'), null);
    assert.equal(getEntityWorkspaceSlots('quest'), null);
  });

  it('entityWorkspaceReaderFirst mirrors slot config', () => {
    assert.equal(entityWorkspaceReaderFirst('character'), true);
    assert.equal(entityWorkspaceReaderFirst('default'), false);
  });
});
