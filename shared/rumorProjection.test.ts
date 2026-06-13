import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AwarenessScopes,
  CirculationEdgeKinds,
  CirculationTargetKinds,
  CirculationVisibilities,
  RumorStances,
  type RumorCirculationRecord,
} from './rumorEngine.js';
import {
  assembleRegionRumorFeed,
  computeActiveCirculations,
  filterCirculationsForAudience,
} from './rumorProjection.js';
import type { LoreClaimRecord } from './loreKnowledge.js';
import { KnowledgeStates } from './loreKnowledge.js';

function circ(partial: Partial<RumorCirculationRecord> & Pick<RumorCirculationRecord, 'id' | 'claimId' | 'targetRef'>): RumorCirculationRecord {
  return {
    stableKey: `sk-${partial.id}`,
    campaignId: 'camp-1',
    edgeKind: CirculationEdgeKinds.CIRCULATION,
    targetKind: CirculationTargetKinds.REGION,
    stance: RumorStances.ASSERTS,
    awarenessScope: AwarenessScopes.REGIONAL,
    visibility: CirculationVisibilities.GM_ONLY,
    spreadEventId: 'evt-1',
    circulatedAtEpochMinute: '100',
    ...partial,
  };
}

function claim(id: string, pageId: string): LoreClaimRecord {
  return {
    id,
    stableKey: `claim-${id}`,
    pageId,
    campaignId: 'camp-1',
    statement: `Statement ${id}`,
    confidence: 'UNVERIFIED',
    visibility: 'PARTY',
    knowledgeState: KnowledgeStates.SUSPECTED,
    sortOrder: 0,
  };
}

describe('computeActiveCirculations', () => {
  it('excludes circulations after asOf', () => {
    const active = computeActiveCirculations(
      [
        circ({ id: 'c1', claimId: 'cl1', targetRef: 'loc-1', circulatedAtEpochMinute: '50' }),
        circ({ id: 'c2', claimId: 'cl1', targetRef: 'loc-1', circulatedAtEpochMinute: '150' }),
      ],
      '100',
    );
    assert.equal(active.length, 1);
    assert.equal(active[0]?.id, 'c1');
  });

  it('applies retraction edges', () => {
    const active = computeActiveCirculations(
      [
        circ({ id: 'c1', claimId: 'cl1', targetRef: 'loc-1', circulatedAtEpochMinute: '50' }),
        {
          ...circ({ id: 'r1', claimId: 'cl1', targetRef: 'loc-1', circulatedAtEpochMinute: '80' }),
          edgeKind: CirculationEdgeKinds.RETRACTION,
          supersedesCirculationId: 'c1',
        },
      ],
      '100',
    );
    assert.equal(active.length, 0);
  });
});

describe('filterCirculationsForAudience', () => {
  it('party sees only PARTY visibility', () => {
    const rows = [
      circ({ id: 'c1', claimId: 'cl1', targetRef: 'loc-1', visibility: CirculationVisibilities.GM_ONLY }),
      circ({ id: 'c2', claimId: 'cl1', targetRef: 'loc-1', visibility: CirculationVisibilities.PARTY }),
    ];
    const party = filterCirculationsForAudience(rows, false);
    assert.equal(party.length, 1);
    assert.equal(party[0]?.id, 'c2');
  });
});

describe('assembleRegionRumorFeed', () => {
  const scope = {
    anchorLocationPageId: 'loc-anchor',
    regionKey: 'north',
    locationPageIds: ['loc-anchor', 'loc-child'],
    regionLabels: ['north'],
    orgPageIdsInScope: [],
  };

  it('dedupes multiple circulations for one claim', () => {
    const cl = claim('cl1', 'loc-child');
    const feed = assembleRegionRumorFeed({
      ctx: { asOfEpochMinute: '200', isElevated: true },
      scope,
      circulations: [
        circ({ id: 'c1', claimId: 'cl1', targetRef: 'loc-anchor', circulatedAtEpochMinute: '100' }),
        circ({ id: 'c2', claimId: 'cl1', targetRef: 'loc-anchor', circulatedAtEpochMinute: '150', stance: RumorStances.DENIES }),
      ],
      claims: [cl],
      claimSources: [],
      interpretations: [],
    });
    assert.equal(feed.items.length, 1);
    assert.equal(feed.items[0]?.activeCirculations.length, 2);
    assert.equal(feed.items[0]?.stance, RumorStances.DENIES);
  });

  it('party feed omits claim with only GM_ONLY circulations', () => {
    const cl = claim('cl1', 'loc-child');
    const feed = assembleRegionRumorFeed({
      ctx: { asOfEpochMinute: '200', isElevated: false },
      scope,
      circulations: [
        circ({
          id: 'c1',
          claimId: 'cl1',
          targetRef: 'loc-anchor',
          visibility: CirculationVisibilities.GM_ONLY,
        }),
        circ({
          id: 'c2',
          claimId: 'cl1',
          targetRef: 'loc-anchor',
          visibility: CirculationVisibilities.GM_ONLY,
        }),
      ],
      claims: [cl],
      claimSources: [],
      interpretations: [],
    });
    assert.equal(feed.items.length, 0);
  });

  it('party feed includes claim with PARTY circulation in scope', () => {
    const cl = claim('cl1', 'loc-child');
    const feed = assembleRegionRumorFeed({
      ctx: { asOfEpochMinute: '200', isElevated: false },
      scope,
      circulations: [
        circ({
          id: 'c1',
          claimId: 'cl1',
          targetRef: 'loc-anchor',
          visibility: CirculationVisibilities.PARTY,
        }),
      ],
      claims: [cl],
      claimSources: [],
      interpretations: [],
    });
    assert.equal(feed.items.length, 1);
  });
});
