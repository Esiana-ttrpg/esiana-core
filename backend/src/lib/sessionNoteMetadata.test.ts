import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  anchorMetadataForTimeline,
  authorMetadataForSession,
} from './sessionNotesCombined.js';
import {
  isLegacyStandaloneSessionNote,
  isSessionAnchorPage,
  isSessionAuthorPage,
} from './sessionNoteMetadata.js';

describe('sessionNoteMetadata', () => {
  it('treats anchor pages as not author pages', () => {
    const anchor = anchorMetadataForTimeline('tp-1', 'user-1', '100');
    assert.equal(isSessionAnchorPage(anchor), true);
    assert.equal(isSessionAuthorPage(anchor), false);
  });

  it('treats per-member author pages as author pages', () => {
    const author = authorMetadataForSession('tp-1', 'tp-1', 'user-2', '100');
    assert.equal(isSessionAuthorPage(author), true);
    assert.equal(isSessionAnchorPage(author), false);
  });

  it('identifies legacy standalone uploads', () => {
    assert.equal(
      isLegacyStandaloneSessionNote({ sessionNoteAuthorId: 'user-1' }),
      true,
    );
    assert.equal(
      isLegacyStandaloneSessionNote(
        authorMetadataForSession('tp-1', 'tp-1', 'user-1'),
      ),
      false,
    );
    assert.equal(
      isLegacyStandaloneSessionNote(anchorMetadataForTimeline('tp-1', 'user-1')),
      false,
    );
  });
});
