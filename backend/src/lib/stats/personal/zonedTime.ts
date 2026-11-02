export type ZonedCivilDate = {
  year: number;
  month: number;
  day: number;
};

export type ZonedDateTimeParts = ZonedCivilDate & {
  hour: number;
  minute: number;
  second: number;
};

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

export function zonedParts(at: Date, timeZone: string): ZonedDateTimeParts {
  const parts = formatterFor(timeZone).formatToParts(at);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    return Number(value);
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = wanted;
  for (let i = 0; i < 4; i += 1) {
    const got = zonedParts(new Date(guess), timeZone);
    const gotAsUtc = Date.UTC(
      got.year,
      got.month - 1,
      got.day,
      got.hour,
      got.minute,
      got.second,
    );
    const error = gotAsUtc - wanted;
    if (error === 0) return new Date(guess);
    guess -= error;
  }
  return new Date(guess);
}

export function startOfZonedDay(at: Date, timeZone: string): Date {
  const parts = zonedParts(at, timeZone);
  return zonedTimeToUtc(timeZone, parts.year, parts.month, parts.day);
}

export function addCivilDays(date: ZonedCivilDate, days: number): ZonedCivilDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function calendarDateKey(at: Date, timeZone: string): string {
  const parts = zonedParts(at, timeZone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function previousCalendarDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const previous = addCivilDays({ year, month, day }, -1);
  return `${String(previous.year).padStart(4, '0')}-${String(previous.month).padStart(2, '0')}-${String(previous.day).padStart(2, '0')}`;
}

export function hourInTimeZone(at: Date, timeZone: string): number {
  return zonedParts(at, timeZone).hour;
}
