import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCampaignActor } from './policy.js';
import { CampaignCapabilities as C } from './capabilities.js';
import type { CampaignRoleCapabilityOverrideRow } from './capabilityOverrides.js';
import { canCreateDowntimeResource, canEditDowntimeResource, canDeleteDowntimeResource,
  canChangeDowntimeVisibility, type DowntimeResourceAccess } from './downtimeAccess.js';

const own: DowntimeResourceAccess = { ownerType: 'USER', ownerUserId: 'enve', visibility: 'PARTY' };
const party: DowntimeResourceAccess = { visibility: 'PARTY', ownerType: 'PARTY', ownerPartyId: 'party' };
function actor(role = 'PARTICIPANT', overrides: CampaignRoleCapabilityOverrideRow[] = []) {
  return buildCampaignActor({ kind: 'member', userId: 'enve', membershipRole: role,
    campaignOwnerUserId: 'gm', discoverability: 'private', allowPlayerChronologyManagement: false,
    partyId: 'party', roleCapabilityOverrides: overrides });
}

test('default Player creates, edits and deletes personal resources without Manage', () => {
  assert.equal(canCreateDowntimeResource(actor()), true);
  assert.equal(canEditDowntimeResource(actor(), own), true);
  assert.equal(canDeleteDowntimeResource(actor(), own), true);
  assert.equal(canEditDowntimeResource(actor(), { ...own, ownerUserId: 'another' }), false);
  assert.equal(canDeleteDowntimeResource(actor(), { ...own, ownerUserId: 'another' }), false);
});
test('party collaboration permits editing, never implicit deletion', () => {
  assert.equal(canEditDowntimeResource(actor(), party), true);
  assert.equal(canDeleteDowntimeResource(actor(), party), false);
  assert.equal(canEditDowntimeResource(actor(), { ...party, ownerPartyId: 'other' }), false);
});
test('hidden and deleted resources fail closed even for their owner or a downtime manager', () => {
  for (const viewer of [actor(), actor('PARTICIPANT', [{ role: 'PARTICIPANT', capability: C.DOWNTIME_MANAGE, effect: 'GRANT' }])]) {
    for (const hidden of [{ ...own, visibility: 'GM_ONLY' }, { ...own, deletedAt: new Date() }]) {
      assert.equal(canEditDowntimeResource(viewer, hidden), false);
      assert.equal(canDeleteDowntimeResource(viewer, hidden), false);
    }
  }
});
test('visibility changes require independent permission and visibility of both tiers', () => {
  assert.equal(canChangeDowntimeVisibility(actor(), 'PARTY', 'PUBLIC'), false);
  assert.equal(canChangeDowntimeVisibility(actor(), 'PARTY', 'PARTY'), true);
  const allowed = actor('PARTICIPANT', [{ role: 'PARTICIPANT', capability: C.PAGE_VISIBILITY_EDIT, effect: 'GRANT' }]);
  assert.equal(canChangeDowntimeVisibility(allowed, 'PARTY', 'PUBLIC'), true);
  assert.equal(canChangeDowntimeVisibility(allowed, 'PARTY', 'GM_ONLY'), false);
});
test('Writer, Player and Observer effective grants and revocations are respected', () => {
  for (const role of ['WRITER', 'PARTICIPANT', 'OBSERVER'] as const) {
    assert.equal(canCreateDowntimeResource(actor(role, [
      { role, capability: C.DOWNTIME_MANAGE, effect: 'REVOKE' },
      { role, capability: C.DOWNTIME_CREATE, effect: 'REVOKE' },
    ])), false);
    const granted = actor(role, [
      { role, capability: C.DOWNTIME_CREATE, effect: 'GRANT' },
      { role, capability: C.PAGE_EDIT_OWNED, effect: 'GRANT' },
      { role, capability: C.DOWNTIME_DELETE_OWNED, effect: 'GRANT' },
    ]);
    assert.equal(canCreateDowntimeResource(granted), true);
    assert.equal(canEditDowntimeResource(granted, own), true);
    assert.equal(canDeleteDowntimeResource(granted, own), true);
    assert.equal(canEditDowntimeResource(actor(role, [
      { role, capability: C.PAGE_EDIT_OWNED, effect: 'REVOKE' },
      { role, capability: C.PAGE_EDIT_ANY, effect: 'REVOKE' },
      { role, capability: C.DOWNTIME_MANAGE, effect: 'REVOKE' },
    ]), own), false);
    assert.equal(canEditDowntimeResource(actor(role, [
      { role, capability: C.WIKI_VIEW_PARTY, effect: 'REVOKE' },
      { role, capability: C.NARRATIVE_ELEVATED_VIEW, effect: 'REVOKE' },
    ]), own), false);
  }
});
test('Delete Own can be revoked independently of Edit Own', () => {
  const viewer = actor('PARTICIPANT', [{ role: 'PARTICIPANT', capability: C.DOWNTIME_DELETE_OWNED, effect: 'REVOKE' }]);
  assert.equal(canEditDowntimeResource(viewer, own), true);
  assert.equal(canDeleteDowntimeResource(viewer, own), false);
});
test('anonymous grants never authorize mutations; legacy ownership stays administrative', () => {
  const anonymous = buildCampaignActor({ kind: 'anonymous', campaignOwnerUserId: 'gm',
    discoverability: 'public', allowPlayerChronologyManagement: false });
  assert.equal(canCreateDowntimeResource(anonymous), false);
  assert.equal(canEditDowntimeResource(anonymous, own), false);
  const legacy: DowntimeResourceAccess = { ownerType: 'STAFF', visibility: 'PARTY' };
  assert.equal(canEditDowntimeResource(actor(), legacy), false);
  assert.equal(canEditDowntimeResource(actor('WRITER'), legacy), true);
  assert.equal(canDeleteDowntimeResource(actor('WRITER'), legacy), true);
});
