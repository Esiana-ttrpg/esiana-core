import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { CapabilityOverrideEffect } from '@shared/campaignPolicy/capabilityOverrides';
import { MembershipRoles } from '@shared/campaignPolicy/membershipRoles';
import {
  adventurePublicPreviewCapabilities,
  adventurePublicPreviewEligible,
  filterNodesByPreviewVisibility,
  isAdventurePreviewPerspective,
} from './adventurePreview';

describe('adventure public preview', () => {
  it('treats public as a distinct stored perspective', () => {
    assert.equal(isAdventurePreviewPerspective('public'), true);
    assert.equal(isAdventurePreviewPerspective('party'), true);
    assert.equal(isAdventurePreviewPerspective('dm'), true);
    assert.notEqual('public', 'party');
  });

  it('blocks public preview when the campaign gate is private', () => {
    assert.equal(adventurePublicPreviewEligible('private'), false);
    assert.equal(adventurePublicPreviewEligible('public'), true);
  });

  it('evaluates public preview as Observer reads, including overrides', () => {
    const campaign = {
      campaignOwnerUserId: 'owner-1',
      discoverability: 'public',
    };
    const caps = adventurePublicPreviewCapabilities(campaign);
    assert.equal(caps.has(CampaignCapabilities.CAMPAIGN_VIEW), true);
    assert.equal(caps.has(CampaignCapabilities.WIKI_VIEW_PARTY), true);
    assert.equal(caps.has(CampaignCapabilities.PAGE_CREATE), false);

    const revoked = adventurePublicPreviewCapabilities({
      ...campaign,
      roleCapabilityOverrides: [
        {
          role: MembershipRoles.OBSERVER,
          capability: CampaignCapabilities.WIKI_VIEW_PARTY,
          effect: CapabilityOverrideEffect.REVOKE,
        },
      ],
    });
    assert.equal(revoked.has(CampaignCapabilities.WIKI_VIEW_PARTY), false);
    assert.equal(revoked.has(CampaignCapabilities.CAMPAIGN_VIEW), true);
  });

  it('filters party-tier nodes when Observer cannot view campaign pages', () => {
    const caps = adventurePublicPreviewCapabilities({
      campaignOwnerUserId: 'owner-1',
      discoverability: 'public',
      roleCapabilityOverrides: [
        {
          role: MembershipRoles.OBSERVER,
          capability: CampaignCapabilities.WIKI_VIEW_PARTY,
          effect: CapabilityOverrideEffect.REVOKE,
        },
      ],
    });
    const visible = filterNodesByPreviewVisibility(
      [
        { visibility: 'Public', children: [] },
        { visibility: 'Party', children: [] },
        { visibility: 'DM_Only', children: [] },
      ],
      caps,
    );
    assert.deepEqual(
      visible.map((node) => node.visibility),
      ['Public'],
    );
  });
});
