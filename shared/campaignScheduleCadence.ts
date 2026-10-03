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

export function parseWeekday(input: string | null | undefined): number | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  if (normalized in WEEKDAY_INDEX) return WEEKDAY_INDEX[normalized];
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

export function isOneShotCampaignFormat(format: string | null | undefined): boolean {
  if (!format) return false;
  const normalized = format.trim().toLowerCase();
  return normalized === 'one-shot' || normalized === 'oneshot' || normalized === 'one shot';
}

/**
 * Next occurrence after `after` (exclusive). Uses local wall-clock fields;
 * callers should interpret in campaign timezone when displaying.
 */
export function computeNextCadenceOccurrence(params: {
  scheduleFrequency: string | null;
  scheduleDay: string | null;
  scheduleTime: string | null;
  after: Date;
}): Date | null {
  const weekday = parseWeekday(params.scheduleDay);
  const parsedTime = parseScheduleTime(params.scheduleTime);
  if (weekday === null || !parsedTime) return null;

  const cadenceDays = inferCadenceDays(params.scheduleFrequency);
  const after = params.after;
  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setMilliseconds(0);
  candidate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);

  const dayOffset = (weekday - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + dayOffset);
  if (candidate <= after) {
    candidate.setDate(candidate.getDate() + cadenceDays);
  }

  // Keep stepping until strictly after `after` (handles biweekly alignment).
  while (candidate <= after) {
    candidate.setDate(candidate.getDate() + cadenceDays);
  }

  return candidate;
}
