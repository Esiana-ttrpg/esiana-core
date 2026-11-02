import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateWritingWords } from './aggregateWritingWords.js';

const start = new Date('2026-06-01T00:00:00.000Z');
const end = new Date('2026-07-01T00:00:00.000Z');

describe('aggregateWritingWords', () => {
  it('prefers measured contribution rows over reconstructed event nets', () => {
    const aggregated = aggregateWritingWords({
      contributions: [
        {
          narrativeEventId: 'evt-1',
          occurredAt: new Date('2026-06-10T12:00:00.000Z'),
          wordsAdded: 8,
          wordsRemoved: 3,
          netChange: 5,
          availability: 'measured',
          origin: 'human',
        },
      ],
      events: [
        {
          id: 'evt-1',
          type: 'PAGE_EDITED',
          createdAt: new Date('2026-06-10T12:00:00.000Z'),
          metadata: { wordDelta: 5 },
        },
      ],
      start,
      end,
    });
    assert.equal(aggregated.wordsAdded, 8);
    assert.equal(aggregated.wordsRemoved, 3);
    assert.equal(aggregated.netChange, 5);
    assert.equal(aggregated.completeness, 'measured');
  });

  it('reconstructs unmatched historical events as net-only incomplete rows', () => {
    const aggregated = aggregateWritingWords({
      contributions: [],
      events: [
        {
          id: 'evt-old',
          type: 'PAGE_EDITED',
          createdAt: new Date('2026-06-12T12:00:00.000Z'),
          metadata: { wordDelta: 20 },
        },
      ],
      start,
      end,
    });
    assert.equal(aggregated.wordsAdded, 20);
    assert.equal(aggregated.wordsRemoved, 0);
    assert.equal(aggregated.completeness, 'reconstructed');
  });
});
