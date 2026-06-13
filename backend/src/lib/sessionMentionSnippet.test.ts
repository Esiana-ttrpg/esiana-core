import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractMentionSnippetFromBlocks,
  resolveMemorySnippet,
} from './sessionMentionSnippet.js';

describe('sessionMentionSnippet', () => {
  it('extracts plain text around the last wikilink span mention', () => {
    const blocks = [
      {
        type: 'text-tiptap',
        content: {
          markdown:
            'Earlier they met the guard. Then <span data-type="wikiLink" data-id="char-mario" data-label="Mario">Mario</span> asked about the ghost coin again.',
        },
      },
    ];

    const snippet = extractMentionSnippetFromBlocks(blocks, 'char-mario');
    assert.match(snippet ?? '', /Mario asked about the ghost coin again/i);
  });

  it('extracts snippet from markdown wiki path links', () => {
    const blocks = [
      {
        type: 'text-tiptap',
        content: {
          markdown:
            'The party spoke with [Peach](/campaigns/demo/wiki/char-peach) before leaving the castle.',
        },
      },
    ];

    const snippet = extractMentionSnippetFromBlocks(blocks, 'char-peach');
    assert.match(snippet ?? '', /party spoke with Peach/i);
  });

  it('returns null when target is not mentioned', () => {
    const blocks = [
      {
        type: 'text-tiptap',
        content: { markdown: 'Nothing relevant here.' },
      },
    ];

    assert.equal(extractMentionSnippetFromBlocks(blocks, 'missing-id'), null);
  });

  it('falls back to knownFor when session blocks have no mention', () => {
    const snippet = resolveMemorySnippet({
      sessionBlocks: [
        {
          type: 'text-tiptap',
          content: { markdown: 'No character links in this note.' },
        },
      ],
      characterPageId: 'char-1',
      knownFor: 'Night watch veteran',
    });

    assert.equal(snippet, 'Night watch veteran');
  });

  it('prefers session excerpt over knownFor', () => {
    const snippet = resolveMemorySnippet({
      sessionBlocks: [
        {
          type: 'text-tiptap',
          content: {
            markdown:
              '<span data-type="wikiLink" data-id="char-1" data-label="Snaks">Snaks</span> negotiated with the merchant.',
          },
        },
      ],
      characterPageId: 'char-1',
      knownFor: 'Night watch veteran',
    });

    assert.match(snippet ?? '', /Snaks negotiated with the merchant/i);
  });
});
