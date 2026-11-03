/**
 * Client mirror of backend seasonal window helpers.
 * Prefer server `GET /user/wrapped/seasonal-invite` for dismiss state;
 * these helpers are for local presentation only.
 */

export function civilPartsInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

export function resolveSeasonalWrappedTargetYearClient(
  timeZone: string,
  now: Date = new Date(),
): number | null {
  const parts = civilPartsInTimeZone(timeZone, now);
  if (parts.month === 12 && parts.day >= 15) return parts.year;
  if (parts.month === 1 && parts.day <= 15) return parts.year - 1;
  return null;
}

export function wrappedInviteDismissKey(year: number): string {
  return `wrapped-invite:${year}`;
}
