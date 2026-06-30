/**
 * Factions at War widget — sort and pair limit config.
 */

export const DASHBOARD_FACTION_CONFLICT_LIMITS = [3, 5] as const;
export type DashboardFactionConflictLimit =
  (typeof DASHBOARD_FACTION_CONFLICT_LIMITS)[number];

export const DASHBOARD_FACTION_CONFLICT_SORT_OPTIONS = [
  'mutual_first',
  'alphabetical',
] as const;
export type DashboardFactionConflictSortBy =
  (typeof DASHBOARD_FACTION_CONFLICT_SORT_OPTIONS)[number];

export const DEFAULT_FACTION_CONFLICT_CONFIG = {
  sortBy: 'mutual_first' as DashboardFactionConflictSortBy,
  limit: 3 as DashboardFactionConflictLimit,
};

const LIMIT_SET = new Set<number>(DASHBOARD_FACTION_CONFLICT_LIMITS);
const SORT_SET = new Set<string>(DASHBOARD_FACTION_CONFLICT_SORT_OPTIONS);

export function parseFactionConflictConfig(raw: {
  sortBy?: unknown;
  limit?: unknown;
}): {
  sortBy: DashboardFactionConflictSortBy;
  limit: DashboardFactionConflictLimit;
} | null {
  const limit =
    typeof raw.limit === 'number' &&
    LIMIT_SET.has(raw.limit as DashboardFactionConflictLimit)
      ? (raw.limit as DashboardFactionConflictLimit)
      : null;
  const sortBy =
    typeof raw.sortBy === 'string' &&
    SORT_SET.has(raw.sortBy) &&
    DASHBOARD_FACTION_CONFLICT_SORT_OPTIONS.includes(
      raw.sortBy as DashboardFactionConflictSortBy,
    )
      ? (raw.sortBy as DashboardFactionConflictSortBy)
      : null;
  if (limit === null || !sortBy) return null;
  return { sortBy, limit };
}

export function normalizeFactionConflictConfig(
  config: Record<string, unknown> | undefined,
): {
  sortBy: DashboardFactionConflictSortBy;
  limit: DashboardFactionConflictLimit;
} {
  const parsed = parseFactionConflictConfig(config ?? {});
  return parsed ?? { ...DEFAULT_FACTION_CONFLICT_CONFIG };
}

export function sanitizeFactionConflictConfig(
  config: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const normalized = normalizeFactionConflictConfig(config);
  return { ...config, ...normalized };
}
