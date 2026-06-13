import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEntityPreviewBase, buildEntityPreviewProjection } from './entityPreview.ts';
import {
  buildEntityRelationshipProjection,
  familyLivingMembers,
} from './entityProjectionQueries.ts';
import type { WikiPageLineageSnapshot } from './entityProjectionQueries.ts';
import { normalizeRecordId } from './entityRelationTypes.ts';

const campaignNow = { year: 402, month: null, day: null };

function makeSnapshot(
  id: string,
  title: string,
  templateType: string,
  metadata: unknown,
): WikiPageLineageSnapshot {
  return { id, title, templateType, metadata };
}

describe('entityProjectionQueries', () => {
  const orgA = makeSnapshot('org-a', 'Alpha Syndicate', 'ORGANIZATION', {
    relations: [
      {
        id: normalizeRecordId('rel-a'),
        targetOrgId: 'org-b',
        history: [
          {
            id: normalizeRecordId('evt-a1'),
            effectiveDate: { year: 400, month: null, day: null },
            relationType: 'DIPLOMATIC',
            stance: 'ALLY',
            visibility: 'PUBLIC',
          },
          {
            id: normalizeRecordId('evt-a2'),
            effectiveDate: { year: 402, month: null, day: null },
            relationType: 'DIPLOMATIC',
            stance: 'HOSTILE',
            visibility: 'PUBLIC',
            note: 'Border clash',
          },
        ],
      },
    ],
  });

  const orgB = makeSnapshot('org-b', 'City Guard', 'ORGANIZATION', { relations: [] });

  const character = makeSnapshot('char-1', 'Alden', 'CHARACTER', {
    orgAffiliations: [
      {
        id: normalizeRecordId('aff-1'),
        orgId: 'org-a',
        role: 'Enforcer',
        startDate: { year: 401, month: null, day: null },
        endDate: null,
        visibility: 'PUBLIC',
      },
    ],
    parentLinks: [
      {
        id: normalizeRecordId('link-1'),
        targetCharacterId: 'char-2',
        relationshipType: 'BIOLOGICAL',
        isBiological: true,
        isLegal: true,
        isPublic: true,
        visibility: 'PUBLIC',
      },
    ],
  });

  const parent = makeSnapshot('char-2', 'Elder Alden', 'CHARACTER', {
    familyId: 'family-1',
    birthDate: { year: 370, month: null, day: null },
  });

  const flatPages = [orgA, orgB, character, parent];

  it('does not mutate input snapshots', () => {
    const frozen = flatPages.map((p) => ({ ...p, metadata: structuredClone(p.metadata) }));
    const before = JSON.stringify(frozen);
    buildEntityRelationshipProjection('org-a', 'ORGANIZATION', frozen, campaignNow, true);
    assert.equal(JSON.stringify(frozen), before);
  });

  it('returns provenance on diplomatic tensions at boundary date', () => {
    const projection = buildEntityRelationshipProjection(
      'org-a',
      'ORGANIZATION',
      flatPages,
      campaignNow,
      true,
    );
    assert.equal(projection.diplomaticTensions.length, 1);
    const row = projection.diplomaticTensions[0]!;
    assert.equal(row.stance, 'HOSTILE');
    assert.deepEqual(row.sourceRelationIds, [
      normalizeRecordId('rel-a'),
      normalizeRecordId('evt-a2'),
    ]);
    assert.equal(row.note, 'Border clash');
  });

  it('projects character affiliations and bloodline roots', () => {
    const projection = buildEntityRelationshipProjection(
      'char-1',
      'CHARACTER',
      flatPages,
      campaignNow,
      true,
    );
    assert.equal(projection.affiliations.length, 1);
    assert.equal(projection.affiliations[0]?.org.title, 'Alpha Syndicate');
    assert.equal(projection.bloodlineRoots.length, 1);
    assert.equal(projection.bloodlineRoots[0]?.character.title, 'Elder Alden');
  });

  it('includes designated family head without familyId on character', () => {
    const head = makeSnapshot('char-head', 'House Head', 'CHARACTER', {});
    const familyMeta = { headCharacterId: 'char-head' };
    const living = familyLivingMembers('family-1', familyMeta, [head], campaignNow);
    assert.equal(living.length, 1);
    assert.equal(living[0]?.title, 'House Head');
  });

  it('round-trips through JSON serialization', () => {
    const projection = buildEntityRelationshipProjection(
      'char-1',
      'CHARACTER',
      flatPages,
      campaignNow,
      true,
    );
    const roundTrip = JSON.parse(JSON.stringify(projection));
    assert.deepEqual(roundTrip.affiliations[0]?.sourceRelationIds, [
      normalizeRecordId('aff-1'),
    ]);
  });
});

describe('entityPreview', () => {
  const flatPages = [
    makeSnapshot('org-a', 'Alpha Syndicate', 'ORGANIZATION', {
      motto: 'Iron binds',
      leaderId: 'char-1',
    }),
    makeSnapshot('char-1', 'Alden', 'CHARACTER', {}),
  ];

  it('splits base from projection', () => {
    const base = buildEntityPreviewBase('org-a', flatPages);
    assert.ok(base);
    assert.equal(base?.motto, 'Iron binds');
    assert.equal(base?.leaderTitle, 'Alden');

    const projection = buildEntityPreviewProjection('org-a', flatPages, {
      campaignNow,
      isDMUser: true,
      viewerOrgId: 'org-b',
    });
    assert.ok(projection);
  });
});
