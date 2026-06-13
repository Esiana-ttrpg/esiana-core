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
  return key ? WEEKDAY_INDEX[key] : null;
}

export function parseTime(input: string | null | undefined): { hour: number; minute: number } | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number.parseInt(match[1] ?? '', 10);
  const minute = Number.parseInt(match[2] ?? '0', 10);
  const meridiem = match[3];
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

export function computeUpcomingSessions(params: {
  scheduleFrequency: string | null;
  scheduleDay: string | null;
  scheduleTime: string | null;
}): Date[] {
  const weekday = parseWeekday(params.scheduleDay);
  const parsedTime = parseTime(params.scheduleTime);
  if (weekday === null || !parsedTime) return [];

  const cadenceDays = inferCadenceDays(params.scheduleFrequency);
  const now = new Date();
  const first = new Date(now);
  first.setSeconds(0, 0);
  first.setHours(parsedTime.hour, parsedTime.minute, 0, 0);

  const dayOffset = (weekday - first.getDay() + 7) % 7;
  first.setDate(first.getDate() + dayOffset);
  if (first <= now) {
    first.setDate(first.getDate() + cadenceDays);
  }

  return Array.from({ length: 3 }, (_, idx) => {
    const next = new Date(first);
    next.setDate(first.getDate() + idx * cadenceDays);
    return next;
  });
}

export function formatSessionDate(date: Date, timeZone?: string | null): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  if (timeZone?.trim()) {
    try {
      return new Intl.DateTimeFormat(undefined, { ...options, timeZone: timeZone.trim() }).format(
        date,
      );
    } catch {
      // fall through
    }
  }
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function buildScheduleSummary(params: {
  scheduleFrequency?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
  scheduleTimezone?: string | null;
}): string {
  const parts = [
    params.scheduleFrequency?.trim(),
    params.scheduleDay?.trim() ? `• ${params.scheduleDay.trim()}` : null,
    params.scheduleTime?.trim() ? `at ${params.scheduleTime.trim()}` : null,
    params.scheduleTimezone?.trim() ? `(${params.scheduleTimezone.trim()})` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Schedule TBD';
}
