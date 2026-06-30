import type { DashboardQuickLinkKey } from '@shared/dashboardQuickLinkCatalog';
import type { DashboardFactionConflictSortBy } from '@shared/dashboardFactionConflictCatalog';
import type {
  DashboardRecentEntityCategory,
  DashboardRecentEntitySortBy,
} from '@shared/dashboardRecentEntitiesCatalog';
import type {
  DashboardWorldEventSortBy,
  DashboardWorldEventType,
} from '@shared/dashboardWorldEventsCatalog';

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function dashboardLabelKey(prefix: string, token: string): string {
  const camel = token.includes('_') ? snakeToCamel(token) : token;
  const suffix = camel.charAt(0).toUpperCase() + camel.slice(1);
  return `campaign.dashboard.${prefix}${suffix}`;
}

export function recentEntityCategoryLabelKey(
  category: DashboardRecentEntityCategory,
): string {
  return dashboardLabelKey('recentEntityCategory', category);
}

export function recentEntitySortLabelKey(sortBy: DashboardRecentEntitySortBy): string {
  return dashboardLabelKey('recentEntitySort', sortBy);
}

export function worldEventTypeLabelKey(type: DashboardWorldEventType): string {
  return dashboardLabelKey('worldEventType', type);
}

export function worldEventSortLabelKey(sortBy: DashboardWorldEventSortBy): string {
  return dashboardLabelKey('worldEventSort', sortBy);
}

export function factionConflictSortLabelKey(
  sortBy: DashboardFactionConflictSortBy,
): string {
  return dashboardLabelKey('factionConflictSort', sortBy);
}

export function quickLinkLabelKey(key: DashboardQuickLinkKey): string {
  return dashboardLabelKey('quickLink', key);
}
