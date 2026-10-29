import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calendarMonthDays,
  compareCalendarEvents,
  eventDayState,
} from './calendarPresentation.js';
import { configuredClimateAspect } from './climateAspect.js';
import {
  buildCalendarMonthViewport,
  calendarEpochMinuteForDate,
  type FantasyCalendarLike,
} from './timeEngine.js';
import type { TimelineOccurrenceRecord } from './chronologyApi.js';

const calendar: FantasyCalendarLike = {
  epochOffset: 12345n,
  weekdays: [
    { name: 'First', length: 2 },
    { name: 'Last', length: 3 },
  ],
  months: [
    { name: 'Rain', length: 30, climateAspect: 'PLUVIAL' },
    { name: 'Gathering', length: 3, type: 'intercalary' },
    { name: 'Quiet', length: 25 },
  ],
  moons: [
    { name: 'Aster', cycleDays: 8 },
    { name: 'Iris', cycleDays: 16 },
  ],
  seasons: [
    { name: 'Returning', startMonthIndex: 0, startDay: 1 },
    { name: 'Bloom', startMonthIndex: 0, startDay: 15 },
  ],
  leapDays: [
    {
      everyYears: 2,
      afterMonthIndex: 0,
      month: {
        name: 'Leap',
        length: 2,
        type: 'intercalary',
        climateAspect: 'ARID',
      },
    },
  ],
};

describe('calendar duration cues', () => {
  it('distinguishes single days and both days of a two-day event', () => {
    assert.equal(
      eventDayState({ duration: 1, dayOffset: 0 }),
      'Single-day event',
    );
    assert.equal(eventDayState({ duration: 2, dayOffset: 0 }), 'Event begins');
    assert.equal(eventDayState({ duration: 2, dayOffset: 1 }), 'Event ends');
  });
  it('does not invent a beginning or ending when the visible range is clipped', () => {
    // The event started last month and continues into the following month.
    assert.equal(
      eventDayState({ duration: 75, dayOffset: 25 }),
      'Event continues',
    );
    assert.equal(
      eventDayState({ duration: 75, dayOffset: 54 }),
      'Event continues',
    );
    assert.equal(eventDayState({ duration: 75, dayOffset: 74 }), 'Event ends');
    // Each repeat uses its own provided day offset.
    assert.equal(eventDayState({ duration: 75, dayOffset: 0 }), 'Event begins');
  });
  it('sorts importance before title and uses occurrence identity to break ties', () => {
    const events = [
      { importance: 'NOTICE', title: 'A', occurrenceId: '1' },
      { importance: 'MINOR', title: 'A', occurrenceId: '2' },
      { importance: 'MAJOR', title: 'Z', occurrenceId: '4' },
      { importance: 'MAJOR', title: 'Z', occurrenceId: '3' },
    ] as TimelineOccurrenceRecord[];
    assert.deepEqual(
      events.sort(compareCalendarEvents).map((row) => row.occurrenceId),
      ['3', '4', '2', '1'],
    );
  });
});

describe('configured calendar context', () => {
  it('distinguishes absent/invalid climate from explicitly configured neutral', () => {
    for (const value of [undefined, null, '', 'invented', []])
      assert.equal(configuredClimateAspect(value), undefined);
    assert.equal(configuredClimateAspect('neutral'), 'NEUTRAL');
    assert.equal(calendarMonthDays(calendar, 1, 0).climateAspect, 'PLUVIAL');
    assert.equal(calendarMonthDays(calendar, 1, 2).climateAspect, undefined);
  });
  it('uses calendar-local days with two independent moons and season transitions', () => {
    const { days } = calendarMonthDays(calendar, 1, 0);
    assert.equal(days.size, 30);
    assert.deepEqual(days.get(1)?.activeMoonPhases, [
      { name: 'Aster', phase: 'new' },
      { name: 'Iris', phase: 'new' },
    ]);
    assert.deepEqual(days.get(5)?.activeMoonPhases, [
      { name: 'Aster', phase: 'full' },
      { name: 'Iris', phase: 'first quarter' },
    ]);
    assert.equal(days.get(14)?.seasonName, 'Returning');
    assert.equal(days.get(15)?.seasonName, 'Bloom');
    assert.equal(days.get(30)?.day, 30);
    assert.deepEqual(
      calendarMonthDays({ ...calendar, moons: [] }, 1, 0).days.get(1)
        ?.activeMoonPhases,
      [],
    );
  });
  it('preserves custom weekday columns, intercalary days and configured leap climate', () => {
    const viewport = buildCalendarMonthViewport(
      calendarEpochMinuteForDate(calendar, 1, 2, 1),
      calendar,
    );
    assert.deepEqual(viewport.columnLabels, [
      'First',
      'First',
      'Last',
      'Last',
      'Last',
    ]);
    assert.equal(calendarMonthDays(calendar, 1, 1).days.size, 3);
    assert.equal(calendarMonthDays(calendar, 2, 1).days.size, 2);
    assert.equal(calendarMonthDays(calendar, 2, 1).climateAspect, 'ARID');
    assert.equal(calendarMonthDays(calendar, 2, 1).isIntercalary, true);
    assert.equal(calendarMonthDays(calendar, 2, 2).days.size, 3);
  });
});
