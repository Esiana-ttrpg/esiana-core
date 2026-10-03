/**
 * Compute next real-world session occurrence from campaign cadence fields.
 * Shared by backend auto-schedule and frontend recruitment helpers.
 */

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const ENGLISH_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function parseWeekday(input: string | null | undefined): number | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  if (normalized.length < 3) return null;
  if (normalized in WEEKDAY_INDEX) return WEEKDAY_INDEX[normalized]!;
  const key = Object.keys(WEEKDAY_INDEX).find((day) => day.startsWith(normalized));
  return key ? WEEKDAY_INDEX[key]! : null;
}

export function parseScheduleTime(
  input: string | null | undefined,
): { hour: number; minute: number } | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number.parseInt(match[1] ?? '', 10);
  const minute = Number.parseInt(match[2] ?? '0', 10);
  const meridiem = match[3]?.toLowerCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return { hour, minute };
}

export function inferCadenceDays(input: string | null | undefined): number {
  const text = (input ?? '').toLowerCase();
  if (text.includes('biweekly') || text.includes('bi-weekly') || text.includes('every 2 week')) {
    return 14;
  }
  if (text.includes('monthly') || text.includes('month')) {
    return 30;
  }
  return 7;
}

export function isMonthlyCadence(input: string | null | undefined): boolean {
  const text = (input ?? '').toLowerCase();
  return text.includes('monthly') || text.includes('month');
}

export function isOneShotCampaignFormat(format: string | null | undefined): boolean {
  if (!format) return false;
  const normalized = format.trim().toLowerCase();
  return normalized === 'one-shot' || normalized === 'oneshot' || normalized === 'one shot';
}

function resolveTimeZone(timeZone: string | null | undefined): string {
  const trimmed = timeZone?.trim();
  if (!trimmed) return 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return 'UTC';
  }
}

export type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

export function getZonedParts(date: Date, timeZone: string | null | undefined): ZonedDateTimeParts {
  const tz = resolveTimeZone(timeZone);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const raw = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const weekdayName = (raw.weekday ?? 'Sun').toLowerCase();
  const weekday =
    WEEKDAY_INDEX[Object.keys(WEEKDAY_INDEX).find((day) => day.startsWith(weekdayName.slice(0, 3))) ?? ''] ??
    0;

  let hour = Number.parseInt(raw.hour ?? '0', 10);
  if (hour === 24) hour = 0;

  return {
    year: Number.parseInt(raw.year ?? '1970', 10),
    month: Number.parseInt(raw.month ?? '1', 10),
    day: Number.parseInt(raw.day ?? '1', 10),
    hour,
    minute: Number.parseInt(raw.minute ?? '0', 10),
    weekday,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
  return asUtc - date.getTime();
}

/** Interpret a wall-clock date/time in `timeZone` as a UTC Instant. */
export function zonedWallTimeToUtc(params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone: string | null | undefined;
}): Date {
  const timeZone = resolveTimeZone(params.timeZone);
  const desiredAsUtc = Date.UTC(
    params.year,
    params.month - 1,
    params.day,
    params.hour,
    params.minute,
    0,
    0,
  );
  let utcMs = desiredAsUtc;
  for (let i = 0; i < 4; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = desiredAsUtc - offset;
  }
  return new Date(utcMs);
}

function addCalendarDays(year: number, month: number, day: number, deltaDays: number): {
  year: number;
  month: number;
  day: number;
} {
  const utc = new Date(Date.UTC(year, month - 1, day + deltaDays, 12, 0, 0));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function addDaysKeepingWallClock(date: Date, days: number, timeZone: string): Date {
  const parts = getZonedParts(date, timeZone);
  const next = addCalendarDays(parts.year, parts.month, parts.day, days);
  return zonedWallTimeToUtc({
    year: next.year,
    month: next.month,
    day: next.day,
    hour: parts.hour,
    minute: parts.minute,
    timeZone,
  });
}

/**
 * Next occurrence after `after` (exclusive), using wall-clock fields in scheduleTimezone.
 * When `previousPlannedStartAt` is set (last completed/skipped session), biweekly/monthly
 * intervals are measured from that occurrence so sweeps at arbitrary offsets stay on grid.
 */
export function computeNextCadenceOccurrence(params: {
  scheduleFrequency: string | null;
  scheduleDay: string | null;
  scheduleTime: string | null;
  scheduleTimezone?: string | null;
  after: Date;
  previousPlannedStartAt?: Date | null;
}): Date | null {
  const weekday = parseWeekday(params.scheduleDay);
  const parsedTime = parseScheduleTime(params.scheduleTime);
  if (weekday === null || !parsedTime) return null;

  const timeZone = resolveTimeZone(params.scheduleTimezone);
  const cadenceDays = inferCadenceDays(params.scheduleFrequency);

  // Prefer stepping from the previous occurrence when we have one (stable biweekly grid).
  if (params.previousPlannedStartAt && !Number.isNaN(params.previousPlannedStartAt.getTime())) {
    const prevParts = getZonedParts(params.previousPlannedStartAt, timeZone);
    let stepped = zonedWallTimeToUtc({
      year: prevParts.year,
      month: prevParts.month,
      day: prevParts.day,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      timeZone,
    });

    if (isMonthlyCadence(params.scheduleFrequency)) {
      const prevMonth = getZonedParts(params.previousPlannedStartAt, timeZone);
      for (let i = 0; i < 60; i += 1) {
        stepped = addDaysKeepingWallClock(stepped, 7, timeZone);
        const parts = getZonedParts(stepped, timeZone);
        const laterMonth =
          parts.year > prevMonth.year ||
          (parts.year === prevMonth.year && parts.month > prevMonth.month);
        if (laterMonth && stepped.getTime() > params.after.getTime()) {
          return stepped;
        }
      }
      return null;
    }

    const stepDays = cadenceDays;
    while (stepped.getTime() <= params.after.getTime()) {
      stepped = addDaysKeepingWallClock(stepped, stepDays, timeZone);
    }
    return stepped;
  }

  const afterParts = getZonedParts(params.after, timeZone);
  let year = afterParts.year;
  let month = afterParts.month;
  let day = afterParts.day;

  let candidate: Date | null = null;
  for (let i = 0; i < 400; i += 1) {
    const probe = zonedWallTimeToUtc({
      year,
      month,
      day,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      timeZone,
    });
    const probeParts = getZonedParts(probe, timeZone);
    if (probeParts.weekday === weekday && probe.getTime() > params.after.getTime()) {
      candidate = probe;
      break;
    }
    ({ year, month, day } = addCalendarDays(year, month, day, 1));
  }
  if (!candidate) return null;

  if (isMonthlyCadence(params.scheduleFrequency)) {
    while (true) {
      const parts = getZonedParts(candidate, timeZone);
      if (parts.year !== afterParts.year || parts.month !== afterParts.month) {
        break;
      }
      candidate = addDaysKeepingWallClock(candidate, 7, timeZone);
    }
    return candidate;
  }

  // Biweekly without a previous baseline: enforce cadenceDays from `after`.
  if (cadenceDays > 7) {
    const baseline = params.after;
    const minMs = cadenceDays * 24 * 60 * 60 * 1000;
    while (candidate.getTime() - baseline.getTime() < minMs) {
      candidate = addDaysKeepingWallClock(candidate, 7, timeZone);
    }
  }

  return candidate;
}

/** Format datetime-local value from an ISO instant in a target IANA zone. */
export function isoToDatetimeLocalValue(
  iso: string | null | undefined,
  timeZone: string | null | undefined,
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = getZonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Parse datetime-local wall time in `timeZone` to UTC ISO. */
export function datetimeLocalValueToIso(
  value: string,
  timeZone: string | null | undefined,
): string {
  const result = datetimeLocalValueToIsoStrict(value, timeZone);
  if (result) return result;
  const fallback = new Date(value);
  return fallback.toISOString();
}

/**
 * Like datetimeLocalValueToIso, but returns null when the wall time does not exist
 * in the timezone (e.g. DST spring-forward gap) or cannot be parsed.
 */
export function datetimeLocalValueToIsoStrict(
  value: string,
  timeZone: string | null | undefined,
): string | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;
  const year = Number.parseInt(match[1]!, 10);
  const month = Number.parseInt(match[2]!, 10);
  const day = Number.parseInt(match[3]!, 10);
  const hour = Number.parseInt(match[4]!, 10);
  const minute = Number.parseInt(match[5]!, 10);
  const date = zonedWallTimeToUtc({
    year,
    month,
    day,
    hour,
    minute,
    timeZone,
  });
  const parts = getZonedParts(date, timeZone);
  if (
    parts.year !== year ||
    parts.month !== month ||
    parts.day !== day ||
    parts.hour !== hour ||
    parts.minute !== minute
  ) {
    return null;
  }
  return date.toISOString();
}

export function weekdayNameFromDatetimeLocal(
  value: string,
  timeZone: string | null | undefined,
): string {
  try {
    const iso = datetimeLocalValueToIso(value, timeZone);
    const parts = getZonedParts(new Date(iso), timeZone);
    return ENGLISH_WEEKDAY_NAMES[parts.weekday] ?? '';
  } catch {
    return '';
  }
}

export function timeLabelFromDatetimeLocal(
  value: string,
  timeZone: string | null | undefined,
): string {
  try {
    const iso = datetimeLocalValueToIso(value, timeZone);
    const parts = getZonedParts(new Date(iso), timeZone);
    const hour24 = parts.hour;
    const minute = parts.minute;
    const meridiem = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
  } catch {
    return '';
  }
}
