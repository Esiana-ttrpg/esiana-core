import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyObjectiveMetadata,
  isObjectiveMetadataPresent,
  parseObjectiveMetadata,
  sanitizeObjectiveMetadataForStorage,
} from './objectiveMetadata.js';

describe('objectiveMetadata', () => {
  it('defaults missing fields', () => {
    assert.deepEqual(parseObjectiveMetadata(null), emptyObjectiveMetadata());
  });

  it('parses status and summary', () => {
    const fields = parseObjectiveMetadata({
      objectiveStatus: 'active',
      summary: 'Secure the vault',
      sortOrder: 2,
    });
    assert.equal(fields.objectiveStatus, 'ACTIVE');
    assert.equal(fields.summary, 'Secure the vault');
    assert.equal(fields.sortOrder, 2);
  });

  it('detects objective metadata presence', () => {
    assert.equal(isObjectiveMetadataPresent({ objectiveStatus: 'PLANNED' }), true);
    assert.equal(isObjectiveMetadataPresent({ questStatus: 'ACTIVE' }), false);
  });

  it('does not persist parent or scene link keys', () => {
    const sanitized = sanitizeObjectiveMetadataForStorage({
      objectiveStatus: 'PLANNED',
      parentQuestPageId: 'quest-1',
      linkedScenePageIds: ['scene-1'],
    });
    assert.equal(sanitized.parentQuestPageId, undefined);
    assert.equal(sanitized.linkedScenePageIds, undefined);
    assert.equal(sanitized.objectiveStatus, 'PLANNED');
  });
});
