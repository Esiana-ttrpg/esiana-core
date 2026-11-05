import type { CategoryIndexRefineState } from '@/lib/categoryIndexBrowse';
import type { CodexBrowseViewMode } from '@/lib/categoryBrowseRegistry';
import type {
  QuestHubStatusFilters,
  QuestHubTypeFilters,
} from '@/lib/questHubFilters';

/** card | table | hierarchy — legacy 'list' migrated on read. */
export type CategoryIndexViewMode = CodexBrowseViewMode;

export interface CategoryIndexBrowseSnapshot {
  searchQuery: string;
  refineState: CategoryIndexRefineState;
  viewMode: CategoryIndexViewMode;
  /** Effective optional table column keys (Locations atlas). */
  columnKeys?: string[];
}

const STORAGE_PREFIX = 'esiana.categoryIndex.browse.';
const TREE_COLLAPSED_PREFIX = 'esiana.indexTreeCollapsed:';
/** @deprecated legacy full expanded snapshot — migrated to collapse-delta on read */
const TREE_EXPANDED_LEGACY_PREFIX = 'esiana.indexTreeExpanded:';
const MAPS_TREE_COLLAPSED_PREFIX = 'esiana.mapsTreeCollapsed:';
/** @deprecated legacy full expanded snapshot — migrated to collapse-delta on read */
const MAPS_TREE_EXPANDED_LEGACY_PREFIX = 'esiana.mapsTreeExpanded:';

function storageKey(campaignHandle: string, categoryPageId: string): string {
  return `${STORAGE_PREFIX}${campaignHandle}.${categoryPageId}`;
}

function normalizeViewMode(raw: unknown): CategoryIndexViewMode | undefined {
  if (raw === 'card' || raw === 'table' || raw === 'hierarchy') return raw;
  if (raw === 'list') return 'table';
  if (raw === 'nested') return 'hierarchy';
  return undefined;
}

export function readCategoryIndexBrowseSnapshot(
  campaignHandle: string,
  categoryPageId: string,
): Partial<CategoryIndexBrowseSnapshot> | null {
  try {
    const raw = sessionStorage.getItem(storageKey(campaignHandle, categoryPageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CategoryIndexBrowseSnapshot>;
    if (!parsed || typeof parsed !== 'object') return null;
    const viewMode = normalizeViewMode(parsed.viewMode);
    return viewMode ? { ...parsed, viewMode } : parsed;
  } catch {
    return null;
  }
}

export function writeCategoryIndexBrowseSnapshot(
  campaignHandle: string,
  categoryPageId: string,
  snapshot: CategoryIndexBrowseSnapshot,
): void {
  try {
    sessionStorage.setItem(
      storageKey(campaignHandle, categoryPageId),
      JSON.stringify(snapshot),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function readCollapsedIdsFromKey(key: string): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return null;
  }
}

function writeCollapsedIdsToKey(key: string, collapsedIds: Set<string>): void {
  try {
    if (collapsedIds.size === 0) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify([...collapsedIds]));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readCodexHierarchyCollapsedIds(
  campaignHandle: string,
  categoryPageId: string,
): Set<string> | null {
  return readCollapsedIdsFromKey(
    `${TREE_COLLAPSED_PREFIX}${campaignHandle}:${categoryPageId}`,
  );
}

export function writeCodexHierarchyCollapsedIds(
  campaignHandle: string,
  categoryPageId: string,
  collapsedIds: Set<string>,
): void {
  writeCollapsedIdsToKey(
    `${TREE_COLLAPSED_PREFIX}${campaignHandle}:${categoryPageId}`,
    collapsedIds,
  );
}

/** @deprecated migrated to collapse-delta — read once for legacy migration only */
export function readCodexHierarchyExpandedIdsLegacy(
  campaignHandle: string,
  categoryPageId: string,
): Set<string> | null {
  return readCollapsedIdsFromKey(
    `${TREE_EXPANDED_LEGACY_PREFIX}${campaignHandle}:${categoryPageId}`,
  );
}

export function clearCodexHierarchyExpandedIdsLegacy(
  campaignHandle: string,
  categoryPageId: string,
): void {
  try {
    sessionStorage.removeItem(
      `${TREE_EXPANDED_LEGACY_PREFIX}${campaignHandle}:${categoryPageId}`,
    );
  } catch {
    /* ignore */
  }
}

/** @deprecated use readCodexHierarchyCollapsedIds — kept for call-site migration */
export function readCodexHierarchyExpandedIds(
  campaignHandle: string,
  categoryPageId: string,
): Set<string> | null {
  return readCodexHierarchyExpandedIdsLegacy(campaignHandle, categoryPageId);
}

/** @deprecated use writeCodexHierarchyCollapsedIds */
export function writeCodexHierarchyExpandedIds(
  _campaignHandle: string,
  _categoryPageId: string,
  _expandedIds: Set<string>,
): void {
  /* no-op — callers should use collapse-delta storage */
}

export function readMapsHierarchyCollapsedIds(
  campaignHandle: string,
  categoryPageId: string,
): Set<string> | null {
  return readCollapsedIdsFromKey(
    `${MAPS_TREE_COLLAPSED_PREFIX}${campaignHandle}:${categoryPageId}`,
  );
}

export function writeMapsHierarchyCollapsedIds(
  campaignHandle: string,
  categoryPageId: string,
  collapsedIds: Set<string>,
): void {
  writeCollapsedIdsToKey(
    `${MAPS_TREE_COLLAPSED_PREFIX}${campaignHandle}:${categoryPageId}`,
    collapsedIds,
  );
}

/** @deprecated migrated to collapse-delta — read once for legacy migration only */
export function readMapsHierarchyExpandedIdsLegacy(
  campaignHandle: string,
  categoryPageId: string,
): Set<string> | null {
  return readCollapsedIdsFromKey(
    `${MAPS_TREE_EXPANDED_LEGACY_PREFIX}${campaignHandle}:${categoryPageId}`,
  );
}

export function clearMapsHierarchyExpandedIdsLegacy(
  campaignHandle: string,
  categoryPageId: string,
): void {
  try {
    sessionStorage.removeItem(
      `${MAPS_TREE_EXPANDED_LEGACY_PREFIX}${campaignHandle}:${categoryPageId}`,
    );
  } catch {
    /* ignore */
  }
}

/** @deprecated use readMapsHierarchyCollapsedIds */
export function readMapsHierarchyExpandedIds(
  campaignHandle: string,
  categoryPageId: string,
): Set<string> | null {
  return readMapsHierarchyExpandedIdsLegacy(campaignHandle, categoryPageId);
}

/** @deprecated use writeMapsHierarchyCollapsedIds */
export function writeMapsHierarchyExpandedIds(
  _campaignHandle: string,
  _categoryPageId: string,
  _expandedIds: Set<string>,
): void {
  /* no-op */
}

const QUEST_HUB_PREFIX = 'esiana.questHub.browse.';
const MAPS_BROWSE_PREFIX = 'esiana.mapsHub.browse.';

export interface QuestHubBrowseSnapshot {
  searchQuery: string;
  viewMode: 'list' | 'board';
  statusFilters?: QuestHubStatusFilters;
  typeFilters?: QuestHubTypeFilters;
}

export interface MapsHubBrowseSnapshot {
  searchQuery: string;
  viewMode: 'card' | 'table' | 'hierarchy';
  refineState?: Record<string, Record<string, boolean>>;
}

export function readQuestHubBrowseSnapshot(
  campaignHandle: string,
  categoryPageId: string,
): Partial<QuestHubBrowseSnapshot> | null {
  try {
    const raw = sessionStorage.getItem(
      `${QUEST_HUB_PREFIX}${campaignHandle}.${categoryPageId}`,
    );
    if (!raw) return null;
    return JSON.parse(raw) as Partial<QuestHubBrowseSnapshot>;
  } catch {
    return null;
  }
}

export function writeQuestHubBrowseSnapshot(
  campaignHandle: string,
  categoryPageId: string,
  snapshot: QuestHubBrowseSnapshot,
): void {
  try {
    sessionStorage.setItem(
      `${QUEST_HUB_PREFIX}${campaignHandle}.${categoryPageId}`,
      JSON.stringify(snapshot),
    );
  } catch {
    /* ignore */
  }
}

function normalizeMapsViewMode(raw: unknown): MapsHubBrowseSnapshot['viewMode'] {
  if (raw === 'card' || raw === 'table' || raw === 'hierarchy') return raw;
  if (raw === 'expanded') return 'card';
  if (raw === 'compact') return 'hierarchy';
  return 'hierarchy';
}

export function readMapsHubBrowseSnapshot(
  campaignHandle: string,
  categoryPageId: string,
): Partial<MapsHubBrowseSnapshot> | null {
  try {
    const raw = sessionStorage.getItem(
      `${MAPS_BROWSE_PREFIX}${campaignHandle}.${categoryPageId}`,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MapsHubBrowseSnapshot>;
    if (!parsed || typeof parsed !== 'object') return null;
    const viewMode = normalizeMapsViewMode(parsed.viewMode);
    return { ...parsed, viewMode };
  } catch {
    return null;
  }
}

export function writeMapsHubBrowseSnapshot(
  campaignHandle: string,
  categoryPageId: string,
  snapshot: MapsHubBrowseSnapshot,
): void {
  try {
    sessionStorage.setItem(
      `${MAPS_BROWSE_PREFIX}${campaignHandle}.${categoryPageId}`,
      JSON.stringify(snapshot),
    );
  } catch {
    /* ignore */
  }
}

/** @deprecated use readMapsHubBrowseSnapshot — migrates legacy key */
export function readStoredMapsHubViewModeFromLegacy(): MapsHubBrowseSnapshot['viewMode'] | null {
  try {
    const stored = sessionStorage.getItem('esiana-maps-hub-view');
    if (!stored) return null;
    return normalizeMapsViewMode(stored);
  } catch {
    return null;
  }
}

/** Scoped category browse preferences. URL values are transient overrides. */
export interface WorkspaceBrowseState {
  searchQuery: string;
  refineState: CategoryIndexRefineState;
  group: string;
  sort: string;
  direction: 'asc' | 'desc';
  viewMode: CategoryIndexViewMode;
}
export interface WorkspaceBrowseConfig {
  defaults: WorkspaceBrowseState;
  groups: readonly string[];
  sorts: readonly string[];
  views: readonly CategoryIndexViewMode[];
  facetIds: readonly string[];
}
export interface WorkspaceBrowseScope { userId: string; campaignHandle: string; workspaceId: string }

function scopedKey(scope: WorkspaceBrowseScope, part: 'browse' | 'view'): string {
  return `esiana.workspaceBrowse.v1.${part}.${JSON.stringify([scope.userId, scope.campaignHandle, scope.workspaceId])}`;
}
function validRefine(value: unknown, facetIds: readonly string[]): CategoryIndexRefineState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const result: CategoryIndexRefineState = {};
  for (const [facet, options] of Object.entries(value)) {
    if (!facetIds.includes(facet) || !options || typeof options !== 'object' || Array.isArray(options)) continue;
    const entries = Object.entries(options).filter(([, selected]) => typeof selected === 'boolean') as [string, boolean][];
    result[facet] = Object.fromEntries(entries);
  }
  return result;
}
function parseJson(value: string | null): unknown {
  try { return value === null ? undefined : JSON.parse(value); } catch { return undefined; }
}
export function normalizeWorkspaceBrowseState(value: unknown, config: WorkspaceBrowseConfig): WorkspaceBrowseState {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const { defaults } = config;
  return {
    searchQuery: typeof input.searchQuery === 'string' ? input.searchQuery : defaults.searchQuery,
    refineState: validRefine(input.refineState, config.facetIds) ?? defaults.refineState,
    group: typeof input.group === 'string' && config.groups.includes(input.group) ? input.group : defaults.group,
    sort: typeof input.sort === 'string' && config.sorts.includes(input.sort) ? input.sort : defaults.sort,
    direction: input.direction === 'asc' || input.direction === 'desc' ? input.direction : defaults.direction,
    viewMode: typeof input.viewMode === 'string' && config.views.includes(input.viewMode as CategoryIndexViewMode)
      ? input.viewMode as CategoryIndexViewMode : defaults.viewMode,
  };
}
export function readWorkspaceBrowseState(scope: WorkspaceBrowseScope, config: WorkspaceBrowseConfig): WorkspaceBrowseState {
  try {
    const browse = parseJson(localStorage.getItem(scopedKey(scope, 'browse')));
    const view = parseJson(localStorage.getItem(scopedKey(scope, 'view')));
    return normalizeWorkspaceBrowseState({ ...(browse && typeof browse === 'object' ? browse : {}), viewMode: view }, config);
  } catch { return normalizeWorkspaceBrowseState({}, config); }
}
export function writeWorkspaceBrowseState(scope: WorkspaceBrowseScope, state: WorkspaceBrowseState): void {
  try {
    const { viewMode, ...browse } = state;
    localStorage.setItem(scopedKey(scope, 'browse'), JSON.stringify(browse));
    localStorage.setItem(scopedKey(scope, 'view'), JSON.stringify(viewMode));
  } catch { /* Storage can be unavailable. */ }
}
/** URL parameters override only the corresponding saved fields; invalid explicit values use defaults. */
export function resolveWorkspaceBrowseUrl(saved: WorkspaceBrowseState, params: URLSearchParams, config: WorkspaceBrowseConfig): WorkspaceBrowseState {
  const overrides: Record<string, unknown> = {};
  const fields = { q: 'searchQuery', filters: 'refineState', group: 'group', sort: 'sort', direction: 'direction', view: 'viewMode' } as const;
  for (const [param, field] of Object.entries(fields)) {
    if (params.has(param)) overrides[field] = param === 'filters' ? parseJson(params.get(param)) : params.get(param);
  }
  return normalizeWorkspaceBrowseState({ ...saved, ...overrides }, config);
}
export function writeWorkspaceBrowseUrl(params: URLSearchParams, state: WorkspaceBrowseState): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set('q', state.searchQuery);
  const excluded = Object.fromEntries(Object.entries(state.refineState).map(([facet, options]) => [
    facet, Object.fromEntries(Object.entries(options).filter(([, selected]) => !selected)),
  ]).filter(([, options]) => Object.keys(options).length > 0));
  next.set('filters', JSON.stringify(excluded));
  next.set('group', state.group);
  next.set('sort', state.sort);
  next.set('direction', state.direction);
  next.set('view', state.viewMode);
  return next;
}
