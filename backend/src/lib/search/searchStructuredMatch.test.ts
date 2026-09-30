import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchesStructuredText } from './searchStructuredMatch.js';
import type { SearchDocument } from './searchRanking.js';

function doc(partial: Partial<SearchDocument> & { title: string }): SearchDocument {
  return { fields: [], ...partial };
}

describe('matchesStructuredText', () => {
  it('requires contiguous phrases in an authoritative field', () => {
    const hit = doc({
      title: 'Note',
      fields: [{ kind: 'body', label: 'Body', text: 'the crystal tower rises' }],
    });
    assert.equal(
      matchesStructuredText(hit, {
        phrases: ['crystal tower'],
        excludedTerms: [],
      }),
      true,
    );

    const miss = doc({
      title: 'Note',
      fields: [
        { kind: 'body', label: 'Body', text: 'crystal lights the tower' },
      ],
    });
    assert.equal(
      matchesStructuredText(miss, {
        phrases: ['crystal tower'],
        excludedTerms: [],
      }),
      false,
    );
  });

  it('removes documents containing excluded terms', () => {
    const page = doc({
      title: 'Besaid',
      fields: [{ kind: 'body', label: 'Body', text: 'island of Sin' }],
    });
    assert.equal(
      matchesStructuredText(page, { phrases: [], excludedTerms: ['sin'] }),
      false,
    );
    assert.equal(
      matchesStructuredText(page, { phrases: [], excludedTerms: ['yuna'] }),
      true,
    );
  });
});
