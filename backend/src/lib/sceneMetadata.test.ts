import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeSceneMetadata,
  parseSceneMetadata,
  sanitizeSceneMetadataForRole,
} from './sceneMetadata.js';

describe('sanitizeSceneMetadataForRole', () => {
  it('strips gmNotes for players', () => {
    const parsed = parseSceneMetadata({ gmNotes: 'Secret plan', sceneStatus: 'PLANNED' });
    const sanitized = sanitizeSceneMetadataForRole(parsed, false);
    assert.equal(sanitized.gmNotes, null);
    assert.equal(sanitized.sceneStatus, 'PLANNED');
  });

  it('keeps gmNotes for managers', () => {
    const parsed = parseSceneMetadata({ gmNotes: 'Secret plan' });
    const sanitized = sanitizeSceneMetadataForRole(parsed, true);
    assert.equal(sanitized.gmNotes, 'Secret plan');
  });
});

describe('mergeSceneMetadata', () => {
  it('merges exit conditions', () => {
    const merged = mergeSceneMetadata(
      { sceneStatus: 'PLANNED' },
      {
        exitConditions: [{ type: 'manual_flag', key: 'done', value: true }],
      },
    );
    assert.equal(Array.isArray(merged.exitConditions), true);
    assert.equal((merged.exitConditions as { key: string }[])[0]?.key, 'done');
  });

  it('preserves unrelated metadata keys', () => {
    const merged = mergeSceneMetadata(
      { entityCategory: 'Scenes', tone: 'grim' },
      { sceneStatus: 'READY' },
    );
    assert.equal(merged.entityCategory, 'Scenes');
    assert.equal(merged.tone, 'grim');
    assert.equal(merged.sceneStatus, 'READY');
  });
});
