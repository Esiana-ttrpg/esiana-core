import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityGraphEntityTypes, EntityRelationKinds } from './entityGraph.js';
import { RELATIONS_RENDER_CAP_DEFAULTS } from './relationsRenderCaps.js';
import {
  buildNarrativeSummary,
  projectSocialRelations,
  type RelationsProjectionInput,
} from './relationshipLensProjections.js';

describe('buildNarrativeSummary', () => {
  it('provides empty-state bullet', () => {
    const summary = buildNarrativeSummary({
      at: 'current',
      tensions: [],
      partyStandings: [],
      conflicts: [],
    });
    assert.deepEqual(summary.bullets, ['No major tensions recorded at this time.']);
  });
});

describe('projectSocialRelations', () => {
  it('aggregates bloc overview with tensions', () => {
    const input: RelationsProjectionInput = {
      window: {
        lens: 'social',
        mode: 'blocs',
        level: 'summary',
        focus: { kind: 'party' },
        at: 'current',
      },
      caps: RELATIONS_RENDER_CAP_DEFAULTS,
      edges: [
        {
          id: 'e1',
          source: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: 'org-a' },
          target: { entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: 'org-b' },
          relationKind: EntityRelationKinds.ORG_DIPLOMATIC,
          direction: 'directed',
          startDate: null,
          endDate: null,
          visibility: null,
          payload: {
            kind: EntityRelationKinds.ORG_DIPLOMATIC,
            stance: 'HOSTILE',
            relationType: 'MILITARY',
          },
          sourceDomain: 'wiki_metadata',
          sourceRecordKey: 'k1',
          sourcePageId: 'org-a',
        },
      ],
      nodePreviews: new Map([
        [
          'wiki_page:org-a',
          {
            entityType: EntityGraphEntityTypes.WIKI_PAGE,
            entityId: 'org-a',
            title: 'Iron Confederacy',
          },
        ],
        [
          'wiki_page:org-b',
          {
            entityType: EntityGraphEntityTypes.WIKI_PAGE,
            entityId: 'org-b',
            title: 'Verdant Circle',
          },
        ],
      ]),
      orgPages: [
        { id: 'org-a', title: 'Iron Confederacy', templateType: 'DEFAULT', metadata: {} },
        { id: 'org-b', title: 'Verdant Circle', templateType: 'DEFAULT', metadata: {} },
      ],
      reputationByFaction: {
        'org-a': { trust: -42, notoriety: 10, lastSimulatedAtEpochMinute: null },
      },
    };
    const model = projectSocialRelations(input);
    assert.ok(model.blocs.length > 0);
    assert.equal(model.tensions[0]?.polarity, 'negative');
    assert.ok(
      model.narrativeSummary.bullets.some((b) => b.includes('escalating tensions')),
    );
  });
});
