import assert from 'node:assert/strict';
import test from 'node:test';
import {
  avatarApiUrl,
  avatarFilenameFromStoredUrl,
} from './avatarPaths.js';
import { evaluateAssetAccess } from './assetAccess.js';
import { AssetTypes } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';

test('avatarFilenameFromStoredUrl strips /uploads/ prefix', () => {
  assert.equal(
    avatarFilenameFromStoredUrl('/uploads/abc.png'),
    'abc.png',
  );
  assert.equal(
    avatarFilenameFromStoredUrl('/uploads/uploads/abc.png'),
    'abc.png',
  );
  assert.equal(avatarFilenameFromStoredUrl(null), null);
});

test('avatarApiUrl builds user avatar endpoint', () => {
  assert.equal(avatarApiUrl('user-1'), '/api/users/user-1/avatar');
});

test('evaluateAssetAccess denies non-member on private campaign', () => {
  const asset = {
    id: 'a1',
    url: '/uploads/x.png',
    displayUrl: null,
    thumbnailUrl: null,
    type: AssetTypes.GENERIC,
    visibility: 'Party',
    campaignId: 'c1',
    campaign: { discoverability: 'private', campaignOwnerUserId: 'owner-1' },
  };
  const result = evaluateAssetAccess(asset, null, undefined);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
  }
});

test('evaluateAssetAccess allows member', () => {
  const asset = {
    id: 'a1',
    url: '/uploads/x.png',
    displayUrl: null,
    thumbnailUrl: null,
    type: AssetTypes.GENERIC,
    visibility: 'Party',
    campaignId: 'c1',
    campaign: { discoverability: 'private', campaignOwnerUserId: 'owner-1' },
  };
  const result = evaluateAssetAccess(asset, CampaignMemberRoles.PARTICIPANT, undefined, 'member-1');
  assert.equal(result.ok, true);
});
