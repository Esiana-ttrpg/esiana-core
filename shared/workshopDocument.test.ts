import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkshopDraftMetadata,
  isWorkshopDraftMetadata,
  isWorkshopDraftsRootMetadata,
} from './workshopDocument.ts';

test('isWorkshopDraftMetadata identifies workshop drafts', () => {
  assert.equal(
    isWorkshopDraftMetadata(
      buildWorkshopDraftMetadata({ authorUserId: 'user-1', anchorEntityIds: ['a'] }),
    ),
    true,
  );
  assert.equal(isWorkshopDraftMetadata({ isDraft: false }), false);
});

test('isWorkshopDraftsRootMetadata identifies infrastructure root', () => {
  assert.equal(isWorkshopDraftsRootMetadata({ workshopDraftsRoot: true }), true);
  assert.equal(isWorkshopDraftsRootMetadata({ isDraft: true }), false);
});
