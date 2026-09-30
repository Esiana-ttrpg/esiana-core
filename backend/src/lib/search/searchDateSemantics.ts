/**
 * Real-world date semantics for global-search before:/after: filters.
 *
 * Session Notes use the established session-date precedence. Generic wiki
 * pages have no user-facing date semantic in this pass — they do not match
 * when a date filter is active.
 *
 * Campaign-calendar (fantasyEpochMinute) operators are intentionally out of
 * scope; extend this module later for world-before: / world-after:.
 */

export interface SearchDateSource {
  pageCreatedAt?: Date | null;
  timelineCreatedAt?: Date | null;
  plannedStartAt?: Date | null;
  publishedAt?: Date | null;
}

export interface ResolvedSearchDate {
  date: Date | null;
  /** User-facing label for the date field, when defined. */
  label: string | null;
}

/**
 * Resolve the authoritative real-world date for a searchable entity.
 * Returns null date when the type has no defined date semantic.
 */
export function resolveSearchDocumentDate(
  typeKey: string,
  source: SearchDateSource,
): ResolvedSearchDate {
  if (typeKey === 'session-note') {
    const date =
      source.plannedStartAt ??
      source.publishedAt ??
      source.timelineCreatedAt ??
      source.pageCreatedAt ??
      null;
    return { date, label: 'session date' };
  }
  // Generic wiki pages: deferred — no silent createdAt comparison.
  return { date: null, label: null };
}

/**
 * Apply before:/after: filters.
 * - after: inclusive from YYYY-MM-DD T00:00:00.000Z
 * - before: exclusive of YYYY-MM-DD T00:00:00.000Z
 *
 * When hasDateFilter is true and the entity has no defined date, it does not match.
 */
export function matchesDateFilter(
  typeKey: string,
  source: SearchDateSource,
  bounds: { after: Date | null; before: Date | null; hasDateFilter: boolean },
): boolean {
  if (!bounds.hasDateFilter) return true;
  const resolved = resolveSearchDocumentDate(typeKey, source);
  if (!resolved.date) return false;
  const t = resolved.date.getTime();
  if (bounds.after && t < bounds.after.getTime()) return false;
  if (bounds.before && t >= bounds.before.getTime()) return false;
  return true;
}
