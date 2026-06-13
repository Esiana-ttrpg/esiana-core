import assert from 'node:assert/strict';
import test from 'node:test';
import { extractWikiPageExcerpt } from './wikiExcerpt.js';

test('wikiExcerpt extracts plain text from tiptap blocks', () => {
  const excerpt = extractWikiPageExcerpt([
    {
      type: 'image-display',
      content: { url: '/api/assets/x' },
    },
    {
      type: 'text-tiptap',
      content: { markdown: '# Hidden **Dungeon**\n\nA [secret](http://x) place.' },
    },
  ]);

  assert.ok(!excerpt.includes('{'));
  assert.ok(!excerpt.includes('image-display'));
  assert.match(excerpt, /Hidden/);
  assert.ok(excerpt.length <= 200);
});

test('wikiExcerpt skips DM_Only blocks for party previews', () => {
  const excerpt = extractWikiPageExcerpt(
    [
      {
        type: 'text-tiptap',
        visibility: 'DM_Only',
        content: { markdown: 'Secret cult headquarters' },
      },
      {
        type: 'text-tiptap',
        content: { markdown: 'Public town square' },
      },
    ],
    { includeDmOnlyBlocks: false },
  );

  assert.match(excerpt, /Public town square/);
  assert.doesNotMatch(excerpt, /Secret cult/);
});
