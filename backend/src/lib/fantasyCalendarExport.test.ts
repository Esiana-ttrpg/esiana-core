import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildFantasyCalendarExportPayload,
  fantasyCalendarExportFilename,
} from './fantasyCalendarExport.js';
import { parseFantasyCalendarExport } from './fantasyCalendarImport.js';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../test/fixtures',
);

function loadSomerdenFixture(): unknown {
  const text = readFileSync(
    path.join(fixtureDir, 'fantasy-calendar-somerden.json'),
    'utf8',
  );
  return JSON.parse(text);
}

test('fantasyCalendarExportFilename slugifies calendar names', () => {
  assert.equal(fantasyCalendarExportFilename('Somerden'), 'somerden-fantasy-calendar.json');
  assert.equal(fantasyCalendarExportFilename('  '), 'calendar-fantasy-calendar.json');
});

test('buildFantasyCalendarExportPayload round-trips somerden fixture', () => {
  const parsed = parseFantasyCalendarExport(loadSomerdenFixture());
  const exported = buildFantasyCalendarExportPayload({
    name: parsed.calendarName,
    epochOffset: 0n,
    weekdays: parsed.weekdays,
    months: parsed.months.map(({ name, length, type, climateAspect }) => ({
      name,
      length,
      type,
      climateAspect,
    })),
    moons: parsed.moons,
    currentEpochMinute: parsed.currentEpochMinute,
  });

  const roundTripped = parseFantasyCalendarExport(exported);

  assert.equal(roundTripped.calendarName, 'Somerden');
  assert.equal(roundTripped.months.length, 12);
  assert.equal(roundTripped.weekdays.length, 5);
  assert.equal(roundTripped.moons.length, 2);
  assert.equal(roundTripped.resolvedDate.year, 4672);
  assert.equal(roundTripped.resolvedDate.monthIndex, 6);
  assert.equal(roundTripped.resolvedDate.day, 13);
  assert.equal(roundTripped.currentEpochMinute, parsed.currentEpochMinute);
  assert.equal(roundTripped.months[6]?.name, 'Stormsbreath');
});

test('buildFantasyCalendarExportPayload preserves intercalary months and climate', () => {
  const exported = buildFantasyCalendarExportPayload({
    name: 'Sample',
    epochOffset: 0n,
    weekdays: [{ name: 'Mon', length: 1 }],
    months: [
      { name: 'Month A', length: 30, type: 'standard', climateAspect: 'NEUTRAL' },
      { name: 'Leap Day', length: 1, type: 'intercalary', climateAspect: 'PLUVIAL' },
      { name: 'Month B', length: 30, type: 'standard', climateAspect: 'ARID' },
    ],
    moons: [],
    currentEpochMinute: 40n * 1440n,
  });

  const roundTripped = parseFantasyCalendarExport(exported);
  assert.equal(roundTripped.months[1]?.type, 'intercalary');
  assert.equal(roundTripped.months[1]?.climateAspect, 'PLUVIAL');
  assert.equal(roundTripped.months[2]?.climateAspect, 'ARID');

  const timespans = (
    exported.static_data as { year_data: { timespans: Array<{ type: string; climateAspect?: string }> } }
  ).year_data.timespans;
  assert.equal(timespans[1]?.type, 'intercalary');
  assert.equal(timespans[1]?.climateAspect, 'PLUVIAL');
  assert.equal(timespans[0]?.climateAspect, undefined);
});

test('buildFantasyCalendarExportPayload includes intraday time in dynamic_data', () => {
  const exported = buildFantasyCalendarExportPayload({
    name: 'Clocked',
    epochOffset: 0n,
    weekdays: [{ name: 'Mon', length: 1 }],
    months: [{ name: 'Month', length: 30, type: 'standard', climateAspect: 'NEUTRAL' }],
    moons: [],
    currentEpochMinute: 10n * 1440n + 9n * 60n + 45n,
  });

  const dynamic = exported.dynamic_data as {
    epoch: number;
    hour: number;
    minute: number;
  };
  assert.equal(dynamic.epoch, 10);
  assert.equal(dynamic.hour, 9);
  assert.equal(dynamic.minute, 45);

  const roundTripped = parseFantasyCalendarExport(exported);
  assert.equal(roundTripped.resolvedDate.hour, 9);
  assert.equal(roundTripped.resolvedDate.minute, 45);
  assert.equal(roundTripped.currentEpochMinute, 10n * 1440n + 9n * 60n + 45n);
});
