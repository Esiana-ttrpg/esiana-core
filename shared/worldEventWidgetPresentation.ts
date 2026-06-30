import { ChronologyDomainKind } from './chronologyDomainKinds.js';
import type { ChronologyDomainKindValue } from './chronologyDomainKinds.js';
import type { DashboardWorldEventType } from './dashboardWorldEventsCatalog.js';

export const WORLD_EVENT_TYPE_LABELS: Record<DashboardWorldEventType, string> = {
  world_event: 'World Event',
  political: 'Political',
  conflict: 'Conflict',
  world_change: 'World Change',
  economic: 'Economic',
  astronomical: 'Astronomical',
  other: 'Other',
};

export const WORLD_EVENT_TYPE_EMOJI: Record<DashboardWorldEventType, string> = {
  world_event: '📅',
  political: '👑',
  conflict: '⚔️',
  world_change: '🌍',
  economic: '🚢',
  astronomical: '🌑',
  other: '·',
};

/** Exact calendar category name → widget type (case-insensitive). */
const EXPLICIT_CATEGORY_TYPE_MAP: Record<string, DashboardWorldEventType> = {
  political: 'political',
  economic: 'economic',
  astronomical: 'astronomical',
  conflict: 'conflict',
  'world change': 'world_change',
  'world event': 'world_event',
};

const DOMAIN_DEFAULT_TYPE: Record<ChronologyDomainKindValue, DashboardWorldEventType> = {
  [ChronologyDomainKind.WORLD_EVENT]: 'world_event',
  [ChronologyDomainKind.ORG_RELATION]: 'conflict',
  [ChronologyDomainKind.FACTION_CONTROL]: 'political',
  [ChronologyDomainKind.WORLD_ADVANCE]: 'world_change',
  [ChronologyDomainKind.SESSION_CHRONICLE]: 'other',
  [ChronologyDomainKind.MAP_KEYFRAME]: 'other',
  [ChronologyDomainKind.LORE_REFERENCE]: 'other',
  [ChronologyDomainKind.QUEST_TRANSITION]: 'other',
  [ChronologyDomainKind.DOWNTIME_PERIOD]: 'other',
};

/** Domain proxy when convergence importance is absent (lower = more important). */
export const WORLD_EVENT_DOMAIN_IMPORTANCE_PROXY: Partial<
  Record<ChronologyDomainKindValue, number>
> = {
  [ChronologyDomainKind.WORLD_EVENT]: 0,
  [ChronologyDomainKind.WORLD_ADVANCE]: 1,
  [ChronologyDomainKind.ORG_RELATION]: 2,
  [ChronologyDomainKind.FACTION_CONTROL]: 3,
};

export function resolveExplicitCategoryType(
  categoryName: string | null | undefined,
): DashboardWorldEventType | null {
  if (!categoryName?.trim()) return null;
  return EXPLICIT_CATEGORY_TYPE_MAP[categoryName.trim().toLowerCase()] ?? null;
}

export function resolveWorldEventWidgetType(input: {
  domain: ChronologyDomainKindValue;
  calendarCategoryName?: string | null;
}): DashboardWorldEventType {
  const explicit = resolveExplicitCategoryType(input.calendarCategoryName);
  if (explicit) return explicit;
  return DOMAIN_DEFAULT_TYPE[input.domain] ?? 'other';
}

export function resolveWorldEventImportanceRank(input: {
  domain: ChronologyDomainKindValue;
  importance?: number | null;
}): number {
  if (typeof input.importance === 'number' && Number.isFinite(input.importance)) {
    return input.importance;
  }
  return WORLD_EVENT_DOMAIN_IMPORTANCE_PROXY[input.domain] ?? 99;
}

export function formatWorldEventTypeLabel(type: DashboardWorldEventType): string {
  return WORLD_EVENT_TYPE_LABELS[type];
}
