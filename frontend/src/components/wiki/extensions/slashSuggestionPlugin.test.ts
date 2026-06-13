import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findSlashQuery } from './slashSuggestionPlugin.js';

function mockView(text: string, cursorOffset: number) {
  const parent = {
    textBetween(_from: number, to: number) {
      return text.slice(0, to);
    },
  };

  return {
    state: {
      selection: { from: cursorOffset },
      doc: {
        resolve() {
          return {
            parent,
            parentOffset: cursorOffset,
            depth: 1,
            node(_depth: number) {
              return { type: { spec: { code: false } } };
            },
          };
        },
      },
    },
    coordsAtPos: () => ({ bottom: 100, left: 50 }),
  } as Parameters<typeof findSlashQuery>[0];
}

describe('findSlashQuery', () => {
  it('detects slash query at end of text', () => {
    const text = 'Met /cap';
    const result = findSlashQuery(mockView(text, text.length));
    assert.equal(result?.query, 'cap');
    assert.equal(result?.from, text.length - 4);
  });

  it('detects empty slash at block start', () => {
    const text = '/';
    const result = findSlashQuery(mockView(text, 1));
    assert.equal(result?.query, '');
    assert.equal(result?.from, 0);
  });

  it('returns null when no slash trigger', () => {
    const text = 'plain prose';
    assert.equal(findSlashQuery(mockView(text, text.length)), null);
  });

  it('returns null inside url-like path', () => {
    const text = 'see https://example.com/foo';
    assert.equal(findSlashQuery(mockView(text, text.length)), null);
  });
});
