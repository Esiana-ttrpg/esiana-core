import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSaveWordDeltaMetadata,
  isSubstantialRevision,
  SUBSTANTIAL_REVISION_THRESHOLD,
} from './revisionMetrics.js';

describe('revisionMetrics', () => {
  it('flags substantial revision when half the page changes', () => {
    assert.equal(isSubstantialRevision(-50, 100, 50), true);
    assert.equal(
      isSubstantialRevision(50, 100, 150),
      50 / 100 >= SUBSTANTIAL_REVISION_THRESHOLD,
    );
  });

  it('does not flag minor edits', () => {
    assert.equal(isSubstantialRevision(5, 100, 105), false);
    assert.equal(isSubstantialRevision(0, 100, 100), false);
  });

  it('buildSaveWordDeltaMetadata includes substantialRevision only on edits', () => {
    const createMeta = buildSaveWordDeltaMetadata(0, 200, false);
    assert.equal(createMeta.wordDelta, 200);
    assert.equal(createMeta.substantialRevision, undefined);

    const editMeta = buildSaveWordDeltaMetadata(100, 50, true);
    assert.equal(editMeta.wordDelta, -50);
    assert.equal(editMeta.substantialRevision, true);
  });
});
