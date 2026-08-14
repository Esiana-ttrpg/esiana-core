import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCharacterConnectionProjection } from './characterConnectionProjection.ts';

describe('characterConnectionProjection', () => {
  const flatPages = [
    {
      id: 'char-a',
      title: 'Alden Sterling',
      templateType: 'DEFAULT',
      metadata: {
        familyId: 'fam-1',
        orgAffiliations: [
          {
            id: 'aff-1',
            orgId: 'org-1',
            role: 'PARTICIPANT',
            startDate: null,
            endDate: null,
            visibility: 'PUBLIC',
            sourcePageIds: ['event-1'],
          },
        ],
      },
    },
    {
      id: 'char-b',
      title: 'Nyri of Glass',
      templateType: 'DEFAULT',
      metadata: {
        familyId: 'fam-1',
        orgAffiliations: [
          {
            id: 'aff-2',
            orgId: 'org-1',
            role: 'Scout',
            startDate: null,
            endDate: null,
            visibility: 'PUBLIC',
            sourcePageIds: ['event-1'],
          },
        ],
      },
    },
    {
      id: 'fam-1',
      title: 'House Sterling',
      templateType: 'DEFAULT',
      metadata: {},
    },
    {
      id: 'org-1',
      title: 'Imperial Court',
      templateType: 'DEFAULT',
      metadata: {},
    },
    {
      id: 'event-1',
      title: 'Siege of Black Hollow',
      templateType: 'DEFAULT',
      metadata: {},
    },
  ] as const;

  const campaignNow = { year: 400, month: null, day: null };

  it('finds shared family, affiliation, and citation sources', () => {
    const result = buildCharacterConnectionProjection(
      'char-a',
      { viewerCharacterId: 'char-b' },
      flatPages,
      campaignNow,
      true,
    );

    const labels = result.connectedThrough.map((e) => e.label);
    assert.ok(labels.includes('Imperial Court'));
    assert.ok(labels.includes('House Sterling'));
    assert.ok(labels.includes('Siege of Black Hollow'));
  });

  it('returns empty when no viewer context', () => {
    const result = buildCharacterConnectionProjection(
      'char-a',
      {},
      flatPages,
      campaignNow,
      true,
    );
    assert.equal(result.connectedThrough.length, 0);
  });
});
