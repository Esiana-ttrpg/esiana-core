import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAssetAccess } from './assetAccess.js';
import { AssetTypes } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { isImportStagingAssetType } from './importStagingRetention.js';

const baseAsset = {
  id: 'a1',
  url: '/uploads/x.png',
  displayUrl: null,
  thumbnailUrl: null,
  visibility: 'Party',
  campaignId: 'c1',
  expiresAt: null,
  campaign: { discoverability: 'private', campaignOwnerUserId: 'owner-1' },
};

test('isImportStagingAssetType recognizes staging zip types', () => {
  assert.equal(isImportStagingAssetType('campaign-export-zip'), true);
  assert.equal(isImportStagingAssetType('generic'), false);
});

test('evaluateAssetAccess denies non-member on private campaign', () => {
  const result = evaluateAssetAccess(
    { ...baseAsset, type: AssetTypes.GENERIC },
    null,
    undefined,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test('evaluateAssetAccess allows member on generic asset', () => {
  const result = evaluateAssetAccess(
    { ...baseAsset, type: AssetTypes.GENERIC },
    CampaignMemberRoles.PARTICIPANT,
    undefined,
    'member-1',
  );
  assert.equal(result.ok, true);
});

test('evaluateAssetAccess denies non-GM staging zip', () => {
  const result = evaluateAssetAccess(
    { ...baseAsset, type: 'campaign-export-zip' },
    CampaignMemberRoles.PARTICIPANT,
    undefined,
    'member-1',
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test('evaluateAssetAccess allows GM staging zip', () => {
  const result = evaluateAssetAccess(
    { ...baseAsset, type: 'campaign-export-zip' },
    CampaignMemberRoles.GAMEMASTER,
    undefined,
    'gm-1',
  );
  assert.equal(result.ok, true);
});

test('evaluateAssetAccess returns 410 for expired staging asset', () => {
  const result = evaluateAssetAccess(
    {
      ...baseAsset,
      type: 'campaign-export-zip',
      expiresAt: new Date(Date.now() - 60_000),
    },
    CampaignMemberRoles.GAMEMASTER,
    undefined,
    'gm-1',
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 410);
});

test('evaluateAssetAccess denies anonymous non-map asset on public campaign', () => {
  const result = evaluateAssetAccess(
    {
      ...baseAsset,
      type: AssetTypes.GENERIC,
      campaign: { discoverability: 'public', campaignOwnerUserId: 'owner-1' },
    },
    null,
    undefined,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test('assertScopedMutationCount throws when count is zero', async () => {
  const { assertScopedMutationCount, ScopedMutationNotFoundError } = await import(
    './scopedMutation.js'
  );
  assert.throws(
    () => assertScopedMutationCount(0),
    ScopedMutationNotFoundError,
  );
});
