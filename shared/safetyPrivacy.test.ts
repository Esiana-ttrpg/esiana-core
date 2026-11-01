import assert from 'node:assert/strict';
import test from 'node:test';
import { safetyTransitionAllowed } from './safetyPrivacy.js';
import { buildCampaignActor, can } from './campaignPolicy/policy.js';
import { CampaignCapabilities as C } from './campaignPolicy/capabilities.js';
test('every membership role can submit; GM manages by default and others need a grant', () => {
 for (const role of ['GAMEMASTER', 'WRITER', 'PARTICIPANT', 'OBSERVER']) {
  const input = { kind: 'member' as const, userId: 'Mira', membershipRole: role, campaignOwnerUserId: 'Sable', discoverability: 'private', allowPlayerChronologyManagement: false };
  assert.equal(can(buildCampaignActor(input), C.SAFETY_SUBMIT), true);
  assert.equal(can(buildCampaignActor(input), C.SAFETY_MANAGE), role === 'GAMEMASTER');
  if (role !== 'GAMEMASTER') {
   assert.equal(can(buildCampaignActor({ ...input, roleCapabilityOverrides: [{ role, capability: C.SAFETY_MANAGE, effect: 'GRANT' }] }), C.SAFETY_MANAGE), true);
  }
 }
});
test('resolution and decline need reasons; requesters may reopen terminal requests only', () => {
 for (const next of ['resolved','declined']) {
  assert.equal(safetyTransitionAllowed('open', next, true), false);
  assert.equal(safetyTransitionAllowed('open', next, true, '  '), false);
  assert.equal(safetyTransitionAllowed('open', next, true, 'Outcome recorded'), true);
  assert.equal(safetyTransitionAllowed('open', next, false, 'Outcome'), false);
  assert.equal(safetyTransitionAllowed(next, 'open', false), true);
 }
 assert.equal(safetyTransitionAllowed('open','in_review',false),false);
 assert.equal(safetyTransitionAllowed('open','open',true),false);
});
