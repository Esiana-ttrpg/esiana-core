import assert from 'node:assert/strict';
import test from 'node:test';
import { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import { presentDowntimePerson, resolveLifecycleAssignment } from './downtimePeopleService.js';

test('inactive and former relationships clear their current assignment', () => {
  assert.deepEqual(resolveLifecycleAssignment('INACTIVE', { havenId: 'haven-1', projectId: null }), { havenId: null, projectId: null });
  assert.deepEqual(resolveLifecycleAssignment('FORMER', { havenId: null, projectId: 'project-1' }), { havenId: null, projectId: null });
});

test('returning to active does not manufacture a previous assignment', () => {
  assert.deepEqual(resolveLifecycleAssignment('ACTIVE', { havenId: null, projectId: null }), { havenId: null, projectId: null });
});

test('active relationships retain exactly their current assignment', () => {
  assert.deepEqual(resolveLifecycleAssignment('ACTIVE', { havenId: 'haven-1', projectId: null }), { havenId: 'haven-1', projectId: null });
});

test('hireling presentation uses the canonical Character workspace path', () => {
  const person = presentDowntimePerson({
    id: 'relationship-1',
    characterPage: {
      id: 'cmuuxgjuz001g22t9zyp1h6ve',
      title: 'Nyra',
      visibility: 'PARTY',
      workspace: CampaignWorkspace.CHARACTERS,
      pathKey: 'nyra',
      templateType: 'CHARACTER',
    },
    haven: null,
    project: null,
    compensationUnpaid: false,
    compensationAmount: null,
    compensationCurrency: null,
    compensationCadence: null,
    relationshipType: 'HIRELING',
    role: null,
    status: 'ACTIVE',
    features: [],
    notes: null,
    startedAtEpochMinute: null,
    endedAtEpochMinute: null,
  }, 'red-sands', 'PLAYER', false);

  assert.equal(person.characterHref, '/campaigns/red-sands/characters/nyra');
});
