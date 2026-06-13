import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  applyFantasyCalendarImport,
  FantasyCalendarImportError,
  parseCoercedNumber,
  parseFantasyCalendarExport,
} from './fantasyCalendarImport.js';

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

test('parseCoercedNumber accepts numeric strings', () => {
  assert.equal(parseCoercedNumber('28'), 28);
  assert.equal(parseCoercedNumber(28), 28);
  assert.equal(parseCoercedNumber(''), null);
});

test('parseFantasyCalendarExport maps somerden.json export', () => {
  const parsed = parseFantasyCalendarExport(loadSomerdenFixture());

  assert.equal(parsed.calendarName, 'Somerden');
  assert.equal(parsed.months.length, 12);
  assert.equal(parsed.weekdays.length, 5);
  assert.equal(parsed.moons.length, 2);
  assert.equal(parsed.resolvedDate.year, 4672);
  assert.equal(parsed.resolvedDate.monthIndex, 6);
  assert.equal(parsed.resolvedDate.day, 13);
  assert.equal(parsed.months[6]?.name, 'Stormsbreath');
  assert.ok(
    parsed.months.every((month) => month.climateAspect === 'NEUTRAL'),
    'somerden export has no climate fields; months default to NEUTRAL',
  );
  assert.equal(parsed.weekdays[0]?.name, 'Arcanaforge');
  assert.equal(parsed.moons[0]?.cycleDays, 28);
});

test('parseFantasyCalendarExport uses dynamic_data.epoch with intraday offset', () => {
  const parsed = parseFantasyCalendarExport(loadSomerdenFixture());
  assert.equal(parsed.currentEpochMinute, BigInt(1681752) * BigInt(1440));
});

test('parseFantasyCalendarExport preserves climateAspect from timespan', () => {
  const parsed = parseFantasyCalendarExport({
    static_data: {
      year_data: {
        global_week: ['Mon'],
        timespans: [
          { name: 'Dry Season', type: 'month', length: 30, climateAspect: 'ARID' },
        ],
      },
      moons: [],
    },
    dynamic_data: { year: 1, timespan: 0, day: 1, epoch: 0 },
  });

  assert.equal(parsed.months[0]?.climateAspect, 'ARID');
});

test('parseFantasyCalendarExport preserves intercalary index order', () => {
  const parsed = parseFantasyCalendarExport({
    name: 'Intercalary Sample',
    dynamic_data: { year: 1, timespan: 2, day: 1, epoch: 40 },
    static_data: {
      year_data: {
        global_week: ['Mon'],
        timespans: [
          { name: 'Month A', type: 'month', length: 30 },
          { name: 'Leap Day', type: 'intercalary', length: 1 },
          { name: 'Month B', type: 'month', length: 30 },
        ],
      },
      moons: [],
    },
  });

  assert.equal(parsed.months.length, 3);
  assert.equal(parsed.months[1]?.type, 'intercalary');
  assert.equal(parsed.months[1]?.sourceIndex, 1);
  assert.equal(parsed.months[2]?.name, 'Month B');
});

test('parseFantasyCalendarExport rejects missing timespans', () => {
  assert.throws(
    () =>
      parseFantasyCalendarExport({
        static_data: { year_data: { global_week: ['Mon'], timespans: [] } },
      }),
    FantasyCalendarImportError,
  );
});

test('applyFantasyCalendarImport creates a new timeline when one already exists', async () => {
  const parsed = parseFantasyCalendarExport(loadSomerdenFixture());
  const calendars: Array<{
    id: string;
    campaignId: string;
    name: string;
    isMasterTime: boolean;
    epochOffset: bigint;
  }> = [];
  let campaignEpoch = 100n;

  const tx = {
    fantasyCalendar: {
      count: async () => calendars.length,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `cal-${calendars.length + 1}`,
          campaignId: String(data.campaignId),
          name: String(data.name),
          isMasterTime: Boolean(data.isMasterTime),
          epochOffset: (data.epochOffset as bigint) ?? 0n,
        };
        calendars.push(row);
        return row;
      },
    },
    campaign: {
      update: async ({
        data,
      }: {
        data: { currentEpochMinute: bigint };
      }) => {
        campaignEpoch = data.currentEpochMinute;
        return { currentEpochMinute: campaignEpoch };
      },
      findUniqueOrThrow: async () => ({ currentEpochMinute: campaignEpoch }),
    },
  };

  calendars.push({
    id: 'cal-existing',
    campaignId: 'camp-1',
    name: 'Existing master',
    isMasterTime: true,
    epochOffset: 0n,
  });

  const result = await applyFantasyCalendarImport(
    tx as never,
    'camp-1',
    parsed,
  );

  assert.equal(calendars.length, 2);
  assert.equal(result.createdNewTimeline, true);
  assert.equal(result.isMasterTime, false);
  assert.equal(result.calendarName, 'Somerden');
  assert.equal(campaignEpoch, 100n);
});
