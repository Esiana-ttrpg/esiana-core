import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeAlias } from './normalizeAlias.js';

describe('normalizeAlias', () => {
  it('preserves Unicode, punctuation deletion and quote-boundary rules', () => {
    assert.equal(normalizeAlias(' “Éowyn’s 北 Archive” '), 'éowyns 北 archive');
    assert.equal(normalizeAlias("Mira's-Archive!"), "mira's-archive");
    assert.equal(normalizeAlias('Mira\u2003\tAsh'), 'mira ash');
    // Punctuation is deleted after boundary quotes; keep this ordering.
    assert.equal(normalizeAlias('!\'Mira\'!'), "'mira'");
  });

  it('handles long trailing quote runs without a suffix regex search', () => {
    assert.equal(normalizeAlias('Mira' + "'".repeat(100_000)), 'mira');
    assert.equal(normalizeAlias('“'.repeat(100_000)), '');
    assert.equal(normalizeAlias(normalizeAlias(' “Mira Ash” ')), 'mira ash');
  });

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
