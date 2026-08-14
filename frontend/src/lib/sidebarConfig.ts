/**
 * Campaign sidebar layout — PLAY / WORLD / TIMELINE / TOOLS zones + fixed nav.
 */

import {
  defaultSidebarIconValue,
  defaultSidebarLucideName,
} from './sidebarIconDefaults';
import { parseCatalogIconValue } from './catalogIconValidation';

export interface SidebarOrderItem {
  id: string;
  /** System default label (stable fallback; not user-facing when customLabel is set). */
  label: string;
  enabled: boolean;
  /** Optional DM override shown in navigation; does not affect route ids. */
  customLabel?: string;
  /** lucide:name | asset:uuid — omitted when using system default */
  icon?: string;
  /** API enrichment only; never persisted */
  iconAssetUrl?: string | null;
}

export interface SidebarConfigHeaders {
  play: string;
  world: string;
  timeline: string;
  tools: string;
}

export interface SidebarConfig {
  headers: SidebarConfigHeaders;
  worldLoreOrder: SidebarOrderItem[];
  playOrder: SidebarOrderItem[];
  toolsOrder: SidebarOrderItem[];
  /** Icons for non-bucket fixed nav sections */
  fixedSectionIcons?: Partial<Record<SidebarSectionId, string>>;
  /** Visibility for fixed nav sections (visualAtlas defaults off) */
  fixedSectionVisibility?: Partial<Record<SidebarSectionId, boolean>>;
  /** API enrichment only; never persisted */
  fixedSectionIconAssetUrls?: Partial<Record<SidebarSectionId, string | null>>;
}

export type SidebarSectionId =
  | 'dashboard'
  | 'party'
  | 'quickAccess'
  | 'characters'
  | 'bestiary'
  | 'ancestries'
  | 'organizations'
  | 'locations'
  | 'maps'
  | 'objects'
  | 'families'
  | 'rules-resources'
  | 'quests'
  | 'downtime'
  | 'narrativeThreads'
  | 'journals'
  | 'timeTracking'
  | 'sessionNotes'
  | 'tags'
  | 'visualAtlas'
  | 'relations'
  | 'recent-changes'
  | 'settings'
  | 'creativeDrift'
  | 'progression';

export type SidebarBucketKey = 'worldLore' | 'play' | 'tools';

export const DEFAULT_SIDEBAR_HEADERS: SidebarConfigHeaders = {
  play: 'PLAY',
  world: 'WORLD',
  timeline: 'TIMELINE',
  tools: 'TOOLS',
};

export const TIME_TRACKING_LABEL =
  'Time Tracking (Calendars, Timelines, Events)';

export const TIME_TRACKING_WIKI_TITLES = ['Calendars', 'Timelines', 'Events'] as const;

/** @deprecated Legacy bucket ids — no longer in customizable defaults */
export const SIDEBAR_GAME_MANAGEMENT_IDS: SidebarSectionId[] = [
  'rules-resources',
  'quests',
  'journals',
  'sessionNotes',
];

export const SIDEBAR_WORLD_LORE_IDS: SidebarSectionId[] = [
  'characters',
  'organizations',
  'locations',
  'maps',
  'objects',
  'families',
  'relations',
  'bestiary',
  'ancestries',
];

export const SIDEBAR_PLAY_IDS: SidebarSectionId[] = [
  'quests',
  'downtime',
  'progression',
  'journals',
  'sessionNotes',
];

export const SIDEBAR_TOOLS_BUCKET_IDS: SidebarSectionId[] = ['rules-resources'];

export const SIDEBAR_CUSTOMIZABLE_IDS: SidebarSectionId[] = [
  ...SIDEBAR_WORLD_LORE_IDS,
  ...SIDEBAR_PLAY_IDS,
  ...SIDEBAR_TOOLS_BUCKET_IDS,
];

/** Bucket ids removed from customizable nav (Adventure submenu / fixed TIMELINE) */
const DROPPED_BUCKET_IDS = new Set<string>(['narrativeThreads', 'timeTracking']);

export const SIDEBAR_TOP_FIXED_IDS: SidebarSectionId[] = ['party'];

/** Hidden-by-default planned stubs — not shown in main IA */
export const SIDEBAR_UTILITY_STUB_IDS: SidebarSectionId[] = ['quickAccess'];

export const SIDEBAR_TOOLS_FIXED_IDS: SidebarSectionId[] = [
  'tags',
  'visualAtlas',
  'recent-changes',
  'settings',
];

/** Fixed utility sections that support a visibility toggle in campaign settings */
export const SIDEBAR_UTILITY_VISIBILITY_IDS: SidebarSectionId[] = [
  'quickAccess',
  'visualAtlas',
];

export const SIDEBAR_FIXED_IDS: SidebarSectionId[] = [
  ...SIDEBAR_TOP_FIXED_IDS,
  'narrativeThreads',
  'creativeDrift',
  ...SIDEBAR_UTILITY_STUB_IDS,
  ...SIDEBAR_TOOLS_FIXED_IDS,
];

export const SIDEBAR_SECTION_META: Record<
  SidebarSectionId,
  {
    label: string;
    wikiTitle?: string;
    wikiTitles?: readonly string[];
    route?:
      | 'dashboard'
      | 'party'
      | 'notes'
      | 'settings'
      | 'recent-changes'
      | 'visual-atlas'
      | 'relations'
      | 'narrative-unresolved'
      | 'progression';
    statusLabel?: string;
    settingsDescription?: string;
  }
> = {
  dashboard: { label: 'Campaign Home', route: 'dashboard' },
  party: { label: 'Party', route: 'party' },
  quickAccess: {
    label: 'Quick Access',
    wikiTitle: 'Quick Access',
    statusLabel: 'Planned',
    settingsDescription:
      'Campaign-wide shortcuts for Game Masters and Writers — not yet available.',
  },
  characters: { label: 'Characters', wikiTitle: 'Characters' },
  bestiary: { label: 'Bestiary', wikiTitle: 'Bestiary' },
  ancestries: { label: 'Ancestries', wikiTitle: 'Ancestries' },
  organizations: { label: 'Organizations', wikiTitle: 'Organizations' },
  locations: { label: 'Locations', wikiTitle: 'Locations' },
  maps: { label: 'Maps', wikiTitle: 'Maps' },
  objects: { label: 'Objects', wikiTitle: 'Objects' },
  families: { label: 'Families', wikiTitle: 'Families' },
  'rules-resources': { label: 'Rules/Resources', wikiTitle: 'Rules/Resources' },
  quests: {
    label: 'Adventure',
    wikiTitle: 'Adventure',
    settingsDescription:
      'Living campaign narrative — Story lenses for quests, arcs, threads, and unresolved items.',
  },
  downtime: {
    label: 'Downtime',
    wikiTitle: 'Downtime',
    settingsDescription:
      'Campaign simulation between scenes — projects, havens, world events, and narrative continuity.',
  },
  progression: {
    label: 'Progression',
    route: 'progression',
    statusLabel: 'Game Master',
    settingsDescription:
      'Narrative forecasting for Game Masters and Writers — write scenes, prep sessions, and read campaign insights.',
  },
  narrativeThreads: {
    label: 'Threads',
    wikiTitle: 'Narrative Threads',
  },
  creativeDrift: {
    label: 'Unresolved',
    route: 'narrative-unresolved',
  },
  journals: { label: 'Journals', wikiTitle: 'Journals' },
  timeTracking: {
    label: TIME_TRACKING_LABEL,
    wikiTitles: TIME_TRACKING_WIKI_TITLES,
  },
  sessionNotes: { label: 'Session Notes', route: 'notes' },
  tags: { label: 'Tags', wikiTitle: 'Tags' },
  visualAtlas: {
    label: 'Visual Atlas',
    route: 'visual-atlas',
    settingsDescription:
      'Generated from portraits and artwork on lore pages. Optional image credits may be shown when set on source pages.',
  },
  relations: {
    label: 'Relations',
    route: 'relations',
    settingsDescription:
      'World dynamics — factions, standing, structure, and lineage across the campaign.',
  },
  'recent-changes': { label: 'Recent Changes', route: 'recent-changes' },
  settings: { label: 'Settings', route: 'settings' },
};

const LEGACY_ID_MAP: Record<string, SidebarSectionId> = {
  'time-tracking': 'timeTracking',
  timeTracking: 'timeTracking',
  sessionNotes: 'sessionNotes',
  'session-notes': 'sessionNotes',
};

const CUSTOMIZABLE_ID_SET = new Set<string>(SIDEBAR_CUSTOMIZABLE_IDS);

function bucketOrderKey(bucket: SidebarBucketKey): keyof SidebarConfig {
  if (bucket === 'worldLore') return 'worldLoreOrder';
  if (bucket === 'play') return 'playOrder';
  return 'toolsOrder';
}

function normalizeStoredSidebarIcon(
  raw: unknown,
  sectionId: SidebarSectionId,
): string | undefined {
  const parsed = parseCatalogIconValue(raw);
  if (!parsed.ok || !parsed.value) return undefined;
  const defaultValue = defaultSidebarIconValue(sectionId);
  if (parsed.value === defaultValue) return undefined;
  return parsed.value;
}

export function migrateSidebarItemId(id: string): SidebarSectionId | null {
  const mapped = LEGACY_ID_MAP[id] ?? id;
  if (DROPPED_BUCKET_IDS.has(mapped)) return null;
  if (mapped in SIDEBAR_SECTION_META && CUSTOMIZABLE_ID_SET.has(mapped)) {
    return mapped as SidebarSectionId;
  }
  return null;
}

export function getSidebarItemDisplayLabel(item: SidebarOrderItem): string {
  const custom = item.customLabel?.trim();
  return custom || item.label;
}

export function createDefaultSidebarOrderItem(
  id: SidebarSectionId,
): SidebarOrderItem {
  const meta = SIDEBAR_SECTION_META[id];
  return { id, label: meta.label, enabled: id !== 'objects' };
}

export function getDefaultSidebarConfig(): SidebarConfig {
  return {
    headers: { ...DEFAULT_SIDEBAR_HEADERS },
    worldLoreOrder: SIDEBAR_WORLD_LORE_IDS.map((id) =>
      createDefaultSidebarOrderItem(id),
    ),
    playOrder: SIDEBAR_PLAY_IDS.map((id) => createDefaultSidebarOrderItem(id)),
    toolsOrder: SIDEBAR_TOOLS_BUCKET_IDS.map((id) =>
      createDefaultSidebarOrderItem(id),
    ),
  };
}

function isSidebarOrderItem(value: unknown): value is SidebarOrderItem {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.label === 'string' &&
    typeof row.enabled === 'boolean' &&
    (row.customLabel === undefined || typeof row.customLabel === 'string') &&
    (row.icon === undefined || typeof row.icon === 'string')
  );
}

function isSupersededSystemLabel(sectionId: SidebarSectionId, label: string): boolean {
  return sectionId === 'quests' && label === 'Quests';
}

function normalizeOrderItem(
  item: SidebarOrderItem,
  migratedId: SidebarSectionId,
): SidebarOrderItem {
  const meta = SIDEBAR_SECTION_META[migratedId];
  const systemLabel = meta.label;
  const savedLabel = item.label.trim() || systemLabel;

  let customLabel: string | undefined;
  if (typeof item.customLabel === 'string' && item.customLabel.trim()) {
    customLabel = item.customLabel.trim();
  } else if (savedLabel !== systemLabel && !isSupersededSystemLabel(migratedId, savedLabel)) {
    customLabel = savedLabel;
  }

  if (customLabel && isSupersededSystemLabel(migratedId, customLabel)) {
    customLabel = undefined;
  }

  const icon = normalizeStoredSidebarIcon(item.icon, migratedId);

  return {
    id: migratedId,
    label: systemLabel,
    enabled: item.enabled,
    ...(customLabel ? { customLabel } : {}),
    ...(icon ? { icon } : {}),
  };
}

function normalizeHeaders(raw: unknown): SidebarConfigHeaders {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SIDEBAR_HEADERS };
  }
  const headers = raw as Record<string, unknown>;
  return {
    world:
      typeof headers.world === 'string' && headers.world.trim()
        ? headers.world.trim()
        : typeof headers.worldLore === 'string' && headers.worldLore.trim()
          ? headers.worldLore.trim()
          : DEFAULT_SIDEBAR_HEADERS.world,
    play:
      typeof headers.play === 'string' && headers.play.trim()
        ? headers.play.trim()
        : typeof headers.gameManagement === 'string' && headers.gameManagement.trim()
          ? headers.gameManagement.trim()
          : DEFAULT_SIDEBAR_HEADERS.play,
    timeline:
      typeof headers.timeline === 'string' && headers.timeline.trim()
        ? headers.timeline.trim()
        : DEFAULT_SIDEBAR_HEADERS.timeline,
    tools:
      typeof headers.tools === 'string' && headers.tools.trim()
        ? headers.tools.trim()
        : DEFAULT_SIDEBAR_HEADERS.tools,
  };
}

function migrateLegacyFixedSectionId(id: string): SidebarSectionId | null {
  if (id === 'gallery') return 'visualAtlas';
  if (id === 'bookmarks') return 'quickAccess';
  if (id in SIDEBAR_SECTION_META) return id as SidebarSectionId;
  return null;
}

function normalizeFixedSectionIcons(
  raw: unknown,
): Partial<Record<SidebarSectionId, string>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const next: Partial<Record<SidebarSectionId, string>> = {};
  for (const [rawId, value] of Object.entries(source)) {
    const id = migrateLegacyFixedSectionId(rawId);
    if (!id || !SIDEBAR_FIXED_IDS.includes(id)) continue;
    const icon = normalizeStoredSidebarIcon(value, id);
    if (icon) next[id] = icon;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeFixedSectionVisibility(
  raw: unknown,
): Partial<Record<SidebarSectionId, boolean>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const next: Partial<Record<SidebarSectionId, boolean>> = {};
  for (const [rawId, value] of Object.entries(source)) {
    const id = migrateLegacyFixedSectionId(rawId);
    if (!id || typeof value !== 'boolean') continue;
    next[id] = value;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

const FIXED_SECTION_DEFAULT_VISIBILITY: Partial<Record<SidebarSectionId, boolean>> = {
  quickAccess: false,
  visualAtlas: false,
};

export function isFixedSectionVisible(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
): boolean {
  const stored = config.fixedSectionVisibility?.[sectionId];
  if (stored !== undefined) return stored;
  const defaultValue = FIXED_SECTION_DEFAULT_VISIBILITY[sectionId];
  return defaultValue ?? true;
}

export function toggleFixedSectionVisibility(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
): SidebarConfig {
  const nextVisible = !isFixedSectionVisible(config, sectionId);
  const fixedSectionVisibility = {
    ...(config.fixedSectionVisibility ?? {}),
    [sectionId]: nextVisible,
  };
  return { ...config, fixedSectionVisibility };
}

function stripEnrichmentFields(config: SidebarConfig): SidebarConfig {
  return {
    headers: config.headers,
    worldLoreOrder: config.worldLoreOrder.map(({ iconAssetUrl: _a, ...item }) => item),
    playOrder: config.playOrder.map(({ iconAssetUrl: _a, ...item }) => item),
    toolsOrder: config.toolsOrder.map(({ iconAssetUrl: _a, ...item }) => item),
    ...(config.fixedSectionIcons ? { fixedSectionIcons: config.fixedSectionIcons } : {}),
    ...(config.fixedSectionVisibility
      ? { fixedSectionVisibility: config.fixedSectionVisibility }
      : {}),
  };
}

function normalizeBucketItems(saved: SidebarOrderItem[]): SidebarOrderItem[] {
  const seen = new Set<string>();
  const merged: SidebarOrderItem[] = [];

  for (const item of saved) {
    const migratedId = migrateSidebarItemId(item.id);
    if (!migratedId || seen.has(migratedId)) continue;
    seen.add(migratedId);
    merged.push(normalizeOrderItem(item, migratedId));
  }

  return merged;
}

function mergeMissingIntoBucket(
  bucket: SidebarOrderItem[],
  defaultIds: SidebarSectionId[],
  globallySeen: Set<string>,
): SidebarOrderItem[] {
  let merged = [...bucket];
  for (const id of defaultIds) {
    if (!globallySeen.has(id)) {
      globallySeen.add(id);
      merged = [...merged, createDefaultSidebarOrderItem(id)];
    }
  }
  return merged;
}

function splitLegacyGameBucket(saved: SidebarOrderItem[]): {
  play: SidebarOrderItem[];
  tools: SidebarOrderItem[];
} {
  const play: SidebarOrderItem[] = [];
  const tools: SidebarOrderItem[] = [];
  const playSet = new Set<string>(SIDEBAR_PLAY_IDS);
  const toolsSet = new Set<string>(SIDEBAR_TOOLS_BUCKET_IDS);
  const seen = new Set<string>();

  for (const item of saved) {
    if (DROPPED_BUCKET_IDS.has(item.id)) continue;
    const migratedId = migrateSidebarItemId(item.id);
    if (!migratedId || seen.has(migratedId)) continue;
    seen.add(migratedId);
    const normalized = normalizeOrderItem(item, migratedId);
    if (playSet.has(migratedId)) {
      play.push(normalized);
    } else if (toolsSet.has(migratedId)) {
      tools.push(normalized);
    }
  }

  return { play, tools };
}

function migrateLegacySidebarOrder(order: SidebarOrderItem[]): SidebarConfig {
  const world: SidebarOrderItem[] = [];
  const play: SidebarOrderItem[] = [];
  const tools: SidebarOrderItem[] = [];
  const seen = new Set<string>();

  for (const item of order) {
    if (DROPPED_BUCKET_IDS.has(item.id)) continue;
    const migratedId = migrateSidebarItemId(item.id);
    if (!migratedId || seen.has(migratedId)) continue;
    seen.add(migratedId);
    const normalized = normalizeOrderItem(item, migratedId);
    if (SIDEBAR_WORLD_LORE_IDS.includes(migratedId)) {
      world.push(normalized);
    } else if (SIDEBAR_PLAY_IDS.includes(migratedId)) {
      play.push(normalized);
    } else if (SIDEBAR_TOOLS_BUCKET_IDS.includes(migratedId)) {
      tools.push(normalized);
    }
  }

  return normalizeSidebarConfig({
    worldLoreOrder: world,
    playOrder: play,
    toolsOrder: tools,
  });
}

export function isSidebarConfigBlank(raw: unknown): boolean {
  if (raw == null || typeof raw !== 'object') return true;
  const parsed = raw as {
    worldLoreOrder?: unknown;
    playOrder?: unknown;
    toolsOrder?: unknown;
    gameManagementOrder?: unknown;
    sidebarOrder?: unknown;
  };
  const hasWorld =
    Array.isArray(parsed.worldLoreOrder) && parsed.worldLoreOrder.length > 0;
  const hasPlay = Array.isArray(parsed.playOrder) && parsed.playOrder.length > 0;
  const hasTools =
    Array.isArray(parsed.toolsOrder) && parsed.toolsOrder.length > 0;
  const hasGame =
    Array.isArray(parsed.gameManagementOrder) &&
    parsed.gameManagementOrder.length > 0;
  const hasLegacy =
    Array.isArray(parsed.sidebarOrder) && parsed.sidebarOrder.length > 0;
  return !hasWorld && !hasPlay && !hasTools && !hasGame && !hasLegacy;
}

export function normalizeSidebarConfig(raw: unknown): SidebarConfig {
  if (isSidebarConfigBlank(raw)) {
    return getDefaultSidebarConfig();
  }

  const parsed = raw as {
    headers?: unknown;
    worldLoreOrder?: unknown;
    playOrder?: unknown;
    toolsOrder?: unknown;
    gameManagementOrder?: unknown;
    sidebarOrder?: unknown;
    fixedSectionIcons?: unknown;
    fixedSectionVisibility?: unknown;
  };

  if (Array.isArray(parsed.sidebarOrder) && parsed.sidebarOrder.length > 0) {
    const legacy = parsed.sidebarOrder.filter(isSidebarOrderItem);
    if (legacy.length > 0) {
      return migrateLegacySidebarOrder(legacy);
    }
  }

  const worldSaved = Array.isArray(parsed.worldLoreOrder)
    ? parsed.worldLoreOrder.filter(isSidebarOrderItem)
    : [];

  let playSaved = Array.isArray(parsed.playOrder)
    ? parsed.playOrder.filter(isSidebarOrderItem)
    : [];
  let toolsSaved = Array.isArray(parsed.toolsOrder)
    ? parsed.toolsOrder.filter(isSidebarOrderItem)
    : [];

  if (playSaved.length === 0 && toolsSaved.length === 0) {
    const gameSaved = Array.isArray(parsed.gameManagementOrder)
      ? parsed.gameManagementOrder.filter(isSidebarOrderItem)
      : [];
    if (gameSaved.length > 0) {
      const split = splitLegacyGameBucket(gameSaved);
      playSaved = split.play;
      toolsSaved = split.tools;
    }
  }

  if (worldSaved.length === 0 && playSaved.length === 0 && toolsSaved.length === 0) {
    return getDefaultSidebarConfig();
  }

  let worldLoreOrder = normalizeBucketItems(worldSaved);
  let playOrder = normalizeBucketItems(playSaved);
  let toolsOrder = normalizeBucketItems(toolsSaved);

  const globallySeen = new Set<string>([
    ...worldLoreOrder.map((item) => item.id),
    ...playOrder.map((item) => item.id),
    ...toolsOrder.map((item) => item.id),
  ]);

  worldLoreOrder = mergeMissingIntoBucket(
    worldLoreOrder,
    SIDEBAR_WORLD_LORE_IDS,
    globallySeen,
  );
  playOrder = mergeMissingIntoBucket(playOrder, SIDEBAR_PLAY_IDS, globallySeen);
  toolsOrder = mergeMissingIntoBucket(
    toolsOrder,
    SIDEBAR_TOOLS_BUCKET_IDS,
    globallySeen,
  );

  for (const id of SIDEBAR_CUSTOMIZABLE_IDS) {
    if (!globallySeen.has(id)) {
      globallySeen.add(id);
      if (SIDEBAR_WORLD_LORE_IDS.includes(id)) {
        worldLoreOrder.push(createDefaultSidebarOrderItem(id));
      } else if (SIDEBAR_PLAY_IDS.includes(id)) {
        playOrder.push(createDefaultSidebarOrderItem(id));
      } else {
        toolsOrder.push(createDefaultSidebarOrderItem(id));
      }
    }
  }

  const legacyRelationsVisibility = normalizeFixedSectionVisibility(
    parsed.fixedSectionVisibility,
  )?.relations;
  if (legacyRelationsVisibility !== undefined) {
    worldLoreOrder = worldLoreOrder.map((item) =>
      item.id === 'relations' ? { ...item, enabled: legacyRelationsVisibility } : item,
    );
  }
  toolsOrder = toolsOrder.filter((item) => item.id !== 'relations');

  const fixedSectionIcons = normalizeFixedSectionIcons(parsed.fixedSectionIcons);
  if (fixedSectionIcons?.relations) {
    worldLoreOrder = worldLoreOrder.map((item) =>
      item.id === 'relations' && !item.icon
        ? { ...item, icon: fixedSectionIcons.relations }
        : item,
    );
    delete fixedSectionIcons.relations;
  }

  const fixedSectionVisibility = normalizeFixedSectionVisibility(
    parsed.fixedSectionVisibility,
  );
  if (fixedSectionVisibility?.relations !== undefined) {
    delete fixedSectionVisibility.relations;
  }

  return {
    headers: normalizeHeaders(parsed.headers),
    worldLoreOrder,
    playOrder,
    toolsOrder,
    ...(fixedSectionIcons && Object.keys(fixedSectionIcons).length > 0
      ? { fixedSectionIcons }
      : {}),
    ...(fixedSectionVisibility && Object.keys(fixedSectionVisibility).length > 0
      ? { fixedSectionVisibility }
      : {}),
  };
}

export function isWorldLoreSection(id: string): boolean {
  return SIDEBAR_WORLD_LORE_IDS.includes(id as SidebarSectionId);
}

export function isPlaySection(id: string): boolean {
  return SIDEBAR_PLAY_IDS.includes(id as SidebarSectionId);
}

export function isToolsBucketSection(id: string): boolean {
  return SIDEBAR_TOOLS_BUCKET_IDS.includes(id as SidebarSectionId);
}

export function moveSidebarItem(
  config: SidebarConfig,
  from: { bucket: SidebarBucketKey; index: number },
  to: { bucket: SidebarBucketKey; index: number },
): SidebarConfig {
  const world = [...config.worldLoreOrder];
  const play = [...config.playOrder];
  const tools = [...config.toolsOrder];

  const buckets: Record<SidebarBucketKey, SidebarOrderItem[]> = {
    worldLore: world,
    play,
    tools,
  };

  const fromArr = buckets[from.bucket];
  const [item] = fromArr.splice(from.index, 1);
  if (!item) return config;

  buckets[to.bucket].splice(to.index, 0, item);

  return {
    ...config,
    worldLoreOrder: buckets.worldLore,
    playOrder: buckets.play,
    toolsOrder: buckets.tools,
  };
}

export function toggleSidebarItem(
  config: SidebarConfig,
  bucket: SidebarBucketKey,
  id: string,
): SidebarConfig {
  const key = bucketOrderKey(bucket);
  const order = config[key] as SidebarOrderItem[];
  return {
    ...config,
    [key]: order.map((row) =>
      row.id === id ? { ...row, enabled: !row.enabled } : row,
    ),
  };
}

export function updateSidebarItemCustomLabel(
  config: SidebarConfig,
  bucket: SidebarBucketKey,
  id: string,
  customLabel: string,
): SidebarConfig {
  const key = bucketOrderKey(bucket);
  const order = config[key] as SidebarOrderItem[];
  const trimmed = customLabel.trim();
  return {
    ...config,
    [key]: order.map((row) => {
      if (row.id !== id) return row;
      if (!trimmed || trimmed === row.label) {
        const { customLabel: _removed, ...rest } = row;
        return rest;
      }
      return { ...row, customLabel: trimmed };
    }),
  };
}

export function updateSidebarHeaders(
  config: SidebarConfig,
  patch: Partial<SidebarConfigHeaders>,
): SidebarConfig {
  const next: SidebarConfigHeaders = { ...config.headers };
  if (patch.world !== undefined) {
    next.world = patch.world.trim() || DEFAULT_SIDEBAR_HEADERS.world;
  }
  if (patch.play !== undefined) {
    next.play = patch.play.trim() || DEFAULT_SIDEBAR_HEADERS.play;
  }
  if (patch.timeline !== undefined) {
    next.timeline = patch.timeline.trim() || DEFAULT_SIDEBAR_HEADERS.timeline;
  }
  if (patch.tools !== undefined) {
    next.tools = patch.tools.trim() || DEFAULT_SIDEBAR_HEADERS.tools;
  }
  return { ...config, headers: next };
}

export function isSidebarFixedSection(sectionId: SidebarSectionId): boolean {
  return SIDEBAR_FIXED_IDS.includes(sectionId);
}

export function findSidebarBucketItem(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
): { bucket: SidebarBucketKey; item: SidebarOrderItem } | null {
  const worldIndex = config.worldLoreOrder.findIndex((row) => row.id === sectionId);
  if (worldIndex >= 0) {
    return { bucket: 'worldLore', item: config.worldLoreOrder[worldIndex]! };
  }
  const playIndex = config.playOrder.findIndex((row) => row.id === sectionId);
  if (playIndex >= 0) {
    return { bucket: 'play', item: config.playOrder[playIndex]! };
  }
  const toolsIndex = config.toolsOrder.findIndex((row) => row.id === sectionId);
  if (toolsIndex >= 0) {
    return { bucket: 'tools', item: config.toolsOrder[toolsIndex]! };
  }
  return null;
}

export function getSidebarSectionStoredIcon(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
): string | undefined {
  const bucketItem = findSidebarBucketItem(config, sectionId);
  if (bucketItem?.item.icon) return bucketItem.item.icon;
  return config.fixedSectionIcons?.[sectionId];
}

export function getSidebarSectionIconAssetUrl(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
): string | null | undefined {
  const bucketItem = findSidebarBucketItem(config, sectionId);
  if (bucketItem?.item.iconAssetUrl !== undefined) {
    return bucketItem.item.iconAssetUrl;
  }
  return config.fixedSectionIconAssetUrls?.[sectionId];
}

export function getSidebarSectionIcon(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
): string {
  return getSidebarSectionStoredIcon(config, sectionId) ?? defaultSidebarIconValue(sectionId);
}

export function updateSidebarSectionIcon(
  config: SidebarConfig,
  sectionId: SidebarSectionId,
  icon: string | null,
): SidebarConfig {
  const defaultValue = defaultSidebarIconValue(sectionId);
  const nextIcon =
    icon && icon.trim() && icon.trim() !== defaultValue ? icon.trim() : undefined;
  const bucketItem = findSidebarBucketItem(config, sectionId);

  if (bucketItem) {
    const key = bucketOrderKey(bucketItem.bucket);
    const order = config[key] as SidebarOrderItem[];
    return {
      ...config,
      [key]: order.map((row) => {
        if (row.id !== sectionId) return row;
        if (!nextIcon) {
          const { icon: _removed, iconAssetUrl: _url, ...rest } = row;
          return rest;
        }
        const { iconAssetUrl: _url, ...rest } = row;
        return { ...rest, icon: nextIcon };
      }),
    };
  }

  if (!isSidebarFixedSection(sectionId)) return config;

  const fixedSectionIcons = { ...(config.fixedSectionIcons ?? {}) };
  if (!nextIcon) {
    delete fixedSectionIcons[sectionId];
  } else {
    fixedSectionIcons[sectionId] = nextIcon;
  }

  const hasFixedIcons = Object.keys(fixedSectionIcons).length > 0;
  const nextFixedUrls = { ...(config.fixedSectionIconAssetUrls ?? {}) };
  delete nextFixedUrls[sectionId];

  return {
    ...config,
    ...(hasFixedIcons ? { fixedSectionIcons } : { fixedSectionIcons: undefined }),
    ...(Object.keys(nextFixedUrls).length > 0
      ? { fixedSectionIconAssetUrls: nextFixedUrls }
      : { fixedSectionIconAssetUrls: undefined }),
  };
}

export function stripSidebarConfigEnrichment(config: SidebarConfig): SidebarConfig {
  return stripEnrichmentFields(config);
}

export { defaultSidebarLucideName, defaultSidebarIconValue };
