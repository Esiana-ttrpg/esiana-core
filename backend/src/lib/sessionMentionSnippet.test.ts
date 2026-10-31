import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractMentionSnippetFromBlocks,
  resolveMemorySnippet,
} from './sessionMentionSnippet.js';
import { stripSnippetMarkup } from './snippetMarkup.js';

describe('sessionMentionSnippet', () => {
  it('strips deep tag, bracket and Markdown wrappers without per-depth rescanning', () => {
    const depth = 10_000;
    assert.equal(stripSnippetMarkup('<a'.repeat(depth) + '>'.repeat(depth) + 'Mira', 'mention'), 'Mira');
    assert.equal(stripSnippetMarkup('[['.repeat(depth) + 'Éowyn 北' + ']]'.repeat(depth), 'mention'), 'Éowyn 北');
    assert.equal(stripSnippetMarkup('['.repeat(depth) + 'Mira' + '](url)'.repeat(depth), 'mention'), 'Mira');
  });

  it('keeps image labels, editor fragments and malformed delimiters compatible', () => {
    assert.equal(stripSnippetMarkup('![Éowyn 北](portrait) [[Mira]] data-type="x" >', 'mention'), 'Éowyn 北 Mira ');
    assert.equal(stripSnippetMarkup('[]() <> [[unclosed', 'mention'), ' <> [[unclosed');
    assert.equal(stripSnippetMarkup('<'.repeat(100_000), 'mention'), '<'.repeat(100_000));
    assert.equal(stripSnippetMarkup('<<a>afterdata-type="x" ><]Mira![Ash](url)', 'mention'), '<after<]MiraAsh');
    assert.equal(stripSnippetMarkup(')(x[[]<a>([[![Ash](url)x)', 'mention'), ')(x[');
  });

  it('removes tags reconstructed by nested markup removal', () => {
    const blocks = [{
      type: 'text-tiptap',
      content: {
        markdown: '[Mira](/campaigns/demo/wiki/char-mira) found <scr<script>ipt>the archive</scr</script>ipt>.',
      },
    }];
    assert.equal(
      extractMentionSnippetFromBlocks(blocks, 'char-mira'),
      'Mira found the archive.',
    );
  });

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
