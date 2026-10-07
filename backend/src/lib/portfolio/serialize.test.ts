/**
 * Portfolio transform and detach semantics (unit-level helpers).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toPortfolioMetadata } from './serialize.js';

describe('toPortfolioMetadata', () => {
  it('strips campaign-scoped ids and dm secrets', () => {
    const result = toPortfolioMetadata({
      entityCategory: 'characters',
      profession: 'Wizard',
      ancestry: 'Human',
      primaryAffiliationId: 'org-1',
      ancestryId: 'anc-1',
      currentLocationId: 'loc-1',
      locationRelations: [{ locationId: 'x' }],
      partyParticipation: { active: true },
      dmSecrets: { wantsAndNeeds: 'secret' },
      appearance: { pronouns: 'she/her' },
    });
    assert.equal(result.profession, 'Wizard');
    assert.equal(result.ancestry, 'Human');
    assert.deepEqual(result.appearance, { pronouns: 'she/her' });
    assert.equal(result.entityCategory, undefined);
    assert.equal(result.primaryAffiliationId, undefined);
    assert.equal(result.dmSecrets, undefined);
    assert.equal(result.partyParticipation, undefined);
  });
});
