import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createHistoricalAxis, dayX, fitTimeline, historicalCoverage, historicalEraGeometry,
  historicalTicks, initialHistoricalViewport, moveViewport, normalizeHistoricalOccurrences,
  packHistoricalIntervals, viewportDay, zoomViewport, type HistoricalInterval,
} from './historicalTimeline';
import { calendarEpochMinuteForDate, type FantasyCalendarLike } from './timeEngine';
import type { ChronologyEra } from '@shared/chronologyEras';
import type { ChronologyTimelineBundle, TimelineOccurrenceRecord } from './chronologyApi';

const calendar: FantasyCalendarLike = {
  epochOffset: 9876543210123456789n,
  weekdays: [{ name: 'First', length: 1 }, { name: 'Second', length: 1 }],
  months: [{ name: 'Rain', length: 17, type: 'standard' }, { name: 'Still', length: 2, type: 'intercalary' }, { name: 'Bloom', length: 23, type: 'standard' }],
  leapDays: [{ everyYears: 2, afterMonthIndex: 1, extraMonth: { name: 'Returning', length: 3, type: 'intercalary' } }],
  seasons: [], moons: [],
};
const occurrence = (id: string, importance: 'MAJOR' | 'MINOR' | 'NOTICE' = 'MINOR', index = 0, offset = 0): TimelineOccurrenceRecord => ({
  occurrenceId: `${id}-${index}-${offset}`, baseEventId: id, occurrenceIndex: index,
  calendarId: 'world', categoryId: null, importance, title: id, description: null,
  visibility: 'PARTY', start: { year: 2, month: 0, day: 16 + offset, epochMinute: '0' },
  end: { year: 2, month: 2, day: 2, epochMinute: '0' }, duration: 7,
  dayOffset: offset, isStart: offset === 0, isContinuation: offset > 0,
  sourceType: 'REPEATING', prerequisiteBaseEventId: null,
});
describe('historical timeline calendar geometry', () => {
  it('matches existing arithmetic across custom segments and leap years without losing epoch precision', () => {
    const axis = createHistoricalAxis(calendar);
    for (const year of [1, 2, 3, 10, 100]) for (const month of [0, 1, 2]) {
      const parts = { year, month, day: 1 };
      const day = axis.date(parts)!;
      assert.equal(calendar.epochOffset + day * 1440n, calendarEpochMinuteForDate(calendar, year, month, 1));
      const state = axis.state(day);
      assert.deepEqual([state.year, state.monthIndex, state.day], [year, month, 1]);
    }
    assert.equal(axis.date({ year: -1, month: 0, day: 1 }), null);
    assert.equal(axis.date({ year: 1, month: 0, day: 18 }), null);
    assert.equal(axis.date({ year: null, month: 0, day: 1 }), null);
  });
  it('preserves pointer-anchored zoom and pans without bigint precision loss', () => {
    const view = { origin: 90071992547409930n, offset: .25, span: 100 };
    const zoomed = zoomViewport(view, .4, .3);
    assert.equal(view.offset + view.span * .3,
      Number(zoomed.origin - view.origin) + zoomed.offset + zoomed.span * .3);
    const moved = moveViewport(moveViewport(view, 12.5), -12.5);
    assert.deepEqual(moved, view);
    assert.equal(viewportDay(view, .5), view.origin + 50n);
    assert.equal(moveViewport({ origin: 0n, offset: 0, span: 20 }, -5).origin, 0n);
  });
  it('normalizes continuation rows and separate repetitions while preserving representative identity', () => {
    const axis = createHistoricalAxis(calendar);
    const first = occurrence('Mira'), continuation = occurrence('Mira', 'MINOR', 0, 1);
    const second = { ...occurrence('Mira', 'MINOR', 1), start: { ...first.start, year: 3 } };
    const rows = normalizeHistoricalOccurrences([continuation, second, first], axis);
    assert.equal(rows.length, 2);
    const interval = rows.find(row => row.recurrenceIndex === 0)!;
    assert.equal(interval.calendarId, 'world'); assert.equal(interval.baseEventId, 'Mira');
    assert.equal(interval.representative.occurrenceId, first.occurrenceId);
    assert.equal(interval.start, axis.date(first.start));
    assert.equal(interval.end - interval.start, 7n);
    assert.equal(axis.state(interval.end - 1n).monthName, 'Returning');
    const partial = normalizeHistoricalOccurrences([continuation], axis)[0]!;
    assert.equal(partial.start, interval.start);
    assert.equal(partial.representative.occurrenceId, continuation.occurrenceId);
  });
  it('positions era backgrounds at inclusive date boundaries and retains open ends', () => {
    const axis = createHistoricalAxis(calendar), view = { origin: 0n, offset: 0, span: 100 };
    const era = { id: 'era', startDate: { year: 1, month: 0, day: 5 }, endDate: { year: 1, month: 1, day: 2 } } as ChronologyEra;
    const band = historicalEraGeometry(era, axis, view, 1000);
    assert.equal(band.x, 40); assert.equal(band.width, 150);
    const open = historicalEraGeometry({ ...era, startDate: null, endDate: null }, axis, view, 1000);
    assert.equal(open.width, 1000); assert.equal(open.end, null); assert.equal(open.start, null);
    assert.ok(open.openStart && open.openEnd);
  });
  it('generates bounded calendar-aligned ticks through century scales', () => {
    const axis = createHistoricalAxis(calendar);
    for (const span of [5, 40, 500, 10_000, 100_000]) {
      const ticks = historicalTicks(axis, { origin: 0n, offset: 0, span }, 900);
      assert.ok(ticks.length > 1 && ticks.length <= 160);
      assert.ok(ticks.every((tick, index) => index === 0 || tick.day > ticks[index - 1]!.day));
      if (span > 500) assert.ok(ticks.every(tick => axis.state(tick.day).day === 1 && axis.state(tick.day).monthIndex === 0));
    }
  });
  it('centers an annual initial view and falls back to events or bounded eras', () => {
    const axis = createHistoricalAxis(calendar), now = { year: 3, month: 0, day: 5 };
    const view = initialHistoricalViewport(axis, now, [], []);
    assert.equal(view.span, 42); assert.equal(viewportDay(view, .5), axis.date(now));
    const rows = normalizeHistoricalOccurrences([occurrence('Sable')], axis);
    assert.deepEqual(initialHistoricalViewport(axis, null, rows, []), fitTimeline(rows[0]!.start, rows[0]!.end));
    const era = { startDate: now, endDate: { year: 4, month: 0, day: 1 }, isCurrent: true } as ChronologyEra;
    assert.deepEqual(initialHistoricalViewport(axis, null, [], [era]), fitTimeline(axis.date(now)!, axis.date(era.endDate!)! + 1n));
    const open = { ...era, startDate: null };
    assert.equal(viewportDay(initialHistoricalViewport(axis, null, [], [open]), .5), axis.date(era.endDate!));
    const fallbackTicks = historicalTicks(createHistoricalAxis({ ...calendar, months: [], leapDays: [] }), { origin: 0n, offset: 0, span: 100 }, 900);
    assert.ok(fallbackTicks.length > 0 && fallbackTicks.every(tick => tick.day % 30n === 0n));
  });
});

describe('historical timeline bounded layout and coverage', () => {
  const axis = createHistoricalAxis(calendar);
  const dense = Array.from({ length: 70 }, (_, index) => occurrence(`discovery-${String(index).padStart(2, '0')}`, index < 4 ? 'MAJOR' : 'MINOR'));
  const rows = normalizeHistoricalOccurrences(dense, axis);
  const view = { origin: rows[0]!.start - 1n, offset: 0, span: 42 };
  it('caps lanes, preserves complete membership, deterministic ordering, and major emphasis', () => {
    const layout = packHistoricalIntervals(rows, view, 900);
    assert.equal(layout.laneCount, 12);
    assert.equal(layout.marks.length, 11); assert.equal(layout.clusters.length, 1);
    assert.equal(layout.clusters[0]!.members.length, 59);
    assert.ok(layout.marks.slice(0, 4).every(mark => mark.interval.representative.importance === 'MAJOR'));
    const represented = [...layout.marks.map(mark => mark.interval.key), ...layout.clusters.flatMap(cluster => cluster.members.map(member => member.key))];
    assert.equal(new Set(represented).size, rows.length);
    assert.deepEqual(packHistoricalIntervals([...rows].reverse(), view, 900), layout);
  });
  it('reuses lanes while reserving label footprints and culls distant intervals', () => {
    const events: HistoricalInterval[] = [0, 1, 20, 1000].map((start, index) => ({ ...rows[index]!, start: BigInt(start), end: BigInt(start + 1) }));
    const layout = packHistoricalIntervals(events, { origin: 0n, offset: 0, span: 30 }, 900);
    assert.equal(layout.marks.length, 3);
    assert.equal(layout.marks[0]!.lane, layout.marks[2]!.lane);
    assert.notEqual(layout.marks[0]!.lane, layout.marks[1]!.lane);
  });
  it('never claims completeness from an unenforced window or forced recurrence cap', () => {
    for (const warnings of [[], ['UNBOUNDED_RULE_FORCED_CAP'], ['CAP_APPLIED_TOTAL']]) {
      const metadata = { generated: { truncated: false }, warnings } as ChronologyTimelineBundle['expansionMetadata'];
      const coverage = historicalCoverage(metadata);
      assert.equal(coverage.incomplete, true); assert.equal(coverage.label, 'Fit to Loaded Events');
      assert.ok(coverage.message.length < 100);
    }
  });
});
