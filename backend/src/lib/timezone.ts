export const DEFAULT_TIMEZONE = 'UTC';

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function listSupportedTimezones(): string[] {
  if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
    try {
      return [...Intl.supportedValuesOf('timeZone')].sort();
    } catch {
      return FALLBACK_TIMEZONES;
    }
  }
  return FALLBACK_TIMEZONES;
}

export function isValidTimezone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function sanitizeTimezone(
  value: unknown,
  fallback: string = DEFAULT_TIMEZONE,
): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidTimezone(trimmed) ? trimmed : null;
}

export function resolveEffectiveTimezone(input: {
  userTimezone?: string | null;
  systemDefaultTimezone?: string | null;
}): string {
  const user = sanitizeTimezone(input.userTimezone ?? null);
  if (user) return user;
  const system = sanitizeTimezone(input.systemDefaultTimezone ?? null, DEFAULT_TIMEZONE);
  return system ?? DEFAULT_TIMEZONE;
}
