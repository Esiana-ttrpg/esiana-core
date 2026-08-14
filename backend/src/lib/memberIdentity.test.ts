import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCharacterWikiPage,
  resolveIdentityPageOwnershipUpdate,
} from './memberIdentity.js';

test('isCharacterWikiPage uses entityCategory metadata', () => {
  assert.equal(
    isCharacterWikiPage({
      id: 'c1',
      title: 'Hero',
      parentId: null,
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'characters' },
    }),
    true,
  );
  assert.equal(
    isCharacterWikiPage({
      id: 'x',
      title: 'Note',
      parentId: null,
      templateType: 'DEFAULT',
      metadata: null,
    }),
    false,
  );
});

test('resolveIdentityPageOwnershipUpdate only for character pages', () => {
  assert.equal(
    resolveIdentityPageOwnershipUpdate(
      {
        id: 'c1',
        title: 'Hero',
        parentId: null,
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'characters' },
      },
      'user-1',
    )?.ownerUserId,
    'user-1',
  );
  assert.equal(
    resolveIdentityPageOwnershipUpdate(
      {
        id: 'l1',
        title: 'Town',
        parentId: null,
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'locations' },
      },
      'user-1',
    ),
    null,
  );
});
