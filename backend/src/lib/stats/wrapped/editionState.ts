import { zonedParts, zonedTimeToUtc } from '../personal/zonedTime.js';
import type { WrappedEdition } from '../../../../../shared/wrappedTypes.js';

/**
 * Edition state from the target year's local civil boundaries in the reporting
 * timezone — not the server's calendar date alone.
 *
 * preview: now is still inside [Jan 1 year, Jan 1 year+1)
 * completed: now >= Jan 1 year+1 in the reporting timezone
 */
export function resolveWrappedEdition(input: {
  year: number;
  timeZone: string;
  now: Date;
}): WrappedEdition {
  const yearEndExclusive = zonedTimeToUtc(input.timeZone, input.year + 1, 1, 1);
  return input.now.getTime() >= yearEndExclusive.getTime() ? 'completed' : 'preview';
}

/** Local civil year for `now` in the reporting timezone. */
export function civilYearNow(timeZone: string, now: Date): number {
  return zonedParts(now, timeZone).year;
}

/**
 * True when the calendar year has started in the reporting timezone
 * (Jan 1 of `year` is at or before `now`). Future years must not enter
 * preview assembly — their reporting ranges would invert.
 */
export function hasWrappedYearStarted(input: {
  year: number;
  timeZone: string;
  now: Date;
}): boolean {
  const yearStart = zonedTimeToUtc(input.timeZone, input.year, 1, 1);
  return input.now.getTime() >= yearStart.getTime();
}

/**
 * Seasonal invite target year:
 * Dec 15–31 → current local year (preview)
 * Jan 1–15 → previous local year (completed)
 * Outside window → null
 */
export function resolveSeasonalWrappedTargetYear(input: {
  timeZone: string;
  now: Date;
}): number | null {
  const parts = zonedParts(input.now, input.timeZone);
  if (parts.month === 12 && parts.day >= 15) return parts.year;
  if (parts.month === 1 && parts.day <= 15) return parts.year - 1;
  return null;
}

export function wrappedInviteDismissKey(year: number): string {
  return `wrapped-invite:${year}`;
}
