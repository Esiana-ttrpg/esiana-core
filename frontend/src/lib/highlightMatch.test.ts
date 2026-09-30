import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { highlightMatchSegments } from './highlightMatch.js';

describe('highlightMatchSegments', () => {
  it('returns plain text when there are no tokens', () => {
    assert.deepEqual(highlightMatchSegments('Yuna', []), [
      { type: 'text', value: 'Yuna' },
    ]);
  });

  it('marks case-insensitive matches and preserves casing', () => {
    assert.deepEqual(highlightMatchSegments('raised on Besaid island', ['besaid']), [
      { type: 'text', value: 'raised on ' },
      { type: 'mark', value: 'Besaid' },
      { type: 'text', value: ' island' },
    ]);
  });

  it('merges overlapping token hits', () => {
    const segments = highlightMatchSegments('Besaid', ['be', 'besaid']);
    assert.deepEqual(segments, [{ type: 'mark', value: 'Besaid' }]);
  });
});
