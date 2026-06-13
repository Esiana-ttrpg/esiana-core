import assert from 'node:assert/strict';
import test from 'node:test';
import {
  capConvergenceEntries,
  filterEntriesForViewer,
  filterEntriesSessionLinkedOnly,
} from '../../../shared/chronologyConvergence.js';
import { ChronologyDomainKind } from '../../../shared/chronologyTypes.js';
import { NarrativeVisibilityTier } from '../../../shared/narrativeProjection.js';
import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';

function stubEntry(overrides: Partial<ConvergenceTimelineEntry> = {}): ConvergenceTimelineEntry {
  return {
    entryId: 'e1',
    sortOrdinal: '1',
    instant: { epochMinute: '1', dateParts: null },
    display: { title: 'T', summary: null, dateLabel: null },
    source: {
      domain: ChronologyDomainKind.WORLD_EVENT,
      entityType: 'timeline_event',
      entityId: 'e1',
      subEntityId: null,
      collectorVersion: '1',
      collectedFrom: 'world_event',
    },
    domain: ChronologyDomainKind.WORLD_EVENT,
    domainPayload: {
      domain: ChronologyDomainKind.WORLD_EVENT,
      payload: {
        baseEventId: 'e1',
        occurrenceId: 'o1',
        categoryId: null,
        prerequisiteBaseEventId: null,
        sourceType: 'STATIC',
        visibility: 'PUBLIC',
      },
    },
    projection: {
      visible: true,
      visibilityTier: NarrativeVisibilityTier.PUBLIC,
      revelationState: null,
      temporalMode: 'present_only',
      suppressReason: null,
    },
    links: [],
    sessionLink: null,
    ...overrides,
  };
}

test('filterEntriesForViewer hides suppressed for party', () => {
  const entries = [
    stubEntry({ entryId: 'visible' }),
    stubEntry({
      entryId: 'hidden',
      projection: {
        visible: false,
        visibilityTier: NarrativeVisibilityTier.ELEVATED_ONLY,
        revelationState: null,
        temporalMode: 'present_only',
        suppressReason: 'unrevealed',
      },
    }),
  ];
  const filtered = filterEntriesForViewer(entries, false);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.entryId, 'visible');
});

test('filterEntriesSessionLinkedOnly keeps session and linked', () => {
  const entries = [
    stubEntry({ entryId: 'world', domain: ChronologyDomainKind.WORLD_EVENT }),
    stubEntry({
      entryId: 'session',
      domain: ChronologyDomainKind.SESSION_CHRONICLE,
      domainPayload: {
        domain: ChronologyDomainKind.SESSION_CHRONICLE,
        payload: {
          timelinePointId: 'tp1',
          wikiPageId: 'wp1',
          sequenceOrder: 1,
          fantasyEpochMinute: null,
          plannedStartAt: null,
          sessionTitle: 'S1',
        },
      },
      sessionLink: { timelinePointId: 'tp1', sequenceOrder: 1 },
    }),
    stubEntry({
      entryId: 'linked',
      sessionLink: { timelinePointId: 'tp1', sequenceOrder: 1 },
    }),
  ];
  const filtered = filterEntriesSessionLinkedOnly(entries);
  assert.equal(filtered.length, 2);
  assert.ok(!filtered.some((e) => e.entryId === 'world'));
});

test('capConvergenceEntries truncates with metadata', () => {
  const entries = Array.from({ length: 5 }, (_, i) =>
    stubEntry({ entryId: `e${i}`, sortOrdinal: String(i) }),
  );
  const result = capConvergenceEntries(entries, 3);
  assert.equal(result.entries.length, 3);
  assert.equal(result.totalCollected, 5);
  assert.equal(result.capped, true);
});
