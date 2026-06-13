/**
 * Best-effort parse of campaign `sessionDuration` text into minutes for time controls.
 * Defaults to 4 hours when unknown.
 */
export function parseSessionDurationToMinutes(
  raw: string | null | undefined,
): number {
  const fallback = 240;
  if (!raw?.trim()) return fallback;

  const s = raw.trim().toLowerCase();
  const clamp = (n: number) => Math.min(24 * 60, Math.max(30, Math.round(n)));

  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)\b/);
  if (hourMatch) {
    return clamp(parseFloat(hourMatch[1]) * 60);
  }

  const hShort = s.match(/^(\d+(?:\.\d+)?)\s*h\b/);
  if (hShort) {
    return clamp(parseFloat(hShort[1]) * 60);
  }

  const minMatch = s.match(/(\d+)\s*(?:minute|minutes|min|mins)\b/);
  if (minMatch) {
    return clamp(parseInt(minMatch[1], 10));
  }

  const plainHours = s.match(/^(\d+(?:\.\d+)?)\s*$/);
  if (plainHours) {
    return clamp(parseFloat(plainHours[1]) * 60);
  }

  return fallback;
}
