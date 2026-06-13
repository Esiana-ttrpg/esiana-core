import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptySceneMetadata,
  isSceneMetadataPresent,
  normalizeBranchConditions,
  parseSceneMetadata,
} from './sceneMetadata.js';

describe('parseSceneMetadata', () => {
  it('defaults missing fields', () => {
    const parsed = parseSceneMetadata(null);
    assert.equal(parsed.sceneStatus, 'PLANNED');
    assert.deepEqual(parsed.entryConditions, []);
    assert.deepEqual(parsed.exitConditions, []);
    assert.deepEqual(parsed.pacingTags, []);
  });

  it('parses exit conditions', () => {
    const parsed = parseSceneMetadata({
      exitConditions: [
        { type: 'manual_flag', key: 'door_open', value: true },
      ],
    });
    assert.equal(parsed.exitConditions.length, 1);
    assert.equal(parsed.exitConditions[0]?.type, 'manual_flag');
  });

  it('parses outcomes and pacing tags', () => {
    const parsed = parseSceneMetadata({
      pacingTags: ['action', 'social'],
      outcomes: [
        {
          outcomeType: 'quest_unlock',
          description: 'Opens the vault quest',
          linkedPageIds: ['page-1'],
        },
      ],
    });
    assert.deepEqual(parsed.pacingTags, ['action', 'social']);
    assert.equal(parsed.outcomes[0]?.outcomeType, 'quest_unlock');
    assert.equal(parsed.outcomes[0]?.description, 'Opens the vault quest');
    assert.deepEqual(parsed.outcomes[0]?.linkedPageIds, ['page-1']);
  });
});

describe('normalizeBranchConditions', () => {
  it('filters invalid entries', () => {
    const conditions = normalizeBranchConditions([
      { type: 'calendar_event', eventId: 'evt-1' },
      { type: 'unknown' },
      null,
    ]);
    assert.equal(conditions.length, 1);
    assert.equal(conditions[0]?.type, 'calendar_event');
  });
});

describe('isSceneMetadataPresent', () => {
  it('detects exit conditions', () => {
    assert.equal(isSceneMetadataPresent({ exitConditions: [] }), true);
  });

  it('returns false for unrelated metadata', () => {
    assert.equal(isSceneMetadataPresent({ entityCategory: 'characters' }), false);
  });
});
