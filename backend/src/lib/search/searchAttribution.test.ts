import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  matchesAuthorFilter,
  resolveSearchDocumentAuthor,
} from './searchAttribution.js';

describe('searchAttribution', () => {
  it('prefers sessionNoteAuthorId then timeline author for session notes', () => {
    assert.equal(
      resolveSearchDocumentAuthor('session-note', {
        metadata: { sessionNoteAuthorId: 'author-1' },
        timelineAuthorId: 'author-2',
        createdByUserId: 'creator',
      }),
      'author-1',
    );
    assert.equal(
      resolveSearchDocumentAuthor('session-note', {
        metadata: {},
        timelineAuthorId: 'author-2',
        createdByUserId: 'creator',
      }),
      'author-2',
    );
  });

  it('uses USER owner for journals, else creator', () => {
    assert.equal(
      resolveSearchDocumentAuthor('journal', {
        ownerType: 'USER',
        ownerUserId: 'owner-1',
        createdByUserId: 'creator',
      }),
      'owner-1',
    );
    assert.equal(
      resolveSearchDocumentAuthor('journal', {
        ownerType: 'STAFF',
        ownerUserId: null,
        createdByUserId: 'creator',
      }),
      'creator',
    );
  });

  it('uses createdByUserId for generic wiki types', () => {
    assert.equal(
      resolveSearchDocumentAuthor('character', {
        createdByUserId: 'creator',
      }),
      'creator',
    );
  });

  it('null attribution never matches from:', () => {
    assert.equal(
      matchesAuthorFilter(
        'character',
        { createdByUserId: null },
        ['user-1'],
      ),
      false,
    );
  });

  it('matches any of multiple resolved userIds (duplicate names)', () => {
    assert.equal(
      matchesAuthorFilter(
        'character',
        { createdByUserId: 'user-b' },
        ['user-a', 'user-b'],
      ),
      true,
    );
  });
});
