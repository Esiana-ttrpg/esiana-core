import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractUnresolvedWikilinksFromBlocks,
  extractWikiEdgesFromBlocks,
  extractWikiLinkTargetIdsFromBlocks,
} from './wikiLinkExtract.js';

describe('wikiLinkExtract', () => {
  it('extracts wikiLink span targets with alias text', () => {
    const edges = extractWikiEdgesFromBlocks([
      {
        type: 'text-tiptap',
        content: {
          markdown:
            '<span data-type="wikiLink" data-id="page-a" data-label="Blackwater Keep">[[Blackwater Keep]]</span>',
        },
      },
    ]);
    assert.equal(edges.length, 1);
    assert.equal(edges[0]?.targetPageId, 'page-a');
    assert.equal(edges[0]?.aliasText, 'Blackwater Keep');
  });

  it('collects unresolved wikilink stubs', () => {
    const unresolved = extractUnresolvedWikilinksFromBlocks([
      {
        type: 'text-tiptap',
        content: {
          markdown:
            '<span data-type="wikiLink" data-id="" data-label="Ash King" data-stub="true">[[Ash King]]</span>',
        },
      },
    ]);
    assert.equal(unresolved.length, 1);
    assert.equal(unresolved[0]?.rawText, 'Ash King');
  });

  it('extracts wiki, character, and event paths', () => {
    const ids = extractWikiLinkTargetIdsFromBlocks([
      {
        type: 'text-tiptap',
        content: {
          markdown: [
            '[Wiki](/campaigns/my-campaign/wiki/page-wiki)',
            '[Hero](/campaigns/my-campaign/characters/char-1)',
            '[Event](/campaigns/my-campaign/event-evt-1)',
          ].join('\n'),
        },
      },
    ]);
    assert.deepEqual(new Set(ids), new Set(['page-wiki', 'char-1', 'event-evt-1']));
  });
});
