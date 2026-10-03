import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  enrichPassageMarkdownForDisplay,
  countWordsInPassage,
} from './sessionAggregateEnrichment.js';

describe('sessionAggregateEnrichment', () => {
  it('inserts markdown links for detected entities in a passage', () => {
    const full = 'We followed Captain Varro to the gate.';
    const start = 0;
    const end = full.length;
    const varroStart = full.indexOf('Captain Varro');
    const enriched = enrichPassageMarkdownForDisplay({
      fullMarkdown: full,
      start,
      end,
      detectedEntities: [
        {
          start: varroStart,
          end: varroStart + 'Captain Varro'.length,
          pageId: 'varro-id',
        },
      ],
      campaignHandle: 'demo',
    });
    assert.match(enriched, /\[Captain Varro\]\(/);
    assert.match(enriched, /varro-id/);
    assert.equal(full.includes('['), false);
  });

  it('counts words in a passage', () => {
    assert.equal(countWordsInPassage('one two three'), 3);
    assert.equal(countWordsInPassage('  '), 0);
  });
});
