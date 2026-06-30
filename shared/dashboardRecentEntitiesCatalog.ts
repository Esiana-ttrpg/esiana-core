/**
 * Recent Entities widget — category, sort, and limit config.
 */

export const DASHBOARD_RECENT_ENTITY_CATEGORIES = [
  'all',
  'characters',
  'organizations',
  'locations',
  'events',
  'objects',
  'bestiary',
  'maps',
] as const;

export type DashboardRecentEntityCategory =
  (typeof DASHBOARD_RECENT_ENTITY_CATEGORIES)[number];

export const DASHBOARD_RECENT_ENTITY_LIMITS = [5, 10, 20] as const;
export type DashboardRecentEntityLimit = (typeof DASHBOARD_RECENT_ENTITY_LIMITS)[number];

export const DASHBOARD_RECENT_ENTITY_SORT_OPTIONS = [
  'updated',
  'created',
  'alphabetical',
] as const;
export type DashboardRecentEntitySortBy =
  (typeof DASHBOARD_RECENT_ENTITY_SORT_OPTIONS)[number];

export const DEFAULT_RECENT_ENTITIES_CONFIG = {
  category: 'all' as DashboardRecentEntityCategory,
  limit: 10 as DashboardRecentEntityLimit,
  sortBy: 'updated' as DashboardRecentEntitySortBy,
};

const CATEGORY_SET = new Set<string>(DASHBOARD_RECENT_ENTITY_CATEGORIES);
const LIMIT_SET = new Set<number>(DASHBOARD_RECENT_ENTITY_LIMITS);
const SORT_SET = new Set<string>(DASHBOARD_RECENT_ENTITY_SORT_OPTIONS);

export function isDashboardRecentEntityCategory(
  value: string,
): value is DashboardRecentEntityCategory {
  return CATEGORY_SET.has(value);
}

export function parseRecentEntitiesConfig(raw: {
  category?: unknown;
  limit?: unknown;
  sortBy?: unknown;
}): {
  category: DashboardRecentEntityCategory;
  limit: DashboardRecentEntityLimit;
  sortBy: DashboardRecentEntitySortBy;
} | null {
  const category =
    typeof raw.category === 'string' && isDashboardRecentEntityCategory(raw.category)
      ? raw.category
      : null;
  const limit =
    typeof raw.limit === 'number' &&
    LIMIT_SET.has(raw.limit as DashboardRecentEntityLimit)
      ? (raw.limit as DashboardRecentEntityLimit)
      : null;
  const sortBy =
    typeof raw.sortBy === 'string' &&
    SORT_SET.has(raw.sortBy) &&
    DASHBOARD_RECENT_ENTITY_SORT_OPTIONS.includes(
      raw.sortBy as DashboardRecentEntitySortBy,
    )
      ? (raw.sortBy as DashboardRecentEntitySortBy)
      : null;
  if (!category || limit === null || !sortBy) return null;
  return { category, limit, sortBy };
}

export function normalizeRecentEntitiesConfig(
  config: Record<string, unknown> | undefined,
): {
  category: DashboardRecentEntityCategory;
  limit: DashboardRecentEntityLimit;
  sortBy: DashboardRecentEntitySortBy;
} {
  const parsed = parseRecentEntitiesConfig(config ?? {});
  return parsed ?? { ...DEFAULT_RECENT_ENTITIES_CONFIG };
}

export function sanitizeRecentEntitiesConfig(
  config: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const normalized = normalizeRecentEntitiesConfig(config);
  return { ...config, ...normalized };
}
