import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findAtQuery } from './atMentionSuggestionPlugin.js';

function mockView(text: string) {
  return {
    state: {
      selection: { from: text.length },
      doc: { resolve: () => ({ parent: { textBetween: () => text }, parentOffset: text.length }) },
    },
    coordsAtPos: () => ({ bottom: 100, left: 50 }),
  } as Parameters<typeof findAtQuery>[0];
}

describe('findAtQuery', () => {
  it('opens for an empty mention trigger', () => {
    const result = findAtQuery(mockView('@'));
    assert.equal(result?.query, '');
    assert.deepEqual({ from: result?.from, to: result?.to }, { from: 0, to: 1 });
  });

  it('filters from a member or identity-character query', () => {
    assert.equal(findAtQuery(mockView('Ask @Imani'))?.query, 'Imani');
  });

  it('does not activate inside an email address', () => {
    assert.equal(findAtQuery(mockView('mira@example.test')), null);
  });
});

