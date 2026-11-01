import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chronologyViewParams, intervalOccurrence, linkedInterval, linkedNativeDate, nativeDateMinute } from './chronologyNavigation';
import { historicalClock, sharedHistoricalIntervals } from './historicalTimeline';
import type { TimelineOccurrenceRecord } from './chronologyApi';

const definition = {
  epochOffset: '-90071992547409934567', weekdays: [{ name: 'First', length: 1 }],
  months: [{ name: 'Rain', length: 17, type: 'standard' }, { name: 'Still', length: 2, type: 'intercalary' }],
  leapDays: [{ everyYears: 2, afterMonthIndex: 1, extraMonth: { name: 'Returning', length: 3, type: 'intercalary' } }],
  seasons: [], moons: [],
};
const axis = historicalClock(definition).axis!;
const row = (index: number, offset = 0): TimelineOccurrenceRecord => ({
  baseEventId: 'mira', calendarId: 'native', occurrenceId: 'stable-' + index + '-' + offset, occurrenceIndex: index,
  categoryId: null, visibility: 'PARTY', importance: 'NOTICE', title: 'A shared discovery', description: null,
  start: { year: 2, month: 0, day: 16 + offset, epochMinute: null }, end: { year: 2, month: 2, day: 2, epochMinute: null },
  duration: 7, dayOffset: offset, isStart: offset === 0, isContinuation: offset > 0, sourceType: 'REPEATING', prerequisiteBaseEventId: null,
});

describe('chronology navigation', () => {
  it('round trips recurrence identity and full boundaries from a continuation across leap/intercalary dates', () => {
    const intervals = sharedHistoricalIntervals([row(9, 1), row(8)], axis);
    const selected = intervals.find(value => value.recurrenceIndex === 9)!;
    const occurrence = intervalOccurrence(selected, axis)!;
    assert.equal(occurrence.start.day, 16);
    assert.equal(occurrence.dayOffset, 0);
    assert.equal(occurrence.end.monthName, 'Returning');
    assert.equal(occurrence.end.day, 3);
    assert.equal(BigInt(occurrence.end.epochMinute!) - BigInt(occurrence.start.epochMinute!), 6n * 1440n);
    const params = chronologyViewParams(new URLSearchParams('domains=&importance=&group=session&custom=keep'), 'calendar', { calendarId: 'native', occurrence });
    assert.equal(linkedInterval(new URLSearchParams(params.toString()), intervals), selected);
    assert.equal(params.get('importance'), ''); assert.equal(params.get('domains'), '');
    assert.equal(params.get('custom'), 'keep'); assert.equal(params.get('group'), 'session');
    assert.equal(params.get('focus'), 'calendar');
    assert.equal(chronologyViewParams(params, 'timeline').has('focus'), false);
  });
  it('rejects partial, mismatched, deleted and stale targets without recurrence fallback', () => {
    const intervals = sharedHistoricalIntervals([row(8), row(9)], axis);
    const occurrence = intervalOccurrence(intervals[0]!, axis)!;
    const params = chronologyViewParams(new URLSearchParams(), 'timeline', { calendarId: 'native', occurrence });
    for (const [key, value] of [['event', 'hidden'], ['track', 'other'], ['occurrence', '999'], ['occurrence', ''], ['occurrence', '1e1'], ['at', '0'], ['at', 'no date']]) {
      const invalid = new URLSearchParams(params); invalid.set(key!, value!);
      assert.equal(linkedInterval(invalid, intervals), undefined);
    }
    for (const key of ['occurrence', 'at']) {
      const invalid = new URLSearchParams(params); invalid.delete(key); assert.equal(linkedInterval(invalid, intervals), undefined);
    }
    assert.equal(linkedInterval(params, []), undefined);
  });
  it('uses native dates, rejects unsupported year/month/day coordinates and retains partial-day offsets', () => {
    const params = chronologyViewParams(new URLSearchParams('era=old&event=old&at=1'), 'timeline', { calendarId: 'native', date: { year: 2, month: 2, day: 3 } });
    const date = linkedNativeDate(params, axis)!;
    assert.deepEqual(date, { year: 2, month: 2, day: 3 });
    assert.equal((nativeDateMinute(axis, date)! - BigInt(definition.epochOffset)) % 1440n, 0n);
    assert.equal(params.has('event'), false); assert.equal(params.has('era'), false);
    for (const raw of ['0:0:1', '1:2:1', '2:2:4', '2:0:18', '2:-1:1', '2:1:0', 'bad']) {
      params.set('date', raw); assert.equal(linkedNativeDate(params, axis), null);
    }
    params.set('date', '1:0:1'); assert.equal(nativeDateMinute(axis, linkedNativeDate(params, axis)!), BigInt(definition.epochOffset));
  });
  it('keeps missing mappings native and does not fabricate pre-year-one dates', () => {
    const native = historicalClock({ ...definition, epochOffset: undefined });
    assert.equal(native.aligned, false);
    const interval = sharedHistoricalIntervals([row(0)], native.axis!)[0]!;
    assert.ok(intervalOccurrence(interval, native.axis!));
    assert.equal(intervalOccurrence({ ...interval, start: -1n }, native.axis!), null);
  });
});
