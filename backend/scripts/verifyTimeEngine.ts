import { convertEpochToCalendarState } from '../src/lib/timeEngine.js';

const harptosLikeCalendar = {
  epochOffset: 0n,
  weekdays: [
    { name: 'Starday', length: 1 },
    { name: 'Sunday', length: 1 },
    { name: 'Moonday', length: 1 },
    { name: 'Tuseday', length: 1 },
    { name: 'Wedsday', length: 1 },
    { name: 'Thursday', length: 1 },
    { name: 'Fryday', length: 1 },
  ],
  months: [
    { name: 'Hammer', length: 30, type: 'standard' },
    { name: 'Midwinter', length: 1, type: 'intercalary' },
    { name: 'Alturiak', length: 30, type: 'standard' },
    { name: 'Ches', length: 30, type: 'standard' },
    { name: 'Tarsakh', length: 30, type: 'standard' },
    { name: 'Greengrass', length: 1, type: 'intercalary' },
    { name: 'Mirtul', length: 30, type: 'standard' },
    { name: 'Kythorn', length: 30, type: 'standard' },
    { name: 'Flamerule', length: 30, type: 'standard' },
    { name: 'Midsummer', length: 1, type: 'intercalary' },
    { name: 'Eleasis', length: 30, type: 'standard' },
    { name: 'Eleint', length: 30, type: 'standard' },
    { name: 'Marpenoth', length: 30, type: 'standard' },
    { name: 'Highharvestide', length: 1, type: 'intercalary' },
    { name: 'Uktar', length: 30, type: 'standard' },
    { name: 'Feast of the Moon', length: 1, type: 'intercalary' },
    { name: 'Nightal', length: 30, type: 'standard' },
  ],
  seasons: [
    { name: 'Winter', startMonthIndex: 0, startDay: 1 },
    { name: 'Spring', startMonthIndex: 3, startDay: 20 },
    { name: 'Summer', startMonthIndex: 5, startDay: 20 },
    { name: 'Fall', startMonthIndex: 8, startDay: 20 },
  ],
  moons: [{ name: 'Selûne', cycleDays: 30.43 }],
  leapDays: [
    {
      everyYears: 4,
      afterMonthIndex: 6,
      month: { name: 'Shieldmeet', length: 1, type: 'intercalary' },
    },
  ],
};

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const epochStart = convertEpochToCalendarState(0n, harptosLikeCalendar);
assert(epochStart.year === 1, 'epoch start should be year 1');
assert(epochStart.monthIndex === 0, 'epoch start should be first month');
assert(epochStart.day === 1, 'epoch start should be day 1');
assert(epochStart.weekdayName === 'Starday', 'epoch start weekday should be Starday');
assert(epochStart.isIntercalary === false, 'Hammer 1 should not be intercalary');

const midwinter = convertEpochToCalendarState(BigInt(30 * 1440), harptosLikeCalendar);
assert(midwinter.monthName === 'Midwinter', 'day 31 should be Midwinter');
assert(midwinter.isIntercalary === true, 'Midwinter should be intercalary');
assert(midwinter.weekdayName === '', 'intercalary days should not advance weekday cycle');

const hammerDay30 = convertEpochToCalendarState(BigInt(29 * 1440), harptosLikeCalendar);
assert(hammerDay30.monthName === 'Hammer' && hammerDay30.day === 30, 'day 30 should remain in Hammer');

const afterMidwinter = convertEpochToCalendarState(BigInt(31 * 1440), harptosLikeCalendar);
assert(afterMidwinter.monthName === 'Alturiak', 'day 32 should start Alturiak');
assert(
  afterMidwinter.weekdayName === 'Moonday',
  'intercalary days should be skipped in weekday progression',
);
assert(
  afterMidwinter.weekdayName !== hammerDay30.weekdayName,
  'weekday should advance from Hammer 30 to Alturiak 1 without intercalary slot',
);

const oneHourLater = convertEpochToCalendarState(60n, harptosLikeCalendar);
assert(oneHourLater.hour === 1 && oneHourLater.minute === 0, 'should parse hour/minute');

const offsetCalendar = {
  ...harptosLikeCalendar,
  epochOffset: 1440n,
};
const offsetState = convertEpochToCalendarState(1440n, offsetCalendar);
assert(offsetState.year === 1 && offsetState.day === 1, 'epoch offset should align calendars');

console.log('timeEngine verification passed');
console.log(JSON.stringify({ epochStart, hammerDay30, midwinter, afterMidwinter, oneHourLater }, null, 2));
