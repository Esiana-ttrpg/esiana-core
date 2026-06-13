import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeAlias } from './normalizeAlias.js';

describe('normalizeAlias', () => {
  it('lowercases and collapses whitespace', () => {
    assert.equal(normalizeAlias('  The Silver Accord  '), 'the silver accord');
  });

  it('strips surrounding quotes', () => {
    assert.equal(normalizeAlias('"Silver Accord"'), 'silver accord');
  });

  it('treats punctuation variants consistently', () => {
    assert.equal(
      normalizeAlias('Silver Accord'),
      normalizeAlias('silver accord'),
    );
  });

  it('handles empty after strip', () => {
    assert.equal(normalizeAlias('   '), '');
  });
});
