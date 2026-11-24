import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { selectScopedCampaignIds } from './visibility.js';

const memberships = [
  { campaignId: 'public-1', discoverability: 'public' },
  { campaignId: 'private-1', discoverability: 'private' },
  { campaignId: 'unlisted-1', discoverability: 'unlisted' },
];

describe('selectScopedCampaignIds', () => {
  it('includes every current membership for the owner', () => {
    const scoped = selectScopedCampaignIds({
      subjectMemberships: memberships,
      viewerCampaignIds: [],
      visibility: 'owner',
    });
    assert.deepEqual(scoped.campaignIds, ['public-1', 'private-1', 'unlisted-1']);
  });

  it('keeps public aggregates to publicly discoverable campaigns only', () => {
    const scoped = selectScopedCampaignIds({
      subjectMemberships: memberships,
      viewerCampaignIds: ['private-1'],
      visibility: 'public',
    });
    assert.deepEqual(scoped.campaignIds, ['public-1']);
  });

  it('lets a viewer-authorized context include shared private campaigns but not unshared ones', () => {
    const scoped = selectScopedCampaignIds({
      subjectMemberships: memberships,
      viewerCampaignIds: ['private-1'],
      visibility: 'viewerAuthorized',
    });
    assert.deepEqual(scoped.campaignIds, ['public-1', 'private-1']);
  });

  it('treats an out-of-scope campaign filter as unknown rather than leaking it', () => {
    const publicOnly = selectScopedCampaignIds({
      subjectMemberships: memberships,
      viewerCampaignIds: [],
      visibility: 'public',
      campaignId: 'private-1',
    });
    assert.equal(publicOnly.unknownCampaign, true);
    assert.deepEqual(publicOnly.campaignIds, []);
  });
});
