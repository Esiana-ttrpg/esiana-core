import assert from 'node:assert/strict';
import { it } from 'node:test';
import { sessionSnippet } from './sessionSnippet.js';
import { stripSnippetMarkup } from './snippetMarkup.js';

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

it('handles deeply reconstructed comments without a pass per nesting level', () => {
  const depth = 10_000;
  const text = 'Before ' + '<!'.repeat(depth) + '<!-- hidden -->' + '-- hidden -->'.repeat(depth) + ' after';
  assert.equal(sessionSnippet(text), 'Before after');
});

it('keeps source comments opaque and excludes overlapping closing delimiters', () => {
  assert.equal(sessionSnippet('Before <!-- -**-> hidden --> after'), 'Before after');
  assert.equal(sessionSnippet('Before <!--> after'), 'Before <!--> after');
  assert.equal(sessionSnippet('Before <!**-- [Ash](-->) hidden --> after'), 'Before after');
  assert.equal(sessionSnippet('*<!<!-- hidden -->-- hidden -->*'), '');
  assert.equal(sessionSnippet('#<!<!-- hidden -->-- hidden --> Mira'), 'Mira');
});

it('retains nested link labels without repeatedly copying a large label', () => {
  const label = 'Mira '.repeat(2_000);
  const text = '['.repeat(10_000) + label + '](url)'.repeat(10_000);
  assert.equal(stripSnippetMarkup(text, 'session'), label);
});

it('preserves adjacent link matching and empty or unmatched delimiters', () => {
  assert.equal(sessionSnippet('[[Ash](url)[Ash](url)'), '[AshAsh');
  assert.equal(sessionSnippet('xxMira[afterx[Ash](url)****]([Ash](url)<!'), 'xxMiraafterx[Ash](Ash<!');
  assert.equal(sessionSnippet('[](url) [Mira]() [[unclosed'), '[](url) [Mira]() [[unclosed');
  assert.equal(sessionSnippet('['.repeat(100_000)), '['.repeat(200));
  assert.equal(sessionSnippet('#######  Mira'), '#Mira');
});
