import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCampaignActor } from './policy.js';
import { canViewSharedPartyBaseline } from './resourceAccess.js';
import { MembershipRoles } from './membershipRoles.js';
import { CampaignCapabilities } from './capabilities.js';

const campaign = { campaignOwnerUserId: 'owner', discoverability: 'private', allowPlayerChronologyManagement: false };
const gm = buildCampaignActor({ ...campaign, kind: 'member', userId: 'owner', membershipRole: MembershipRoles.GAMEMASTER });
const player = buildCampaignActor({ ...campaign, kind: 'member', userId: 'player', membershipRole: MembershipRoles.PARTICIPANT });
const anonymous = buildCampaignActor({ ...campaign, kind: 'anonymous' });

test('shared party baseline narrows the real actor and excludes personal access', () => {
  for (const actor of [gm, player]) {
    assert.equal(canViewSharedPartyBaseline(actor, 'Public'), true);
    assert.equal(canViewSharedPartyBaseline(actor, 'Party'), true);
    assert.equal(canViewSharedPartyBaseline(actor, 'DM_Only'), false);
    assert.equal(canViewSharedPartyBaseline(actor, 'UPLOADER_AND_MANAGERS'), false);
    assert.equal(canViewSharedPartyBaseline(actor, 'unknown'), false);
  }
  assert.equal(canViewSharedPartyBaseline(anonymous, 'Public'), false);
  assert.equal(canViewSharedPartyBaseline(anonymous, 'Party'), false);
});

test('baseline honors campaign role overrides and public campaign admission', () => {
  const revoked = buildCampaignActor({ ...campaign, kind: 'member', userId: 'player', membershipRole: MembershipRoles.PARTICIPANT,
    roleCapabilityOverrides: [{ role: MembershipRoles.PARTICIPANT, capability: CampaignCapabilities.WIKI_VIEW_PARTY, effect: 'REVOKE' }] });
  assert.equal(canViewSharedPartyBaseline(revoked, 'Party'), false);
  assert.equal(canViewSharedPartyBaseline(revoked, 'Public'), true);
  const publicVisitor = buildCampaignActor({ ...campaign, discoverability: 'public', kind: 'anonymous' });
  assert.equal(canViewSharedPartyBaseline(publicVisitor, 'Party'), false);
});
