import assert from 'node:assert/strict';
import { test } from 'node:test';
import { characterAudienceMetadata } from './characterAudienceMetadata.js';

const canView = (visibility: string) => ['PUBLIC', 'PARTY'].includes(visibility.toUpperCase());
test('character projection preserves identity and removes hidden references and cached labels', () => {
  const raw = { profession: 'Navigator', appearance: { pronouns: 'she/they' }, currentLocationId: 'harbor',
    ancestryId: 'hidden', ancestry: 'Secret ancestry', primaryAffiliationId: 'hidden', familyId: 'hidden',
    gmNotes: 'secret', unknownPluginData: 'secret', eraTrajectories: ['private plan'],
    quickInfo: [{ key: 'Location', value: 'Secret harbor' }, { key: 'Pronouns', value: 'she/they' }] };
  const projected = characterAudienceMetadata(raw, 'mira', new Set(['harbor']), canView, new Set());
  assert.equal(projected.profession, 'Navigator');
  assert.equal(projected.currentLocationId, 'harbor');
  assert.equal(projected.primaryAffiliationId, null);
  assert.equal(projected.familyId, null);
  assert.equal(projected.ancestryId, null);
  assert.equal(projected.ancestry, undefined);
  assert.deepEqual(projected.quickInfo, [{ key: 'Pronouns', value: 'she/they' }]);
  assert.doesNotMatch(JSON.stringify(projected), /secret|Secret|private plan/);
  assert.equal(raw.primaryAffiliationId, 'hidden', 'projection does not mutate canonical metadata');
});

test('relationship visibility and graph overrides are independent of target page visibility', () => {
  const raw = { socialLinks: [
    { id: 'shared', targetPageId: 'rowan', visibility: 'PARTY' },
    { id: 'private', targetPageId: 'rowan', visibility: 'DM_ONLY' },
    { id: 'overridden', targetPageId: 'rowan', visibility: 'PUBLIC' },
    { id: 'missing', targetPageId: 'hidden', visibility: 'PARTY' },
  ], locationRelations: [{ locationPageId: 'harbor', role: 'resident' }],
  parentLinks: [{ id: 'parent', targetCharacterId: 'hidden', visibility: 'PARTY' }] };
  const projected = characterAudienceMetadata(raw, 'mira', new Set(['rowan', 'harbor']), canView,
    new Set(['character_social:mira:overridden', 'character_location:mira:harbor:resident']));
  assert.deepEqual(projected.socialLinks, [raw.socialLinks[0]]);
  assert.deepEqual(projected.locationRelations, []);
  assert.deepEqual(projected.parentLinks, []);
});
