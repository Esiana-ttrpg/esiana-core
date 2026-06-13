import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCapabilities } from './capabilities.js';
import { CampaignDiscoverability } from './discoverability.js';
import { MembershipRoles } from './membershipRoles.js';
import {
  buildCampaignActor,
  can,
  canAccessCampaignContainer,
  canEditPage,
  hasElevatedNarrativeView,
  resolveActorCapabilities,
} from './policy.js';
import { PageOwnerTypes } from './pageOwnership.js';

const campaignBase = {
  campaignOwnerUserId: 'owner-1',
  discoverability: CampaignDiscoverability.PRIVATE,
  allowPlayerChronologyManagement: true,
};

describe('campaign policy', () => {
  it('campaign owner with writer role gets admin caps', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'owner-1',
      membershipRole: MembershipRoles.WRITER,
      ...campaignBase,
    });
    const caps = resolveActorCapabilities(actor);
    assert.ok(caps.has(CampaignCapabilities.CAMPAIGN_DELETE));
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT), false);
  });

  it('gamemaster without ownership has settings but not delete', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'gm-2',
      membershipRole: MembershipRoles.GAMEMASTER,
      ...campaignBase,
    });
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_SETTINGS_EDIT), true);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_DELETE), false);
    assert.equal(can(actor, CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT), false);
  });

  it('visibility edit only for campaign owner', () => {
    const owner = buildCampaignActor({
      kind: 'member',
      userId: 'owner-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    const gm = buildCampaignActor({
      kind: 'member',
      userId: 'gm-2',
      membershipRole: MembershipRoles.GAMEMASTER,
      ...campaignBase,
    });
    assert.equal(can(owner, CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT), true);
    assert.equal(can(gm, CampaignCapabilities.CAMPAIGN_VISIBILITY_EDIT), false);
  });

  it('participant chronology when campaign allows player management', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
    });
    assert.equal(can(actor, CampaignCapabilities.CHRONOLOGY_EDIT), true);
    const disabled = buildCampaignActor({
      kind: 'member',
      userId: 'p-2',
      membershipRole: MembershipRoles.PARTICIPANT,
      ...campaignBase,
      allowPlayerChronologyManagement: false,
    });
    assert.equal(can(disabled, CampaignCapabilities.CHRONOLOGY_EDIT), false);
  });

  it('anonymous private campaign has no access', () => {
    const actor = buildCampaignActor({
      kind: 'anonymous',
      ...campaignBase,
    });
    assert.equal(canAccessCampaignContainer(actor), false);
  });

  it('anonymous unlisted campaign can view', () => {
    const actor = buildCampaignActor({
      kind: 'anonymous',
      ...campaignBase,
      discoverability: CampaignDiscoverability.UNLISTED,
    });
    assert.equal(canAccessCampaignContainer(actor), true);
    assert.equal(can(actor, CampaignCapabilities.PAGE_EDIT_ANY), false);
  });

  it('elevated narrative view for gamemaster', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'gm-2',
      membershipRole: MembershipRoles.GAMEMASTER,
      ...campaignBase,
    });
    assert.equal(hasElevatedNarrativeView(actor), true);
  });

  it('participant can edit party-owned page with matching partyId', () => {
    const actor = buildCampaignActor({
      kind: 'member',
      userId: 'p-1',
      membershipRole: MembershipRoles.PARTICIPANT,
      partyId: 'party-1',
      ...campaignBase,
    });
    assert.equal(
      canEditPage(actor, {
        ownerType: PageOwnerTypes.PARTY,
        ownerPartyId: 'party-1',
      }),
      true,
    );
    assert.equal(
      canEditPage(actor, {
        ownerType: PageOwnerTypes.STAFF,
      }),
      false,
    );
  });
});
