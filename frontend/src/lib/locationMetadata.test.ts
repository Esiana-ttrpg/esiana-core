import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeLocationMetadata,
  parseLocationMetadata,
} from './locationMetadata.ts';

describe('locationMetadata eraTrajectories', () => {
  it('defaults eraTrajectories to empty', () => {
    assert.deepEqual(parseLocationMetadata({}).eraTrajectories, []);
  });

  it('round-trips eraTrajectories planning fields', () => {
    const merged = mergeLocationMetadata(
      {},
      {
        eraTrajectories: [
          {
            eraId: 'era-1',
            byEraId: null,
            direction: 'Declining',
            outcome: 'Severe famine',
            gmNote: null,
          },
        ],
      },
    );
    const parsed = parseLocationMetadata(merged);
    assert.equal(parsed.eraTrajectories.length, 1);
    assert.deepEqual(parsed.eraTrajectories[0], {
      eraId: 'era-1',
      byEraId: null,
      direction: 'Declining',
      outcome: 'Severe famine',
      gmNote: null,
    });
  });
});
