import assert from 'node:assert/strict';
import test from 'node:test';
import {
  anchorFromTimelineOccurrence,
  buildChronologyEntryId,
  buildChronologySortOrdinal,
  chronologyInstantSortKey,
  compareChronologyInstants,
} from '../../../shared/chronologyTypes.js';
import { mergeAndSortEntries as mergeEntries } from '../../../shared/chronologyConvergence.js';
import { buildConvergenceEntry } from '../../../shared/chronologyConvergence.js';
import {
  buildNarrativeViewerContext,
  NarrativeVisibilityTier,
} from '../../../shared/narrativeProjection.js';
import {
  ChronologyDomainKind,
  ChronologySourceEntityType,
} from '../../../shared/chronologyTypes.js';

test('buildChronologyEntryId is stable for same inputs', () => {
  const instant = { epochMinute: '100', dateParts: { year: 1, month: 0, day: 1 } };
  const a = buildChronologyEntryId({
    domain: ChronologyDomainKind.WORLD_EVENT,
    sourceEntityType: ChronologySourceEntityType.TIMELINE_EVENT,
    sourceEntityId: 'evt1',
    subEntityId: 'occ1',
    instant,
  });
  const b = buildChronologyEntryId({
    domain: ChronologyDomainKind.WORLD_EVENT,
    sourceEntityType: ChronologySourceEntityType.TIMELINE_EVENT,
    sourceEntityId: 'evt1',
    subEntityId: 'occ1',
    instant,
  });
  assert.equal(a, b);
  assert.match(a, /^world_event:/);
});

test('compareChronologyInstants orders by epoch', () => {
  const early = { epochMinute: '10', dateParts: null };
  const late = { epochMinute: '20', dateParts: null };
  assert.ok(compareChronologyInstants(early, late) < 0);
  assert.equal(chronologyInstantSortKey(early), 10n);
});

test('buildChronologySortOrdinal is deterministic', () => {
  const anchor = anchorFromTimelineOccurrence({
    occurrenceId: 'occ_a',
    baseEventId: 'base_a',
    title: 'A',
    description: null,
    visibility: 'PARTY',
    categoryId: null,
    prerequisiteBaseEventId: null,
    sourceType: 'STATIC',
    start: { year: 5, month: 1, day: 2, epochMinute: '500' },
  });
  const o1 = buildChronologySortOrdinal(anchor);
  const o2 = buildChronologySortOrdinal(anchor);
  assert.equal(o1, o2);
});

test('ConvergenceTimelineEntry round-trips JSON', () => {
  const anchor = anchorFromTimelineOccurrence({
    occurrenceId: 'occ_json',
    baseEventId: 'base_json',
    title: 'Test',
    description: 'Sum',
    visibility: 'PUBLIC',
    categoryId: null,
    prerequisiteBaseEventId: null,
    sourceType: 'STATIC',
    start: { year: 1, month: 0, day: 1, epochMinute: '42' },
  });
  const ctx = buildNarrativeViewerContext({
    role: 'DM',
    campaignNow: {
      epochMinute: 42n,
      dateParts: { year: 1, month: 0, day: 1 },
    },
  });
  const entry = buildConvergenceEntry(
    anchor,
    ctx,
    { campaignHandle: 'test-campaign' },
    new Map(),
  );
  const cloned = JSON.parse(JSON.stringify(entry)) as typeof entry;
  assert.equal(cloned.entryId, entry.entryId);
  assert.equal(cloned.projection.visible, true);
  assert.equal(cloned.display.title, 'Test');
  assert.ok(Array.isArray(cloned.links));
});

test('mergeAndSortEntries orders by sortOrdinal', () => {
  const mk = (sortOrdinal: string, entryId: string) => ({
    entryId,
    sortOrdinal,
    instant: { epochMinute: null, dateParts: null },
    display: { title: entryId, summary: null, dateLabel: null },
    source: {
      domain: ChronologyDomainKind.WORLD_EVENT,
      entityType: 'timeline_event',
      entityId: entryId,
      subEntityId: null,
      collectorVersion: '1',
      collectedFrom: 'world_event',
    },
    domain: ChronologyDomainKind.WORLD_EVENT,
    domainPayload: {
      domain: ChronologyDomainKind.WORLD_EVENT,
      payload: {
        baseEventId: entryId,
        occurrenceId: 'o',
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
  });
  const sorted = mergeEntries([mk('000000000000000002:00', 'b'), mk('000000000000000001:00', 'a')]);
  assert.equal(sorted[0]?.entryId, 'a');
});
