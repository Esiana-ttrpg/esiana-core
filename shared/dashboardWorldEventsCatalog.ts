/**
 * World Events widget — type filters, sort, and limit config.
 */

export const DASHBOARD_WORLD_EVENT_TYPES = [
  'world_event',
  'political',
  'conflict',
  'world_change',
  'economic',
  'astronomical',
  'other',
] as const;

export type DashboardWorldEventType = (typeof DASHBOARD_WORLD_EVENT_TYPES)[number];

export const DASHBOARD_WORLD_EVENT_LIMITS = [5, 10, 20] as const;
export type DashboardWorldEventLimit = (typeof DASHBOARD_WORLD_EVENT_LIMITS)[number];

export const DASHBOARD_WORLD_EVENT_SORT_OPTIONS = ['importance', 'date'] as const;
export type DashboardWorldEventSortBy = (typeof DASHBOARD_WORLD_EVENT_SORT_OPTIONS)[number];

export const DEFAULT_WORLD_EVENTS_CONFIG = {
  typeFilters: [...DASHBOARD_WORLD_EVENT_TYPES] as DashboardWorldEventType[],
  limit: 10 as DashboardWorldEventLimit,
  sortBy: 'importance' as DashboardWorldEventSortBy,
};

const TYPE_SET = new Set<string>(DASHBOARD_WORLD_EVENT_TYPES);
const LIMIT_SET = new Set<number>(DASHBOARD_WORLD_EVENT_LIMITS);
const SORT_SET = new Set<string>(DASHBOARD_WORLD_EVENT_SORT_OPTIONS);

export function isDashboardWorldEventType(value: string): value is DashboardWorldEventType {
  return TYPE_SET.has(value);
}

export function parseWorldEventsConfig(raw: {
  typeFilters?: unknown;
  limit?: unknown;
  sortBy?: unknown;
}): {
  typeFilters: DashboardWorldEventType[];
  limit: DashboardWorldEventLimit;
  sortBy: DashboardWorldEventSortBy;
} | null {
  if (!Array.isArray(raw.typeFilters) || raw.typeFilters.length === 0) return null;
  const typeFilters: DashboardWorldEventType[] = [];
  for (const entry of raw.typeFilters) {
    if (typeof entry !== 'string' || !isDashboardWorldEventType(entry)) return null;
    typeFilters.push(entry);
  }
  const limit =
    typeof raw.limit === 'number' &&
    LIMIT_SET.has(raw.limit as DashboardWorldEventLimit)
      ? (raw.limit as DashboardWorldEventLimit)
      : null;
  const sortBy =
    typeof raw.sortBy === 'string' &&
    SORT_SET.has(raw.sortBy) &&
    DASHBOARD_WORLD_EVENT_SORT_OPTIONS.includes(raw.sortBy as DashboardWorldEventSortBy)
      ? (raw.sortBy as DashboardWorldEventSortBy)
      : null;
  if (limit === null || !sortBy) return null;
  return { typeFilters, limit, sortBy };
}

export function normalizeWorldEventsConfig(
  config: Record<string, unknown> | undefined,
): {
  typeFilters: DashboardWorldEventType[];
  limit: DashboardWorldEventLimit;
  sortBy: DashboardWorldEventSortBy;
} {
  const parsed = parseWorldEventsConfig(config ?? {});
  return parsed ?? { ...DEFAULT_WORLD_EVENTS_CONFIG };
}

export function sanitizeWorldEventsConfig(
  config: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const normalized = normalizeWorldEventsConfig(config);
  return { ...config, ...normalized };
}
