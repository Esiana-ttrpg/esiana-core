import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveWikiIndexPageId } from './wikiIndexEntry.js';

describe('resolveWikiIndexPageId', () => {
  it('prefers World over other pages', () => {
    const pageId = resolveWikiIndexPageId(
      (title) => (title === 'World' ? 'world-id' : undefined),
      [{ id: 'first-id' }],
    );
    assert.equal(pageId, 'world-id');
  });

  it('falls back to first flat page when World is missing', () => {
    const pageId = resolveWikiIndexPageId(
      () => undefined,
      [{ id: 'quick-access-id' }, { id: 'other-id' }],
    );
    assert.equal(pageId, 'quick-access-id');
  });

  it('returns undefined when tree is empty', () => {
    const pageId = resolveWikiIndexPageId(() => undefined, []);
    assert.equal(pageId, undefined);
  });
});
