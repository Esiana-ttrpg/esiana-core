/**
 * Campaign dashboard layout configuration.
 */

import {
  createDefaultHeroConfig,
  normalizeHeroConfig,
  type DashboardHeroConfig,
  type HeroMode,
} from './dashboardHeroPresentation.js';

export type { DashboardHeroConfig, HeroMode };

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
  | 'sessionClock'
  /** @deprecated migrated silently */
  | 'worldClock'
  /** @deprecated migrated silently */
  | 'announcements'
  /** @deprecated migrated silently */
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

const CANONICAL_WIDGET_IDS: DashboardWidgetId[] = [
  'sessionSchedule',
  'worldChronometer',
  'campaignBulletin',
  'recentLore',
  'questLedger',
  'livingThreads',
  'party',
  'campaignPulse',
  'lastSessionNotes',
  'quickUtilityNav',
  'continueWhereYouLeftOff',
  'pinnedItems',
  'fantasyCalendar',
  'worldPressureForecast',
  'worldSnapshot',
];

const LEGACY_WIDGET_ID_MAP: Record<string, DashboardWidgetId> = {
  sessionClock: 'sessionSchedule',
  worldClock: 'worldChronometer',
  announcements: 'campaignBulletin',
  activityLoop: 'recentLore',
};

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
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
  sessionClock: 'Session Schedule',
  worldClock: 'World Chronometer',
  announcements: 'Campaign Bulletin',
  activityLoop: 'Recent Lore',
};

const PERSONAL_WIDGET_IDS = new Set<DashboardWidgetId>([
  'continueWhereYouLeftOff',
  'pinnedItems',
]);

export function getWidgetLabel(id: DashboardWidgetId): string {
  return WIDGET_LABELS[id] ?? id;
}

export function migrateWidgetId(id: string): DashboardWidgetId {
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
      defaultPlacement('sessionSchedule', 0, 0, 4, 4),
      defaultPlacement('campaignPulse', 4, 0, 4, 3),
      defaultPlacement('worldSnapshot', 8, 0, 4, 4),
      defaultPlacement('campaignBulletin', 0, 4, 4, 4, {
        config: {
          body: 'Pin house rules, reminders, and campaign notices here.',
        },
      }),
      defaultPlacement('recentLore', 4, 4, 4, 4),
      defaultPlacement('worldChronometer', 8, 4, 4, 3),
      defaultPlacement('lastSessionNotes', 0, 8, 4, 4),
      defaultPlacement('questLedger', 0, 8, 6, 4, { enabled: false }),
      defaultPlacement('livingThreads', 6, 8, 6, 4, { enabled: false }),
      defaultPlacement('party', 0, 12, 3, 4, { enabled: false }),
      defaultPlacement('quickUtilityNav', 3, 12, 3, 4, { enabled: false }),
      defaultPlacement('continueWhereYouLeftOff', 6, 12, 6, 3, {
        enabled: false,
        scope: 'personal',
      }),
      defaultPlacement('pinnedItems', 0, 15, 6, 3, {
        enabled: false,
        scope: 'personal',
      }),
      defaultPlacement('fantasyCalendar', 6, 15, 6, 5, { enabled: false }),
      defaultPlacement('worldPressureForecast', 0, 18, 6, 4, { enabled: false }),
    ],
  };
}

function isKnownWidgetId(id: string): id is DashboardWidgetId {
  return (
    CANONICAL_WIDGET_IDS.includes(id as DashboardWidgetId) ||
    id in LEGACY_WIDGET_ID_MAP
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
  return normalizeHeroConfig(raw);
}

function mergeWidgetConfigs(
  target: DashboardWidgetPlacement,
  source: DashboardWidgetPlacement,
): DashboardWidgetPlacement {
  if (!source.config || Object.keys(source.config).length === 0) {
    return target;
  }
  return {
    ...target,
    config: { ...target.config, ...source.config },
  };
}

export function isDashboardConfigBlank(raw: unknown): boolean {
  if (raw == null || typeof raw !== 'object') return true;
  const parsed = raw as { widgets?: unknown };
  return !Array.isArray(parsed.widgets) || parsed.widgets.length === 0;
}

export function normalizeDashboardConfig(raw: unknown): DashboardConfig {
  if (isDashboardConfigBlank(raw)) {
    return getDefaultDashboardConfig();
  }

  const parsed = raw as { hero?: unknown; widgets?: unknown; importManifest?: unknown };
  const saved = Array.isArray(parsed.widgets)
    ? parsed.widgets.filter(isPlacement)
    : [];

  if (saved.length === 0) {
    return getDefaultDashboardConfig();
  }

  const byCanonicalId = new Map<string, DashboardWidgetPlacement>();

  for (const item of saved) {
    const canonicalId = migrateWidgetId(item.id);
    const scope = PERSONAL_WIDGET_IDS.has(canonicalId)
      ? ('personal' as const)
      : item.scope;

    const placement: DashboardWidgetPlacement = {
      id: canonicalId,
      x: Math.max(0, Math.floor(item.x)),
      y: Math.max(0, Math.floor(item.y)),
      w: Math.max(1, Math.min(12, Math.floor(item.w))),
      h: Math.max(1, Math.floor(item.h)),
      enabled: item.enabled,
      ...(scope ? { scope } : {}),
      ...(item.config && typeof item.config === 'object' ? { config: item.config } : {}),
    };

    const existing = byCanonicalId.get(canonicalId);
    if (!existing) {
      byCanonicalId.set(canonicalId, placement);
    } else {
      byCanonicalId.set(
        canonicalId,
        mergeWidgetConfigs(
          {
            ...existing,
            enabled: existing.enabled || placement.enabled,
          },
          placement,
        ),
      );
    }
  }

  const widgets: DashboardWidgetPlacement[] = Array.from(byCanonicalId.values());

  for (const id of CANONICAL_WIDGET_IDS) {
    if (!byCanonicalId.has(id)) {
      const fallback = getDefaultDashboardConfig().widgets.find((w) => w.id === id);
      if (fallback) {
        widgets.push({
          ...fallback,
          enabled: fallback.enabled && id !== 'pinnedItems' && id !== 'fantasyCalendar',
        });
      }
    }
  }

  const importManifest = parseImportManifest(parsed.importManifest);

  return {
    hero: normalizeHero(parsed.hero),
    widgets,
    ...(importManifest ? { importManifest } : {}),
  };
}

function parseImportManifest(raw: unknown): DashboardImportManifest | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const manifest = raw as Record<string, unknown>;
  const result: DashboardImportManifest = {};
  const assetsRaw = manifest.assets;
  if (assetsRaw && typeof assetsRaw === 'object') {
    const assetsObj = assetsRaw as Record<string, unknown>;
    const assets: DashboardImportManifestAssets = {};
    if (
      typeof assetsObj.coverImageAssetId === 'string' &&
      assetsObj.coverImageAssetId.trim()
    ) {
      assets.coverImageAssetId = assetsObj.coverImageAssetId.trim();
    }
    if (
      typeof assetsObj.markdownZipAssetId === 'string' &&
      assetsObj.markdownZipAssetId.trim()
    ) {
      assets.markdownZipAssetId = assetsObj.markdownZipAssetId.trim();
    }
    if (
      typeof assetsObj.backupZipAssetId === 'string' &&
      assetsObj.backupZipAssetId.trim()
    ) {
      assets.backupZipAssetId = assetsObj.backupZipAssetId.trim();
    }
    if (Object.keys(assets).length > 0) {
      result.assets = assets;
    }
  }
  if (
    typeof manifest.startingLocationPageId === 'string' &&
    manifest.startingLocationPageId.trim()
  ) {
    result.startingLocationPageId = manifest.startingLocationPageId.trim();
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function parseDashboardLayoutPayload(body: unknown): DashboardConfig | null {
  if (!body || typeof body !== 'object') return null;
  const parsed = body as { hero?: unknown; widgets?: unknown };
  if (!Array.isArray(parsed.widgets) || parsed.widgets.length === 0) return null;
  if (!parsed.widgets.every(isPlacement)) return null;

  const normalized = normalizeDashboardConfig(parsed);
  const seen = new Set(normalized.widgets.map((w) => w.id));
  for (const id of CANONICAL_WIDGET_IDS) {
    if (!seen.has(id)) return null;
  }

  return normalized;
}

export const DASHBOARD_CANONICAL_WIDGET_IDS = CANONICAL_WIDGET_IDS;
