import assert from 'node:assert/strict';
import { it } from 'node:test';
import { sessionSnippet } from './sessionSnippet.js';

it('removes comments reconstructed by removing nested comment delimiters', () => {
  assert.equal(sessionSnippet('Before <!<!-- hidden -->-- secret --> after'), 'Before after');
});

it('removes comments exposed by Markdown formatting removal', () => {
  assert.equal(sessionSnippet('Before <!**-- secret --> after'), 'Before after');
});

it('keeps readable session prose and the shared 200-character limit', () => {
  assert.equal(sessionSnippet('## The crossing\n**Mira** met [Ash](/wiki/ash).'), 'The crossing Mira met Ash.');
  assert.equal(sessionSnippet('a'.repeat(250)), 'a'.repeat(200));
});
