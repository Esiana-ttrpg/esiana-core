import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldResyncDraftFromSource } from './useBlockDraft.ts';

describe('useBlockDraft', () => {
  it('shouldResyncDraftFromSource skips when dirty', () => {
    assert.equal(shouldResyncDraftFromSource(true, '{"a":1}', '{"a":2}'), false);
  });

  it('shouldResyncDraftFromSource applies when clean and source changed', () => {
    assert.equal(shouldResyncDraftFromSource(false, '{"a":1}', '{"a":2}'), true);
  });

  it('shouldResyncDraftFromSource skips when serialized key unchanged', () => {
    assert.equal(shouldResyncDraftFromSource(false, '{"a":1}', '{"a":1}'), false);
  });
});
