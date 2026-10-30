import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChronologyEra } from '../../../shared/chronologyEras';
import type { TimelineOccurrenceRecord } from './chronologyApi';
import { eraBounds, eraContext, eraDateSummary, selectedEraEvents, selectWorkspaceEra } from './eraWorkspace';
import { comparisonEraGeometry, createHistoricalAxis, historicalNativeState, sharedHistoricalIntervals } from './historicalTimeline';

const axis = createHistoricalAxis({
  epochOffset: -90071992547409934567n,
  months: [{ name: 'Rain', length: 17, type: 'standard' }, { name: 'Still', length: 2, type: 'intercalary' }, { name: 'Bloom', length: 23, type: 'standard' }],
  leapDays: [{ everyYears: 2, afterMonthIndex: 1, extraMonth: { name: 'Returning', length: 3, type: 'intercalary' } }],
  weekdays: [{ name: 'Dawn', length: 1 }], seasons: [], moons: [],
});
const date = (day: number) => ({ year: 1, month: 0, day });
const era = (id = 'era', start = 5, end = 10): ChronologyEra => ({
  id, calendarId: 'world', calendarName: 'World', isMasterTime: true, name: id, sortOrder: 0, isCurrent: false,
  startDate: date(start), endDate: date(end), status: 'PRESENT', visibility: 'PARTY', overviewPageId: 'wiki-era', overview: '**Canonical**', canManage: true,
});
const occurrence = (day: number, index = day): TimelineOccurrenceRecord => ({
  occurrenceId: `occ-${index}`, baseEventId: 'journey', occurrenceIndex: index, calendarId: 'world', categoryId: null,
  importance: 'MAJOR', title: 'Mira finds the archive', description: null, visibility: 'PARTY', start: { ...date(day), epochMinute: '0' },
  end: { ...date(day), epochMinute: '0' }, duration: 1, dayOffset: 0, isStart: true, isContinuation: false,
  sourceType: 'REPEATING', prerequisiteBaseEventId: null,
});
const major = { MAJOR: true, MINOR: false, NOTICE: false };

test('selection honors explicit links and configured current before date containment and display order', () => {
  const rows = [era('first'), { ...era('configured'), isCurrent: true }];
  assert.equal(selectWorkspaceEra(rows, 'first', date(7))?.id, 'first');
  assert.equal(selectWorkspaceEra(rows, 'hidden', date(7)), undefined);
  assert.equal(selectWorkspaceEra(rows, null, date(7))?.id, 'configured');
  assert.equal(selectWorkspaceEra([era('past', 1, 2), era('today')], null, date(7))?.id, 'today');
  assert.equal(selectWorkspaceEra([era('first')], null, date(17))?.id, 'first');
  assert.equal(selectWorkspaceEra([], null), undefined);
});

test('matching history is chronological and retains every recurrence for preview overflow', () => {
  const rows = sharedHistoricalIntervals(Array.from({ length: 17 }, (_, i) => occurrence(i + 1)), axis);
  const all = { ...era(), startDate: null, endDate: null };
  const selected = selectedEraEvents([...rows].reverse(), all, axis, major);
  assert.deepEqual(selected.map(row => row.recurrenceIndex), Array.from({ length: 17 }, (_, i) => i + 1));
  assert.equal(new Set(selected.map(row => row.key)).size, 17);
  for (let length = 0; length <= 5; length++) {
    assert.equal(selectedEraEvents(rows.slice(0, length), all, axis, major).length, length);
  }
  const tied = rows.slice(0, 2).map(row => ({ ...row, start: rows[0]!.start, end: rows[0]!.end }));
  assert.deepEqual(selectedEraEvents(tied, all, axis, major), selectedEraEvents([...tied].reverse(), all, axis, major));
});

test('date summaries preserve open ends without inferring bounds from the current designation', () => {
  const format = (value: { day: number }) => `Day ${value.day}`;
  assert.equal(eraDateSummary(era(), format), 'Day 5 – Day 10');
  assert.equal(eraDateSummary({ ...era(), endDate: null }, format), 'From Day 5');
  assert.equal(eraDateSummary({ ...era(), startDate: null }, format), 'Until Day 10');
  for (const isCurrent of [false, true]) {
    assert.equal(eraDateSummary({ ...era(), startDate: null, endDate: null, isCurrent }, format), 'Dates not set');
  }
});

test('era overlap includes crossings but excludes touching exclusive boundaries and unrelated clocks', () => {
  const raw = [occurrence(3), { ...occurrence(4), duration: 3 }, occurrence(5), { ...occurrence(10), duration: 5 }, occurrence(11),
    { ...occurrence(8), calendarId: 'other' }, { ...occurrence(9), importance: 'MINOR' as const }, { ...occurrence(7), importance: 'NOTICE' as const }];
  const rows = sharedHistoricalIntervals(raw, axis);
  assert.deepEqual(selectedEraEvents(rows, era(), axis, major).map(row => row.recurrenceIndex), [4, 5, 10]);
  assert.deepEqual(selectedEraEvents(rows, era(), axis, { ...major, MINOR: true, NOTICE: true }).map(row => row.recurrenceIndex), [4, 5, 7, 9, 10]);
  assert.equal(selectedEraEvents(rows, era(), axis, { MAJOR: false, MINOR: false, NOTICE: false }).length, 0);
});

test('continuation-only bundles reconstruct native starts and deduplicate each recurrence', () => {
  const rows = sharedHistoricalIntervals([
    { ...occurrence(6, 0), dayOffset: 2, duration: 8, isStart: false, isContinuation: true },
    { ...occurrence(7, 0), occurrenceId: 'later-continuation', dayOffset: 3, duration: 8, isStart: false, isContinuation: true },
    { ...occurrence(9, 1), duration: 4 },
  ], axis);
  const selected = selectedEraEvents(rows, era(), axis, major);
  assert.equal(selected.length, 2);
  assert.equal(historicalNativeState(axis, selected[0]!.start)?.day, 4);
  assert.equal(selected[0]!.representative.occurrenceId, 'occ-0');
});

test('native leap and intercalary boundaries yield exact inclusive duration despite huge partial-day offsets', () => {
  const bounds = eraBounds({ ...era(), startDate: { year: 2, month: 1, day: 1 }, endDate: { year: 2, month: 3, day: 2 } }, axis)!;
  assert.equal(bounds.end! - bounds.start!, 7n * 1440n);
  assert.equal(historicalNativeState(axis, bounds.start!)?.monthName, 'Still');
  assert.equal(historicalNativeState(axis, bounds.end! - 1440n)?.monthName, 'Bloom');
  assert.equal(eraBounds({ ...era(), startDate: { year: 2, month: 1, day: 3 } }, axis), null);
});

test('geometry preserves gaps, unequal durations, overlaps, and unknown boundaries independently of Current', () => {
  const first = era('first', 1, 2), selected = era('selected', 5, 10), next = era('next', 13, 17);
  const rows = [next, selected, first];
  const context = eraContext(rows, selected, axis)!;
  assert.equal(context.preceding?.id, 'first'); assert.equal(context.following?.id, 'next');
  const bands = rows.map(row => comparisonEraGeometry(row, axis, context.view, 800)!);
  assert.equal(bands[1]!.width / bands[2]!.width, 3);
  assert.ok(bands[2]!.x + bands[2]!.width < bands[1]!.x);
  const overlap = comparisonEraGeometry(era('overlap', 8, 12), axis, context.view, 800)!;
  assert.ok(overlap.x < bands[1]!.x + bands[1]!.width);
  const open = { ...selected, startDate: null, endDate: null, isCurrent: false };
  const openBand = eraBounds(open, axis)!;
  assert.equal(openBand.start, null); assert.equal(openBand.end, null);
  assert.equal(openBand.era.isCurrent, false);
  assert.ok(eraContext([open], open, axis, date(7)));
  assert.equal(eraContext([{ ...selected, startDate: date(99) }], { ...selected, startDate: date(99) }, axis), null);
});
