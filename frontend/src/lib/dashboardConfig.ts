/**
 * Campaign home layout configuration (frontend).
 */

import {
  DASHBOARD_DEFAULT_MAX_ENABLED_WIDGETS,
  DASHBOARD_MAX_ENABLED_WIDGETS,
} from '@/lib/densityConstants';
import type { DashboardSummary } from './dashboardSummary';
import {
  DEFAULT_DASHBOARD_QUICK_LINKS,
  sanitizeQuickUtilityNavConfig,
} from '@shared/dashboardQuickLinkCatalog';
import {
  sanitizeRecentEntitiesConfig,
  DEFAULT_RECENT_ENTITIES_CONFIG,
} from '@shared/dashboardRecentEntitiesCatalog';
import {
  sanitizeWorldEventsConfig,
  DEFAULT_WORLD_EVENTS_CONFIG,
} from '@shared/dashboardWorldEventsCatalog';
import {
  sanitizeFactionConflictConfig,
  DEFAULT_FACTION_CONFLICT_CONFIG,
} from '@shared/dashboardFactionConflictCatalog';

export { DASHBOARD_DEFAULT_MAX_ENABLED_WIDGETS, DASHBOARD_MAX_ENABLED_WIDGETS };
import {
  createDefaultHeroConfig,
  normalizeHeroFields,
  type HeroMode,
} from './dashboardHeroPresentation';

export type { HeroMode };

export type DashboardWidgetId =
  | 'sessionSchedule'
  | 'worldChronometer'
  | 'campaignBulletin'
  | 'recentLore'
  | 'questLedger'
  | 'livingThreads'
  | 'party'
  | 'campaignPulse'
  | 'lastSessionNotes'
  | 'quickUtilityNav'
  | 'continueWhereYouLeftOff'
  | 'pinnedItems'
  | 'fantasyCalendar'
  | 'worldPressureForecast'
  | 'worldSnapshot'
  | 'campaignAtAGlance'
  | 'currentStory'
  | 'partyRoster'
  | 'recentActivity'
  | 'explore'
  | 'recentEntities'
  | 'worldEvents'
  | 'factionsAtWar'
  | 'sessionClock'
  | 'worldClock'
  | 'announcements'
  | 'activityLoop';

export type DashboardWidgetScope = 'shared' | 'personal';

export interface DashboardWidgetPlacement {
  id: DashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  scope?: DashboardWidgetScope;
  config?: Record<string, unknown>;
}

export interface DashboardHeroConfig {
  coverImageUrl: string | null;
  /** Optional narrative arc title surfaced on the global hub. */
  currentArc?: string | null;
  summary: string | null;
  heroMode: HeroMode;
  focalPointX: number;
  focalPointY: number;
  overlayStrength: number;
}

export interface DashboardImportManifestAssets {
  coverImageAssetId?: string;
  markdownZipAssetId?: string;
  backupZipAssetId?: string;
}

export interface DashboardImportManifest {
  assets?: DashboardImportManifestAssets;
  startingLocationPageId?: string;
}

export interface DashboardConfig {
  hero: DashboardHeroConfig;
  widgets: DashboardWidgetPlacement[];
  importManifest?: DashboardImportManifest;
}

export const DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = [
  'sessionSchedule',
  'worldChronometer',
  'recentLore',
  'questLedger',
  'livingThreads',
  'campaignPulse',
  'lastSessionNotes',
  'quickUtilityNav',
  'continueWhereYouLeftOff',
  'pinnedItems',
  'fantasyCalendar',
  'worldPressureForecast',
  'worldSnapshot',
  'campaignAtAGlance',
  'currentStory',
  'partyRoster',
  'recentActivity',
  'explore',
  'recentEntities',
  'worldEvents',
  'factionsAtWar',
];

const LEGACY_WIDGET_ID_MAP: Record<string, DashboardWidgetId> = {
  sessionClock: 'sessionSchedule',
  worldClock: 'worldChronometer',
  announcements: 'recentLore',
  campaignBulletin: 'recentLore',
  activityLoop: 'recentLore',
  party: 'partyRoster',
};

/** Retired widgets — never shown in widget bank. */
export const RETIRED_DASHBOARD_WIDGET_BANK_IDS = new Set<DashboardWidgetId>([
  'campaignBulletin',
  'party',
  'announcements',
]);

const PERSONAL_WIDGET_IDS = new Set<DashboardWidgetId>([
  'continueWhereYouLeftOff',
  'pinnedItems',
]);

const NARRATIVE_BRIEFING_WIDGET_IDS: DashboardWidgetId[] = [
  'campaignAtAGlance',
  'currentStory',
  'partyRoster',
  'recentActivity',
  'explore',
];

const LEGACY_OPERATIONAL_DEFAULT_IDS: DashboardWidgetId[] = [
  'sessionSchedule',
  'campaignPulse',
  'worldSnapshot',
  'recentLore',
  'worldChronometer',
  'lastSessionNotes',
];

function applyRetiredWidgetPolicy(
  widgets: DashboardWidgetPlacement[],
): DashboardWidgetPlacement[] {
  return widgets
    .filter((widget) => !RETIRED_DASHBOARD_WIDGET_BANK_IDS.has(widget.id))
    .map((widget) => {
      if (widget.id === 'quickUtilityNav') {
        return { ...widget, config: sanitizeQuickUtilityNavConfig(widget.config) };
      }
      if (widget.id === 'recentEntities') {
        return { ...widget, config: sanitizeRecentEntitiesConfig(widget.config) };
      }
      if (widget.id === 'worldEvents') {
        return { ...widget, config: sanitizeWorldEventsConfig(widget.config) };
      }
      if (widget.id === 'factionsAtWar') {
        return { ...widget, config: sanitizeFactionConflictConfig(widget.config) };
      }
      return widget;
    });
}

function needsNarrativeBriefingActivation(
  saved: DashboardWidgetPlacement[],
): boolean {
  return !saved.some((item) =>
    NARRATIVE_BRIEFING_WIDGET_IDS.includes(migrateWidgetId(item.id)),
  );
}

function applyLegacyBriefingWidgetMigration(
  widgets: DashboardWidgetPlacement[],
): DashboardWidgetPlacement[] {
  const defaults = getDefaultDashboardConfig();
  return widgets.map((widget) => {
    if (NARRATIVE_BRIEFING_WIDGET_IDS.includes(widget.id)) {
      const defaultPlacement = defaults.widgets.find((w) => w.id === widget.id);
      return defaultPlacement ? { ...defaultPlacement, enabled: true } : widget;
    }
    if (LEGACY_OPERATIONAL_DEFAULT_IDS.includes(widget.id)) {
      return { ...widget, enabled: false };
    }
    return widget;
  });
}

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  sessionSchedule: 'Session Schedule',
  worldChronometer: 'World Chronometer',
  campaignBulletin: 'Campaign Bulletin',
  recentLore: 'Recent Lore',
  questLedger: 'Quest Ledger',
  livingThreads: 'Living Threads',
  party: 'The Party',
  campaignPulse: 'Campaign Pulse',
  lastSessionNotes: 'Last Session',
  quickUtilityNav: 'Quick Links',
  continueWhereYouLeftOff: 'Continue Your Journey',
  pinnedItems: 'Pinned Pages',
  fantasyCalendar: 'Fantasy Calendar',
  worldPressureForecast: 'World Pressure Forecast',
  worldSnapshot: 'World Snapshot',
  campaignAtAGlance: 'Campaign at a Glance',
  currentStory: 'Current Story',
  partyRoster: 'Party',
  recentActivity: 'Recent Activity',
  explore: 'Explore',
  recentEntities: 'Recent Entities',
  worldEvents: 'World Events',
  factionsAtWar: 'Factions at War',
  sessionClock: 'Session Schedule',
  worldClock: 'World Chronometer',
  announcements: 'Campaign Bulletin',
  activityLoop: 'Recent Lore',
};

function migrateWidgetId(id: string): DashboardWidgetId {
  return LEGACY_WIDGET_ID_MAP[id] ?? (id as DashboardWidgetId);
}

function defaultPlacement(
  id: DashboardWidgetId,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { enabled?: boolean; scope?: DashboardWidgetScope; config?: Record<string, unknown> },
): DashboardWidgetPlacement {
  return {
    id,
    x,
    y,
    w,
    h,
    enabled: options?.enabled ?? true,
    ...(options?.scope ? { scope: options.scope } : {}),
    ...(options?.config ? { config: options.config } : {}),
  };
}

export function getDefaultDashboardConfig(): DashboardConfig {
  return {
    hero: createDefaultHeroConfig(),
    widgets: [
      defaultPlacement('campaignAtAGlance', 0, 0, 12, 2),
      defaultPlacement('currentStory', 0, 2, 12, 4),
      defaultPlacement('partyRoster', 0, 6, 8, 3),
      defaultPlacement('explore', 8, 6, 4, 3),
      defaultPlacement('recentActivity', 0, 9, 12, 3),
      defaultPlacement('sessionSchedule', 0, 12, 4, 4, { enabled: false }),
      defaultPlacement('campaignPulse', 4, 12, 4, 3, { enabled: false }),
      defaultPlacement('worldSnapshot', 8, 12, 4, 4, { enabled: false }),
      defaultPlacement('recentLore', 0, 16, 4, 4, { enabled: false }),
      defaultPlacement('worldChronometer', 4, 16, 4, 3, { enabled: false }),
      defaultPlacement('lastSessionNotes', 8, 16, 4, 4, { enabled: false }),
      defaultPlacement('questLedger', 0, 20, 6, 4, { enabled: false }),
      defaultPlacement('livingThreads', 6, 20, 6, 4, { enabled: false }),
      defaultPlacement('quickUtilityNav', 0, 24, 3, 4, {
        enabled: false,
        config: { links: [...DEFAULT_DASHBOARD_QUICK_LINKS] },
      }),
      defaultPlacement('continueWhereYouLeftOff', 6, 24, 6, 3, {
        enabled: false,
        scope: 'personal',
      }),
      defaultPlacement('pinnedItems', 0, 27, 6, 3, {
        enabled: false,
        scope: 'personal',
      }),
      defaultPlacement('fantasyCalendar', 6, 27, 6, 5, { enabled: false }),
      defaultPlacement('worldPressureForecast', 0, 32, 6, 4, { enabled: false }),
      defaultPlacement('recentEntities', 0, 36, 6, 4, {
        enabled: false,
        config: { ...DEFAULT_RECENT_ENTITIES_CONFIG },
      }),
      defaultPlacement('worldEvents', 6, 36, 6, 4, {
        enabled: false,
        config: { ...DEFAULT_WORLD_EVENTS_CONFIG },
      }),
      defaultPlacement('factionsAtWar', 0, 40, 12, 4, {
        enabled: false,
        config: { ...DEFAULT_FACTION_CONFLICT_CONFIG },
      }),
    ],
  };
}

export function countEnabledDashboardWidgets(
  widgets: DashboardWidgetPlacement[],
): number {
  return widgets.filter((w) => w.enabled).length;
}

function isKnownWidgetId(id: string): boolean {
  return (
    DASHBOARD_WIDGET_IDS.includes(id as DashboardWidgetId) ||
    id in LEGACY_WIDGET_ID_MAP ||
    id.startsWith('plugin:')
  );
}

function isPlacement(value: unknown): value is DashboardWidgetPlacement {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    isKnownWidgetId(row.id) &&
    typeof row.x === 'number' &&
    typeof row.y === 'number' &&
    typeof row.w === 'number' &&
    typeof row.h === 'number' &&
    typeof row.enabled === 'boolean'
  );
}

function normalizeHero(raw: unknown): DashboardHeroConfig {
  return normalizeHeroFields(raw);
}

export function normalizeDashboardConfig(raw: unknown): DashboardConfig {
  if (raw == null || typeof raw !== 'object') {
    return getDefaultDashboardConfig();
  }
  const parsed = raw as { hero?: unknown; widgets?: unknown; importManifest?: unknown };
  const saved = Array.isArray(parsed.widgets)
    ? parsed.widgets.filter(isPlacement)
    : [];
  if (saved.length === 0) return getDefaultDashboardConfig();

  const byCanonicalId = new Map<string, DashboardWidgetPlacement>();
  for (const item of saved) {
    const canonicalId = migrateWidgetId(item.id);
    const scope = PERSONAL_WIDGET_IDS.has(canonicalId)
      ? ('personal' as const)
      : item.scope;
    const placement: DashboardWidgetPlacement = {
      ...item,
      id: canonicalId,
      x: Math.max(0, Math.floor(item.x)),
      y: Math.max(0, Math.floor(item.y)),
      w: Math.max(1, Math.min(12, Math.floor(item.w))),
      h: Math.max(1, Math.floor(item.h)),
      ...(scope ? { scope } : {}),
    };
    const existing = byCanonicalId.get(canonicalId);
    if (!existing) {
      byCanonicalId.set(canonicalId, placement);
    } else {
      byCanonicalId.set(canonicalId, {
        ...existing,
        enabled: existing.enabled || placement.enabled,
        config: { ...existing.config, ...placement.config },
      });
    }
  }

  const widgets: DashboardWidgetPlacement[] = Array.from(byCanonicalId.values());
  for (const id of DASHBOARD_WIDGET_IDS) {
    if (!byCanonicalId.has(id)) {
      const fallback = getDefaultDashboardConfig().widgets.find((w) => w.id === id);
      if (fallback) {
        widgets.push({
          ...fallback,
          enabled:
            fallback.enabled && id !== 'pinnedItems' && id !== 'fantasyCalendar',
        });
      }
    }
  }

  const migratedWidgets = needsNarrativeBriefingActivation(saved)
    ? applyLegacyBriefingWidgetMigration(widgets)
    : widgets;

  const importManifest = parseImportManifest(parsed.importManifest);
  return {
    hero: normalizeHero(parsed.hero),
    widgets: applyRetiredWidgetPolicy(migratedWidgets),
    ...(importManifest ? { importManifest } : {}),
  };
}

function parseImportManifest(raw: unknown): DashboardImportManifest | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const manifest = raw as Record<string, unknown>;
  const assetsRaw = manifest.assets;
  if (!assetsRaw || typeof assetsRaw !== 'object') return undefined;
  return { assets: assetsRaw as DashboardImportManifestAssets };
}

export type DashboardQuestStatus =
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABANDONED';

export interface DashboardQuestProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface DashboardQuestPage {
  id: string;
  title: string;
  updatedAt: string;
  questStatus: DashboardQuestStatus;
  progress: DashboardQuestProgress;
  snippet: string;
}

export type DashboardThreadKind =
  | 'mystery'
  | 'promise'
  | 'foreshadowing'
  | 'clue'
  | 'theory';

export type DashboardThreadStatus = 'OPEN' | 'DORMANT' | 'RESOLVED' | 'ABANDONED';

export interface DashboardOpenThread {
  id: string;
  title: string;
  updatedAt: string;
  threadKind: DashboardThreadKind;
  threadStatus: DashboardThreadStatus;
  snippet: string;
  playerSubmitted: boolean;
  lifecycleState?: string;
  threadSignals?: string[];
  sortOrder: number | null;
  resolvedAt?: string;
}

export interface DashboardThreadBundle {
  living: DashboardOpenThread[];
  theories: DashboardOpenThread[];
  recentlyResolved: DashboardOpenThread[];
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface DashboardSchedule {
  day: string | null;
  time: string | null;
  frequency: string | null;
  timezone?: string | null;
}

export interface DashboardBundle {
  dashboardConfig: DashboardConfig;
  campaignDescription: string | null;
  schedule: DashboardSchedule;
  questPages: DashboardQuestPage[];
  threadBundle: DashboardThreadBundle;
  /** @deprecated Prefer threadBundle.living */
  openThreads: DashboardOpenThread[];
  recentActivity: DashboardActivityItem[];
  summary: DashboardSummary;
  narrativeSnapshot?: import('./dashboardNarrativeSnapshot').CampaignNarrativeSnapshot;
  recentEntities?: import('./dashboardWidgetFeeds').RecentEntitiesFeedResult;
  worldEvents?: import('./dashboardWidgetFeeds').DashboardWorldEventsFeedResult;
  factionConflict?: import('./dashboardWidgetFeeds').FactionConflictFeedResult;
}

export type { DashboardSummary };
