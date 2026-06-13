export type ScheduleOverlapLabel = 'strong' | 'partial' | 'unknown';

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseWeekday(input: string | null | undefined): number | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  if (normalized in WEEKDAY_INDEX) return WEEKDAY_INDEX[normalized];
  const key = Object.keys(WEEKDAY_INDEX).find((day) => day.startsWith(normalized));
  return key ? WEEKDAY_INDEX[key] : null;
}

function parseHourInTimezone(
  scheduleTime: string | null | undefined,
  scheduleTimezone: string | null | undefined,
): number | null {
  if (!scheduleTime?.trim()) return null;
  const normalized = scheduleTime.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number.parseInt(match[1] ?? '', 10);
  const meridiem = match[3];
  if (!Number.isFinite(hour)) return null;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  if (!scheduleTimezone?.trim()) return hour;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: scheduleTimezone.trim(),
      hour: 'numeric',
      hour12: false,
    });
    const probe = new Date(Date.UTC(2024, 0, 7, hour, 0, 0));
    const parts = formatter.formatToParts(probe);
    const hourPart = parts.find((part) => part.type === 'hour')?.value;
    const parsed = hourPart ? Number.parseInt(hourPart, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : hour;
  } catch {
    return hour;
  }
}

function weekdayInTimezone(timezone: string, date = new Date()): number {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    })
      .format(date)
      .toLowerCase();
    return WEEKDAY_INDEX[weekday] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}

function hourInTimezone(timezone: string, date = new Date()): number {
  try {
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
      .format(date)
      .replace(/\D/g, '');
    const parsed = Number.parseInt(hour, 10);
    return Number.isFinite(parsed) ? parsed : date.getHours();
  } catch {
    return date.getHours();
  }
}

/** Qualitative overlap for DM review — not a score. */
export function computeScheduleOverlap(params: {
  applicantTimezone: string | null | undefined;
  scheduleDay: string | null | undefined;
  scheduleTime: string | null | undefined;
  scheduleTimezone: string | null | undefined;
}): ScheduleOverlapLabel {
  const applicantTz = params.applicantTimezone?.trim();
  if (!applicantTz) return 'unknown';

  const campaignDay = parseWeekday(params.scheduleDay);
  const campaignHour = parseHourInTimezone(params.scheduleTime, params.scheduleTimezone);
  if (campaignDay === null || campaignHour === null) return 'unknown';

  try {
    const applicantDay = weekdayInTimezone(applicantTz);
    const applicantHour = hourInTimezone(applicantTz);
    const dayDelta = Math.min(
      Math.abs(applicantDay - campaignDay),
      7 - Math.abs(applicantDay - campaignDay),
    );
    const hourDelta = Math.abs(applicantHour - campaignHour);

    if (dayDelta === 0 && hourDelta <= 2) return 'strong';
    if (dayDelta <= 1 && hourDelta <= 4) return 'partial';
    if (dayDelta === 0 || hourDelta <= 3) return 'partial';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
