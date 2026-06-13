import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isCharacterWikiPage,
  resolveIdentityPageOwnershipUpdate,
  resolveMemberIdentityDisplay,
} from './memberIdentity.js';

describe('isCharacterWikiPage', () => {
  it('matches CHARACTER template type', () => {
    assert.equal(
      isCharacterWikiPage({ templateType: 'CHARACTER', metadata: null }),
      true,
    );
  });

  it('matches characters entity category metadata', () => {
    assert.equal(
      isCharacterWikiPage({
        templateType: 'GENERIC',
        metadata: { entityCategory: 'characters' },
      }),
      true,
    );
  });

  it('rejects non-character pages', () => {
    assert.equal(
      isCharacterWikiPage({
        templateType: 'LOCATION',
        metadata: { entityCategory: 'locations' },
      }),
      false,
    );
  });
});

describe('resolveIdentityPageOwnershipUpdate', () => {
  it('assigns USER ownership for character pages', () => {
    assert.deepEqual(
      resolveIdentityPageOwnershipUpdate(
        { templateType: 'CHARACTER', metadata: null },
        'user-1',
      ),
      {
        ownerType: 'USER',
        ownerUserId: 'user-1',
        ownerPartyId: null,
      },
    );
  });

  it('skips ownership transfer for non-character pages', () => {
    assert.equal(
      resolveIdentityPageOwnershipUpdate(
        { templateType: 'LOCATION', metadata: null },
        'user-1',
      ),
      null,
    );
  });
});

describe('resolveMemberIdentityDisplay', () => {
  const user = { email: 'ada@example.com', displayName: 'Ada Lovelace' };

  it('uses wiki page title as displayName and label when mapped', () => {
    const result = resolveMemberIdentityDisplay({
      user,
      identityPage: {
        id: 'page-1',
        title: 'Elara Moonwhisper',
        visibility: 'Party',
      },
      index: 0,
    });

    assert.equal(result.displayName, 'Elara Moonwhisper');
    assert.equal(result.playerContext, 'Ada Lovelace');
    assert.equal(result.label, 'Elara Moonwhisper');
    assert.equal(result.identityPageId, 'page-1');
  });

  it('falls back to account label when identity page is unset', () => {
    const result = resolveMemberIdentityDisplay({
      user,
      identityPage: null,
      index: 2,
    });

    assert.equal(result.displayName, null);
    assert.equal(result.playerContext, 'Ada Lovelace');
    assert.equal(result.label, 'Ada Lovelace');
    assert.equal(result.identityPageId, null);
  });

});
