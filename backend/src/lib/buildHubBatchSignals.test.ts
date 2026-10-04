import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractHubSessionMarkdown } from './buildHubBatchSignals.js';

describe('extractHubSessionMarkdown', () => {
  it('extracts Markdown from the canonical session note body', () => {
    const blocks = [
      {
        id: 'other-text',
        type: 'text-tiptap',
        content: { markdown: 'Not the recap.' },
      },
      {
        h: 10,
        w: 12,
        x: 0,
        y: 0,
        id: 'session-note-body',
        type: 'text-tiptap',
        content: { markdown: '## The crossing\n\nThe party reached the far shore.' },
      },
    ];

    assert.equal(
      extractHubSessionMarkdown(blocks),
      '## The crossing\n\nThe party reached the far shore.',
    );
  });

  it('supports serialized block arrays without returning their JSON', () => {
    const blocks = JSON.stringify([
      {
        id: 'session-note-body',
        type: 'text-tiptap',
        content: { markdown: 'A clean recap.' },
      },
    ]);

    assert.equal(extractHubSessionMarkdown(blocks), 'A clean recap.');
  });

  it('preserves legacy scalar Markdown that is also valid JSON', () => {
    assert.equal(extractHubSessionMarkdown('2026'), '2026');
  });

  it('falls back to the first nonempty text block and ignores unsupported structures', () => {
    assert.equal(
      extractHubSessionMarkdown([
        { type: 'image', content: { imageUrl: '/map.png' } },
        { type: 'text-tiptap', content: { markdown: '  ' } },
        { type: 'text-tiptap', content: { markdown: 'Fallback prose.' } },
      ]),
      'Fallback prose.',
    );
    assert.equal(extractHubSessionMarkdown({ markdown: 'not a block array' }), '');
  });
});
