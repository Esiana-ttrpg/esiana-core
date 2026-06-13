import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ConvergenceTimelineEntry } from '@/lib/chronologyOverlayApi';
import { groupDomainFeedItems } from './worldAdvanceFeedGrouping.js';

const WORLD_ADVANCE = 'world_advance';
const ORG_RELATION = 'org_relation';

function stubEntry(
  entityId: string,
  effectId: string,
  title: string,
  summary: string,
): ConvergenceTimelineEntry {
  return {
    entryId: `entry-${entityId}-${effectId}`,
    sortOrdinal: '0',
    instant: { epochMinute: '100', dateParts: null },
    display: { title, summary, dateLabel: 'Day 1' },
    source: {
      domain: WORLD_ADVANCE,
      entityType: 'timeline_event',
      entityId,
      subEntityId: effectId,
      collectorVersion: 'v1',
      collectedFrom: WORLD_ADVANCE,
    },
    domain: WORLD_ADVANCE,
    domainPayload: {
      domain: WORLD_ADVANCE,
      payload: {
        batchId: 'batch-1',
        effectId,
        effectType: 'conflict_front',
        projectionDomain: 'conflict',
        summary: title,
      },
    },
    projection: {
      visible: true,
      visibilityTier: 'GM_ONLY',
      revelationState: null,
      temporalMode: 'PRESENT_ONLY',
      suppressReason: null,
    },
    links: [],
    sessionLink: null,
  };
}

describe('groupDomainFeedItems', () => {
  it('groups world advance entries by chronology event id', () => {
    const entries = [
      stubEntry('ev-1', 'e1', 'conflict: conflict_front', 'Stormsbreath 4672'),
      stubEntry('ev-1', 'e2', 'faction: append_org_relation_event', 'Stormsbreath 4672'),
      stubEntry('ev-2', 'e3', 'economic: economic_signal', 'Later headline'),
    ];
    const grouped = groupDomainFeedItems(WORLD_ADVANCE, entries);
    assert.equal(grouped.length, 2);
    assert.equal(grouped[0]?.kind, 'world_advance_batch');
    if (grouped[0]?.kind === 'world_advance_batch') {
      assert.equal(grouped[0].entries.length, 2);
      assert.equal(grouped[0].headline, 'Stormsbreath 4672');
    }
  });

  it('passes through non-world-advance domains unchanged', () => {
    const entry = stubEntry('x', 'y', 't', 's');
    entry.domain = ORG_RELATION;
    entry.source.domain = ORG_RELATION;
    const grouped = groupDomainFeedItems(ORG_RELATION, [entry]);
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0]?.kind, 'entry');
  });
});
