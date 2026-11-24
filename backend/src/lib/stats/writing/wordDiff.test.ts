import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProseFromBlocks } from './proseExtract.js';
import { diffWords } from './wordDiff.js';

function blocks(markdown: string, extra?: Record<string, unknown>) {
  return [
    {
      type: 'text-tiptap',
      ...extra,
      content: { markdown },
    },
  ];
}

function diffMarkdown(previous: string, next: string) {
  return diffWords(
    extractProseFromBlocks(blocks(previous)),
    extractProseFromBlocks(blocks(next)),
  );
}

describe('wordDiff', () => {
  it('returns 0/0/0 for formatting-only markup changes', () => {
    const change = diffMarkdown(
      'The **hidden** hall is quiet.',
      'The hidden hall is *quiet*.',
    );
    assert.deepEqual(change, { wordsAdded: 0, wordsRemoved: 0, netChange: 0 });
  });

  it('returns 0/0/0 when paragraphs are reordered', () => {
    const change = diffMarkdown(
      'She opened the ledger.\n\nThe archive slept.',
      'The archive slept.\n\nShe opened the ledger.',
    );
    assert.deepEqual(change, { wordsAdded: 0, wordsRemoved: 0, netChange: 0 });
  });

  it('counts deletions without inventing replacements', () => {
    const change = diffMarkdown(
      'The river ran through the valley.',
      'The river ran.',
    );
    assert.equal(change.wordsAdded, 0);
    assert.equal(change.wordsRemoved, 3);
    assert.equal(change.netChange, -3);
  });

  it('counts replacements as both added and removed', () => {
    const change = diffMarkdown('The cat sat.', 'The dog sat.');
    assert.equal(change.wordsAdded, 1);
    assert.equal(change.wordsRemoved, 1);
    assert.equal(change.netChange, 0);
  });

  it('treats a same-length rewrite as churn, not as zero net authorship', () => {
    const change = diffMarkdown(
      'The quiet archivist copied every name.',
      'A restless cartographer burned the ledger.',
    );
    assert.ok(change.wordsAdded >= 4);
    assert.ok(change.wordsRemoved >= 4);
    assert.equal(change.netChange, change.wordsAdded - change.wordsRemoved);
    assert.notEqual(change.wordsAdded, 0);
  });

  it('attributes only this save versus the previous version, not the whole document', () => {
    const previous = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const next = previous.replace('word7', 'altered');
    const change = diffMarkdown(previous, next);
    assert.equal(change.wordsAdded, 1);
    assert.equal(change.wordsRemoved, 1);
    assert.ok(change.wordsAdded < 40);
  });

  it('ignores wiki-link targets and embedded non-prose blocks', () => {
    const previous = [
      {
        type: 'image-display',
        content: { url: '/api/assets/map' },
      },
      {
        type: 'text-tiptap',
        content: {
          markdown:
            'Visit [Mira](/c/demo/wiki/mira-id) in the hall.',
        },
      },
    ];
    const next = [
      {
        type: 'stat-block',
        content: { strength: 18 },
      },
      {
        type: 'text-tiptap',
        content: {
          markdown:
            'Visit <span data-type="wikiLink" data-id="other-id" data-label="Mira">[[Mira]]</span> in the hall.',
        },
      },
    ];
    const change = diffWords(
      extractProseFromBlocks(previous),
      extractProseFromBlocks(next),
    );
    assert.deepEqual(change, { wordsAdded: 0, wordsRemoved: 0, netChange: 0 });
  });
});
