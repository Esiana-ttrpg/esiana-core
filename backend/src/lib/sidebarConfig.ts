/**
 * Campaign sidebar layout — shared validation with frontend defaults.
 */

import { parseTagIconValue } from './tagIconValidation.js';
import {
  defaultSidebarIconValue,
  isSidebarFixedSectionId,
  SIDEBAR_FIXED_SECTION_IDS,
} from './sidebarIconDefaults.js';

export interface SidebarOrderItem {
  id: string;
  label: string;
  enabled: boolean;
  customLabel?: string;
  icon?: string;
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
  fixedSectionIcons?: Partial<Record<string, string>>;
  fixedSectionIconAssetUrls?: Partial<Record<string, string | null>>;
  fixedSectionVisibility?: Partial<Record<string, boolean>>;
}

const DEFAULT_HEADERS: SidebarConfigHeaders = {
  play: 'PLAY',
  world: 'WORLD',
  timeline: 'TIMELINE',
  tools: 'TOOLS',
};

const TIME_TRACKING_LABEL =
  'Time Tracking (Calendars, Timelines, Events)';

const WORLD_LORE_IDS = [
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

const PLAY_IDS = ['quests', 'downtime', 'journals', 'sessionNotes'];

const TOOLS_BUCKET_IDS = ['rules-resources'];

const DROPPED_BUCKET_IDS = new Set(['narrativeThreads', 'timeTracking']);

const SECTION_LABELS: Record<string, string> = {
  characters: 'Characters',
  bestiary: 'Bestiary',
  ancestries: 'Ancestries',
  organizations: 'Organizations',
  locations: 'Locations',
  maps: 'Maps',
  objects: 'Objects',
  families: 'Families',
  relations: 'Relations',
  'rules-resources': 'Rules/Resources',
  quests: 'Adventure',
  downtime: 'Downtime',
  journals: 'Journals',
  timeTracking: TIME_TRACKING_LABEL,
  sessionNotes: 'Session Notes',
};

const ALL_CUSTOMIZABLE_IDS = [...WORLD_LORE_IDS, ...PLAY_IDS, ...TOOLS_BUCKET_IDS];

const LEGACY_ID_MAP: Record<string, string> = {
  'time-tracking': 'timeTracking',
  'session-notes': 'sessionNotes',
};

function migrateId(id: string): string | null {
  const mapped = LEGACY_ID_MAP[id] ?? id;
  if (DROPPED_BUCKET_IDS.has(mapped)) return null;
  return SECTION_LABELS[mapped] ? mapped : null;
}

function createItem(id: string): SidebarOrderItem {
  return {
    id,
    label: SECTION_LABELS[id] ?? id,
    enabled: id !== 'objects',
  };
}

function normalizeStoredIcon(
  raw: unknown,
  sectionId: string,
): string | undefined {
  const parsed = parseTagIconValue(raw);
  if (!parsed.ok || !parsed.value) return undefined;
  const defaultValue = defaultSidebarIconValue(sectionId);
  if (parsed.value === defaultValue) return undefined;
  return parsed.value;
}

export function getDefaultSidebarConfig(): SidebarConfig {
  return {
    headers: { ...DEFAULT_HEADERS },
    worldLoreOrder: WORLD_LORE_IDS.map(createItem),
    playOrder: PLAY_IDS.map(createItem),
    toolsOrder: TOOLS_BUCKET_IDS.map(createItem),
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

function normalizeHeaders(raw: unknown): SidebarConfigHeaders {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_HEADERS };
  }
  const headers = raw as Record<string, unknown>;
  return {
    world:
      typeof headers.world === 'string' && headers.world.trim()
        ? headers.world.trim()
        : typeof headers.worldLore === 'string' && headers.worldLore.trim()
          ? headers.worldLore.trim()
          : DEFAULT_HEADERS.world,
    play:
      typeof headers.play === 'string' && headers.play.trim()
        ? headers.play.trim()
        : typeof headers.gameManagement === 'string' && headers.gameManagement.trim()
          ? headers.gameManagement.trim()
          : DEFAULT_HEADERS.play,
    timeline:
      typeof headers.timeline === 'string' && headers.timeline.trim()
        ? headers.timeline.trim()
        : DEFAULT_HEADERS.timeline,
    tools:
      typeof headers.tools === 'string' && headers.tools.trim()
        ? headers.tools.trim()
        : DEFAULT_HEADERS.tools,
  };
}

function isSupersededSystemLabel(sectionId: string, label: string): boolean {
  return sectionId === 'quests' && label === 'Quests';
}

function normalizeOrderItem(item: SidebarOrderItem, migratedId: string): SidebarOrderItem {
  const systemLabel = SECTION_LABELS[migratedId];
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

  const icon = normalizeStoredIcon(item.icon, migratedId);

  return {
    id: migratedId,
    label: systemLabel,
    enabled: item.enabled,
    ...(customLabel ? { customLabel } : {}),
    ...(icon ? { icon } : {}),
  };
}

function migrateLegacyFixedSectionId(id: string): string | null {
  if (id === 'gallery') return 'visualAtlas';
  if (id === 'bookmarks') return 'quickAccess';
  if (id === 'relations') return 'relations';
  return isSidebarFixedSectionId(id) ? id : null;
}

function normalizeFixedSectionIcons(
  raw: unknown,
): Partial<Record<string, string>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const next: Partial<Record<string, string>> = {};
  for (const [rawId, value] of Object.entries(source)) {
    const id = migrateLegacyFixedSectionId(rawId);
    if (!id) continue;
    const icon = normalizeStoredIcon(value, id);
    if (icon) next[id] = icon;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeFixedSectionVisibility(
  raw: unknown,
): Partial<Record<string, boolean>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const next: Partial<Record<string, boolean>> = {};
  for (const [rawId, value] of Object.entries(source)) {
    if (rawId === 'relations' && typeof value === 'boolean') {
      next.relations = value;
      continue;
    }
    const id = migrateLegacyFixedSectionId(rawId);
    if (!id || typeof value !== 'boolean') continue;
    next[id] = value;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeBucket(saved: SidebarOrderItem[]): SidebarOrderItem[] {
  const seen = new Set<string>();
  const merged: SidebarOrderItem[] = [];
  for (const item of saved) {
    const migratedId = migrateId(item.id);
    if (!migratedId || seen.has(migratedId)) continue;
    seen.add(migratedId);
    merged.push(normalizeOrderItem(item, migratedId));
  }
  return merged;
}

function splitLegacyGameBucket(saved: SidebarOrderItem[]): {
  play: SidebarOrderItem[];
  tools: SidebarOrderItem[];
} {
  const play: SidebarOrderItem[] = [];
  const tools: SidebarOrderItem[] = [];
  const playSet = new Set(PLAY_IDS);
  const toolsSet = new Set(TOOLS_BUCKET_IDS);
  const seen = new Set<string>();

  for (const item of saved) {
    if (DROPPED_BUCKET_IDS.has(item.id)) continue;
    const migratedId = migrateId(item.id);
    if (!migratedId || seen.has(migratedId)) continue;
    seen.add(migratedId);
    const normalized = normalizeOrderItem(item, migratedId);
    if (playSet.has(migratedId)) play.push(normalized);
    else if (toolsSet.has(migratedId)) tools.push(normalized);
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
    const migratedId = migrateId(item.id);
    if (!migratedId || seen.has(migratedId)) continue;
    seen.add(migratedId);
    const normalized = normalizeOrderItem(item, migratedId);
    if (WORLD_LORE_IDS.includes(migratedId)) {
      world.push(normalized);
    } else if (PLAY_IDS.includes(migratedId)) {
      play.push(normalized);
    } else if (TOOLS_BUCKET_IDS.includes(migratedId)) {
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

  let worldLoreOrder = normalizeBucket(worldSaved);
  let playOrder = normalizeBucket(playSaved);
  let toolsOrder = normalizeBucket(toolsSaved);

  const globallySeen = new Set<string>([
    ...worldLoreOrder.map((item) => item.id),
    ...playOrder.map((item) => item.id),
    ...toolsOrder.map((item) => item.id),
  ]);

  for (const id of WORLD_LORE_IDS) {
    if (!globallySeen.has(id)) {
      globallySeen.add(id);
      worldLoreOrder.push(createItem(id));
    }
  }
  for (const id of PLAY_IDS) {
    if (!globallySeen.has(id)) {
      globallySeen.add(id);
      playOrder.push(createItem(id));
    }
  }
  for (const id of TOOLS_BUCKET_IDS) {
    if (!globallySeen.has(id)) {
      globallySeen.add(id);
      toolsOrder.push(createItem(id));
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

export function parseSidebarConfigPayload(body: unknown): SidebarConfig | null {
  if (!body || typeof body !== 'object') return null;

  const parsed = body as {
    headers?: unknown;
    worldLoreOrder?: unknown;
    playOrder?: unknown;
    toolsOrder?: unknown;
    gameManagementOrder?: unknown;
    fixedSectionIcons?: unknown;
    fixedSectionVisibility?: unknown;
  };

  const hasNewFormat =
    Array.isArray(parsed.playOrder) && Array.isArray(parsed.toolsOrder);
  const hasLegacyFormat = Array.isArray(parsed.gameManagementOrder);

  if (!Array.isArray(parsed.worldLoreOrder)) {
    return null;
  }

  if (!hasNewFormat && !hasLegacyFormat) {
    return null;
  }

  if (!parsed.worldLoreOrder.every(isSidebarOrderItem)) {
    return null;
  }

  if (hasNewFormat) {
    const playOrder = parsed.playOrder as unknown[];
    const toolsOrder = parsed.toolsOrder as unknown[];
    if (!playOrder.every(isSidebarOrderItem) || !toolsOrder.every(isSidebarOrderItem)) {
      return null;
    }
  } else if (!(parsed.gameManagementOrder as unknown[]).every(isSidebarOrderItem)) {
    return null;
  }

  if (parsed.headers !== undefined) {
    if (!parsed.headers || typeof parsed.headers !== 'object') return null;
  }

  if (parsed.fixedSectionIcons !== undefined) {
    if (!parsed.fixedSectionIcons || typeof parsed.fixedSectionIcons !== 'object') {
      return null;
    }
    const fixed = parsed.fixedSectionIcons as Record<string, unknown>;
    for (const key of Object.keys(fixed)) {
      const migrated = migrateLegacyFixedSectionId(key);
      if (!migrated) return null;
      const iconParsed = parseTagIconValue(fixed[key]);
      if (!iconParsed.ok) return null;
    }
  }

  if (parsed.fixedSectionVisibility !== undefined) {
    if (!parsed.fixedSectionVisibility || typeof parsed.fixedSectionVisibility !== 'object') {
      return null;
    }
    const visibility = parsed.fixedSectionVisibility as Record<string, unknown>;
    for (const key of Object.keys(visibility)) {
      const migrated = migrateLegacyFixedSectionId(key);
      if (!migrated || typeof visibility[key] !== 'boolean') return null;
    }
  }

  const normalized = normalizeSidebarConfig({
    headers: parsed.headers,
    worldLoreOrder: parsed.worldLoreOrder,
    ...(hasNewFormat
      ? { playOrder: parsed.playOrder, toolsOrder: parsed.toolsOrder }
      : { gameManagementOrder: parsed.gameManagementOrder }),
    fixedSectionIcons: parsed.fixedSectionIcons,
    fixedSectionVisibility: parsed.fixedSectionVisibility,
  });

  const seen = new Set<string>();
  const allItems = [
    ...normalized.worldLoreOrder,
    ...normalized.playOrder,
    ...normalized.toolsOrder,
  ];

  for (const item of allItems) {
    if (!ALL_CUSTOMIZABLE_IDS.includes(item.id)) return null;
    if (seen.has(item.id)) return null;
    seen.add(item.id);
    if (item.icon !== undefined) {
      const iconParsed = parseTagIconValue(item.icon);
      if (!iconParsed.ok) return null;
    }
  }

  for (const id of ALL_CUSTOMIZABLE_IDS) {
    if (!seen.has(id)) return null;
  }

  return normalized;
}

export function findSidebarBucketKey(
  config: SidebarConfig,
  sectionId: string,
): 'worldLoreOrder' | 'playOrder' | 'toolsOrder' | null {
  if (config.worldLoreOrder.some((row) => row.id === sectionId)) {
    return 'worldLoreOrder';
  }
  if (config.playOrder.some((row) => row.id === sectionId)) {
    return 'playOrder';
  }
  if (config.toolsOrder.some((row) => row.id === sectionId)) {
    return 'toolsOrder';
  }
  return null;
}

export function applySidebarSectionIcon(
  config: SidebarConfig,
  sectionId: string,
  icon: string,
): SidebarConfig {
  const defaultValue = defaultSidebarIconValue(sectionId);
  const nextIcon = icon.trim() !== defaultValue ? icon.trim() : undefined;
  const bucketKey = findSidebarBucketKey(config, sectionId);

  if (bucketKey) {
    return {
      ...config,
      [bucketKey]: config[bucketKey].map((row) => {
        if (row.id !== sectionId) return row;
        if (!nextIcon) {
          const { icon: _removed, ...rest } = row;
          return rest;
        }
        return { ...row, icon: nextIcon };
      }),
    };
  }

  if (!isSidebarFixedSectionId(sectionId)) {
    return config;
  }

  const fixedSectionIcons = { ...(config.fixedSectionIcons ?? {}) };
  if (!nextIcon) {
    delete fixedSectionIcons[sectionId];
  } else {
    fixedSectionIcons[sectionId] = nextIcon;
  }

  return {
    ...config,
    ...(Object.keys(fixedSectionIcons).length > 0
      ? { fixedSectionIcons }
      : { fixedSectionIcons: undefined }),
  };
}

export function collectSidebarIconRefs(config: SidebarConfig): string[] {
  const refs: string[] = [];
  for (const item of [
    ...config.worldLoreOrder,
    ...config.playOrder,
    ...config.toolsOrder,
  ]) {
    if (item.icon?.startsWith('asset:')) refs.push(item.icon);
  }
  if (config.fixedSectionIcons) {
    for (const icon of Object.values(config.fixedSectionIcons)) {
      if (icon?.startsWith('asset:')) refs.push(icon);
    }
  }
  return refs;
}

export { isSidebarFixedSectionId, SIDEBAR_FIXED_SECTION_IDS };
