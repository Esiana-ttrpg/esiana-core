/**
 * Layer 1 — downtime haven simulation contracts (wiki-linked).
 * WikiPage = narrative surface; DowntimeHaven row = persistent anchor state.
 * @see docs/architecture-internal/downtime-havens.md
 */
import type { HavenSimulationAxis } from './havenSimulation.js';

export const DOWNTIME_HAVEN_SEMANTICS_VERSION = 'downtime-haven-v2';
export const LEGACY_DOWNTIME_HAVEN_SEMANTICS_VERSION = 'downtime-haven-v1';

export const DOWNTIME_HAVEN_TEMPLATE_TYPE = 'DOWNTIME_HAVEN';

export const HAVEN_TYPES = [
  'inn',
  'ship',
  'camp',
  'sanctuary',
  'estate',
  'station',
  'fortress',
  'caravan',
  'custom',
] as const;

export type HavenType = (typeof HAVEN_TYPES)[number];

export const DEFAULT_HAVEN_TYPE: HavenType = 'sanctuary';

export const HAVEN_STATUSES = [
  'prosperous',
  'damaged',
  'hidden',
  'threatened',
  'under_siege',
] as const;

export type HavenStatus = (typeof HAVEN_STATUSES)[number];

export const DEFAULT_HAVEN_STATUS: HavenStatus = 'prosperous';

export const HAVEN_SCALES = ['outpost', 'modest', 'sprawling', 'legendary'] as const;

export type HavenScale = (typeof HAVEN_SCALES)[number];

export const HAVEN_OWNERSHIP_TYPES = [
  'party',
  'faction',
  'shared',
  'patron_owned',
] as const;

export type HavenOwnershipType = (typeof HAVEN_OWNERSHIP_TYPES)[number];

export const HAVEN_PRIMARY_THEMES = [
  'smuggler',
  'arcane',
  'militant',
  'noble',
  'sacred',
  'neutral',
] as const;

export type HavenPrimaryTheme = (typeof HAVEN_PRIMARY_THEMES)[number];

export const HAVEN_DISCOVERY_STATES = [
  'public',
  'known',
  'concealed',
  'mythic',
] as const;

export type HavenDiscoveryState = (typeof HAVEN_DISCOVERY_STATES)[number];

export const HAVEN_THREAT_SEVERITIES = ['low', 'rising', 'critical'] as const;

export type HavenThreatSeverity = (typeof HAVEN_THREAT_SEVERITIES)[number];

export const HAVEN_ACTIVITY_ORIGINS = [
  'manual',
  'project_outcome',
  'event_consequence',
  'future_simulation',
  'migration',
] as const;

export type HavenActivityOrigin = (typeof HAVEN_ACTIVITY_ORIGINS)[number];

export const HAVEN_ACTIVITY_TONES = ['neutral', 'warning', 'escalation'] as const;

export type HavenActivityTone = (typeof HAVEN_ACTIVITY_TONES)[number];

const HAVEN_TYPE_LABELS: Record<HavenType, string> = {
  inn: 'Inn',
  ship: 'Ship',
  camp: 'Camp',
  sanctuary: 'Sanctuary',
  estate: 'Estate',
  station: 'Station',
  fortress: 'Fortress',
  caravan: 'Caravan',
  custom: 'Custom',
};

const HAVEN_STATUS_LABELS: Record<HavenStatus, string> = {
  prosperous: 'Prosperous',
  damaged: 'Damaged',
  hidden: 'Hidden',
  threatened: 'Threatened',
  under_siege: 'Under siege',
};

const HAVEN_SCALE_LABELS: Record<HavenScale, string> = {
  outpost: 'Outpost',
  modest: 'Modest',
  sprawling: 'Sprawling',
  legendary: 'Legendary',
};

const HAVEN_OWNERSHIP_LABELS: Record<HavenOwnershipType, string> = {
  party: 'Party',
  faction: 'Faction',
  shared: 'Shared',
  patron_owned: 'Patron-owned',
};

const HAVEN_THEME_LABELS: Record<HavenPrimaryTheme, string> = {
  smuggler: 'Smuggler',
  arcane: 'Arcane',
  militant: 'Militant',
  noble: 'Noble',
  sacred: 'Sacred',
  neutral: 'Neutral',
};

const HAVEN_DISCOVERY_LABELS: Record<HavenDiscoveryState, string> = {
  public: 'Public',
  known: 'Known',
  concealed: 'Concealed',
  mythic: 'Mythic',
};

export interface HavenCrewEntry {
  id: string;
  label: string;
  role: string | null;
  pageId: string | null;
}

export interface HavenUpgradeEntry {
  id: string;
  label: string;
  description: string | null;
  establishedAtEpochMinute: string | null;
  establishedByProjectId: string | null;
  establishedByProjectTitle: string | null;
}

export interface HavenThreatEntry {
  id: string;
  label: string;
  severity: HavenThreatSeverity | null;
  description: string | null;
  sinceEpochMinute: string | null;
}

export interface HavenBenefitEntry {
  id: string;
  label: string;
  description: string | null;
}

export interface HavenActivityEntry {
  id: string;
  summary: string;
  atEpochMinute: string | null;
  tone: HavenActivityTone | null;
  origin: HavenActivityOrigin;
  sourceProjectId: string | null;
}

export interface HavenIdentityHints {
  summary: string | null;
  portraitAssetId: string | null;
  crestAssetId: string | null;
  galleryAssetIds: string[];
}

export const HAVEN_REFERENCE_TYPES = [
  'map',
  'rules',
  'handout',
  'vtt_scene',
  'external_doc',
  'image',
  'timeline_event',
  'wiki_page',
] as const;

export type HavenReferenceType = (typeof HAVEN_REFERENCE_TYPES)[number];

export const HAVEN_REFERENCE_TARGET_TYPES = [
  'wiki_page',
  'asset',
  'calendar_event',
  'map_pin',
  'external',
] as const;

export type HavenReferenceTargetType = (typeof HAVEN_REFERENCE_TARGET_TYPES)[number];

export interface HavenReferenceEntry {
  id: string;
  type: HavenReferenceType;
  title: string;
  targetType: HavenReferenceTargetType;
  targetId: string | null;
  url: string | null;
  relatedSpaceId: string | null;
  sortOrder: number;
}

export interface HavenSpaceEntry {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

export interface DowntimeHavenFields {
  semanticsVersion: string;
  havenType: HavenType;
  status: HavenStatus;
  locationPageId: string | null;
  scale: HavenScale | null;
  ownershipType: HavenOwnershipType | null;
  primaryTheme: HavenPrimaryTheme | null;
  establishedAt: string | null;
  discoveryState: HavenDiscoveryState | null;
  residentPageIds: string[];
  factionPageIds: string[];
  crew: HavenCrewEntry[];
  upgrades: HavenUpgradeEntry[];
  threats: HavenThreatEntry[];
  passiveBenefits: HavenBenefitEntry[];
  activityLog: HavenActivityEntry[];
  relatedPageIds: string[];
  identityHints: HavenIdentityHints;
  references: HavenReferenceEntry[];
  spaces: HavenSpaceEntry[];
  simulationHints: Record<string, unknown>;
}

export type DowntimeHavenSummary = {
  id: string;
  wikiPageId: string;
  title: string;
  href: string;
  havenType: HavenType;
  status: HavenStatus;
  scale: HavenScale | null;
  ownershipType: HavenOwnershipType | null;
  primaryTheme: HavenPrimaryTheme | null;
  discoveryState: HavenDiscoveryState | null;
  locationPageId: string | null;
  activeProjectCount: number;
  escalatingThreatCount: number;
  updatedAt: string;
};

export type DowntimeHavenDetail = DowntimeHavenSummary & {
  establishedAt: string | null;
  residentPageIds: string[];
  factionPageIds: string[];
  crew: HavenCrewEntry[];
  upgrades: HavenUpgradeEntry[];
  threats: HavenThreatEntry[];
  passiveBenefits: HavenBenefitEntry[];
  activityLog: HavenActivityEntry[];
  relatedPageIds: string[];
  identityHints: HavenIdentityHints;
  references: HavenReferenceEntry[];
  spaces: HavenSpaceEntry[];
  simulationHints: Record<string, unknown>;
  semanticsVersion: string;
  createdAt: string;
};

export type ProjectHavenEffectPayload = {
  activitySummary?: string;
  status?: HavenStatus;
  upgrade?: {
    label: string;
    description?: string | null;
  };
  threat?: {
    label: string;
    severity?: HavenThreatSeverity | null;
    description?: string | null;
  };
  simulationDeltas?: Partial<Record<HavenSimulationAxis, number>>;
};

function randomId(): string {
  return `haven-${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizeNullableString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function normalizeHavenType(raw: unknown): HavenType {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_TYPES as readonly string[]).includes(lower)) {
      return lower as HavenType;
    }
  }
  return DEFAULT_HAVEN_TYPE;
}

export function normalizeHavenStatus(raw: unknown): HavenStatus {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_STATUSES as readonly string[]).includes(lower)) {
      return lower as HavenStatus;
    }
  }
  return DEFAULT_HAVEN_STATUS;
}

export function normalizeHavenScale(raw: unknown): HavenScale | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_SCALES as readonly string[]).includes(lower)) {
      return lower as HavenScale;
    }
  }
  return null;
}

export function normalizeHavenOwnershipType(raw: unknown): HavenOwnershipType | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_OWNERSHIP_TYPES as readonly string[]).includes(lower)) {
      return lower as HavenOwnershipType;
    }
  }
  return null;
}

export function normalizeHavenPrimaryTheme(raw: unknown): HavenPrimaryTheme | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_PRIMARY_THEMES as readonly string[]).includes(lower)) {
      return lower as HavenPrimaryTheme;
    }
  }
  return null;
}

export function normalizeHavenDiscoveryState(raw: unknown): HavenDiscoveryState | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_DISCOVERY_STATES as readonly string[]).includes(lower)) {
      return lower as HavenDiscoveryState;
    }
  }
  return null;
}

export function normalizeHavenThreatSeverity(raw: unknown): HavenThreatSeverity | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_THREAT_SEVERITIES as readonly string[]).includes(lower)) {
      return lower as HavenThreatSeverity;
    }
  }
  return null;
}

export function normalizeHavenActivityOrigin(raw: unknown): HavenActivityOrigin {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_ACTIVITY_ORIGINS as readonly string[]).includes(lower)) {
      return lower as HavenActivityOrigin;
    }
  }
  return 'manual';
}

export function normalizeHavenActivityTone(raw: unknown): HavenActivityTone | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_ACTIVITY_TONES as readonly string[]).includes(lower)) {
      return lower as HavenActivityTone;
    }
  }
  return null;
}

export function normalizeSimulationHints(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

export type HavenLedgerSimulationHints = {
  ledgerUpkeepSuggestionsEnabled: boolean;
  upkeepCost: number | null;
  constructionCost: number | null;
};

export function parseHavenLedgerSimulationHints(raw: unknown): HavenLedgerSimulationHints {
  const hints = normalizeSimulationHints(raw);
  const upkeepCost =
    typeof hints.upkeepCost === 'number' && Number.isFinite(hints.upkeepCost)
      ? Math.floor(hints.upkeepCost)
      : null;
  const constructionCost =
    typeof hints.constructionCost === 'number' && Number.isFinite(hints.constructionCost)
      ? Math.floor(hints.constructionCost)
      : null;
  return {
    ledgerUpkeepSuggestionsEnabled: hints.ledgerUpkeepSuggestionsEnabled === true,
    upkeepCost: upkeepCost != null && upkeepCost > 0 ? upkeepCost : null,
    constructionCost:
      constructionCost != null && constructionCost > 0 ? constructionCost : null,
  };
}

function parseCrewEntry(raw: unknown, index: number): HavenCrewEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  return {
    id: normalizeNullableString(record.id) ?? `crew-${index}`,
    label,
    role: normalizeNullableString(record.role),
    pageId: normalizeNullableString(record.pageId),
  };
}

function parseUpgradeEntry(raw: unknown, index: number): HavenUpgradeEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  return {
    id: normalizeNullableString(record.id) ?? `upgrade-${index}`,
    label,
    description: normalizeNullableString(record.description),
    establishedAtEpochMinute: normalizeNullableString(record.establishedAtEpochMinute),
    establishedByProjectId: normalizeNullableString(record.establishedByProjectId),
    establishedByProjectTitle: normalizeNullableString(record.establishedByProjectTitle),
  };
}

function parseThreatEntry(raw: unknown, index: number): HavenThreatEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  return {
    id: normalizeNullableString(record.id) ?? `threat-${index}`,
    label,
    severity: normalizeHavenThreatSeverity(record.severity),
    description: normalizeNullableString(record.description),
    sinceEpochMinute: normalizeNullableString(record.sinceEpochMinute),
  };
}

function parseBenefitEntry(raw: unknown, index: number): HavenBenefitEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  return {
    id: normalizeNullableString(record.id) ?? `benefit-${index}`,
    label,
    description: normalizeNullableString(record.description),
  };
}

export function parseHavenActivityEntry(raw: unknown, index: number): HavenActivityEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const summary = normalizeNullableString(record.summary);
  if (!summary) return null;
  return {
    id: normalizeNullableString(record.id) ?? `activity-${index}`,
    summary,
    atEpochMinute: normalizeNullableString(record.atEpochMinute),
    tone: normalizeHavenActivityTone(record.tone),
    origin: normalizeHavenActivityOrigin(record.origin),
    sourceProjectId: normalizeNullableString(record.sourceProjectId),
  };
}

export function emptyHavenIdentityHints(): HavenIdentityHints {
  return {
    summary: null,
    portraitAssetId: null,
    crestAssetId: null,
    galleryAssetIds: [],
  };
}

export function normalizeHavenReferenceType(raw: unknown): HavenReferenceType {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_REFERENCE_TYPES as readonly string[]).includes(lower)) {
      return lower as HavenReferenceType;
    }
  }
  return 'wiki_page';
}

export function normalizeHavenReferenceTargetType(raw: unknown): HavenReferenceTargetType {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if ((HAVEN_REFERENCE_TARGET_TYPES as readonly string[]).includes(lower)) {
      return lower as HavenReferenceTargetType;
    }
  }
  return 'wiki_page';
}

function normalizeSortOrder(raw: unknown, index: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
  return index;
}

export function parseHavenIdentityHints(raw: unknown): HavenIdentityHints {
  const base = emptyHavenIdentityHints();
  if (!raw || typeof raw !== 'object') return base;
  const record = raw as Record<string, unknown>;
  return {
    summary: normalizeNullableString(record.summary),
    portraitAssetId: normalizeNullableString(record.portraitAssetId),
    crestAssetId: normalizeNullableString(record.crestAssetId),
    galleryAssetIds: normalizeStringArray(record.galleryAssetIds),
  };
}

export function parseHavenReferenceEntry(raw: unknown, index: number): HavenReferenceEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const title = normalizeNullableString(record.title);
  if (!title) return null;
  const type = normalizeHavenReferenceType(record.type);
  const targetType = normalizeHavenReferenceTargetType(record.targetType);
  const url = normalizeNullableString(record.url);
  if (type === 'external_doc' && !url && targetType === 'external') {
    return null;
  }
  if (targetType !== 'external' && !normalizeNullableString(record.targetId) && !url) {
    return null;
  }
  return {
    id: normalizeNullableString(record.id) ?? `ref-${index}`,
    type,
    title,
    targetType,
    targetId: normalizeNullableString(record.targetId),
    url,
    relatedSpaceId: normalizeNullableString(record.relatedSpaceId),
    sortOrder: normalizeSortOrder(record.sortOrder, index),
  };
}

export function parseHavenSpaceEntry(raw: unknown, index: number): HavenSpaceEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeNullableString(record.label);
  if (!label) return null;
  return {
    id: normalizeNullableString(record.id) ?? `space-${index}`,
    label,
    description: normalizeNullableString(record.description),
    sortOrder: normalizeSortOrder(record.sortOrder, index),
  };
}

export function sortHavenReferences(entries: HavenReferenceEntry[]): HavenReferenceEntry[] {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function sortHavenSpaces(entries: HavenSpaceEntry[]): HavenSpaceEntry[] {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createHavenReferenceEntry(input: {
  type: HavenReferenceType;
  title: string;
  targetType: HavenReferenceTargetType;
  targetId?: string | null;
  url?: string | null;
  relatedSpaceId?: string | null;
  sortOrder?: number;
}): HavenReferenceEntry {
  return {
    id: randomId(),
    type: input.type,
    title: input.title.trim(),
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    url: input.url ?? null,
    relatedSpaceId: input.relatedSpaceId ?? null,
    sortOrder: input.sortOrder ?? 0,
  };
}

export function createHavenSpaceEntry(input: {
  label: string;
  description?: string | null;
  sortOrder?: number;
}): HavenSpaceEntry {
  return {
    id: randomId(),
    label: input.label.trim(),
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? 0,
  };
}

export function createHavenBenefitEntry(input: {
  label: string;
  description?: string | null;
}): HavenBenefitEntry {
  return {
    id: randomId(),
    label: input.label.trim(),
    description: input.description ?? null,
  };
}

export function emptyDowntimeHavenFields(): DowntimeHavenFields {
  return {
    semanticsVersion: DOWNTIME_HAVEN_SEMANTICS_VERSION,
    havenType: DEFAULT_HAVEN_TYPE,
    status: DEFAULT_HAVEN_STATUS,
    locationPageId: null,
    scale: null,
    ownershipType: null,
    primaryTheme: null,
    establishedAt: null,
    discoveryState: null,
    residentPageIds: [],
    factionPageIds: [],
    crew: [],
    upgrades: [],
    threats: [],
    passiveBenefits: [],
    activityLog: [],
    relatedPageIds: [],
    identityHints: emptyHavenIdentityHints(),
    references: [],
    spaces: [],
    simulationHints: {},
  };
}

export function parseDowntimeHavenFields(raw: unknown): DowntimeHavenFields {
  const base = emptyDowntimeHavenFields();
  if (!raw || typeof raw !== 'object') return base;
  const record = raw as Record<string, unknown>;

  const crew = Array.isArray(record.crew)
    ? record.crew
        .map((entry, index) => parseCrewEntry(entry, index))
        .filter((entry): entry is HavenCrewEntry => entry != null)
    : base.crew;

  const upgrades = Array.isArray(record.upgrades)
    ? record.upgrades
        .map((entry, index) => parseUpgradeEntry(entry, index))
        .filter((entry): entry is HavenUpgradeEntry => entry != null)
    : base.upgrades;

  const threats = Array.isArray(record.threats)
    ? record.threats
        .map((entry, index) => parseThreatEntry(entry, index))
        .filter((entry): entry is HavenThreatEntry => entry != null)
    : base.threats;

  const passiveBenefits = Array.isArray(record.passiveBenefits)
    ? record.passiveBenefits
        .map((entry, index) => parseBenefitEntry(entry, index))
        .filter((entry): entry is HavenBenefitEntry => entry != null)
    : base.passiveBenefits;

  const activityLog = Array.isArray(record.activityLog)
    ? record.activityLog
        .map((entry, index) => parseHavenActivityEntry(entry, index))
        .filter((entry): entry is HavenActivityEntry => entry != null)
    : base.activityLog;

  const references = Array.isArray(record.references)
    ? sortHavenReferences(
        record.references
          .map((entry, index) => parseHavenReferenceEntry(entry, index))
          .filter((entry): entry is HavenReferenceEntry => entry != null),
      )
    : base.references;

  const spaces = Array.isArray(record.spaces)
    ? sortHavenSpaces(
        record.spaces
          .map((entry, index) => parseHavenSpaceEntry(entry, index))
          .filter((entry): entry is HavenSpaceEntry => entry != null),
      )
    : base.spaces;

  return {
    semanticsVersion:
      normalizeNullableString(record.semanticsVersion) ?? DOWNTIME_HAVEN_SEMANTICS_VERSION,
    havenType: normalizeHavenType(record.havenType),
    status: normalizeHavenStatus(record.status),
    locationPageId: normalizeNullableString(record.locationPageId),
    scale: normalizeHavenScale(record.scale),
    ownershipType: normalizeHavenOwnershipType(record.ownershipType),
    primaryTheme: normalizeHavenPrimaryTheme(record.primaryTheme),
    establishedAt: normalizeNullableString(record.establishedAt),
    discoveryState: normalizeHavenDiscoveryState(record.discoveryState),
    residentPageIds: normalizeStringArray(record.residentPageIds),
    factionPageIds: normalizeStringArray(record.factionPageIds),
    crew,
    upgrades,
    threats,
    passiveBenefits,
    activityLog,
    relatedPageIds: normalizeStringArray(record.relatedPageIds),
    identityHints: parseHavenIdentityHints(record.identityHints),
    references,
    spaces,
    simulationHints: normalizeSimulationHints(record.simulationHints),
  };
}

export function formatHavenTypeLabel(type: HavenType | null | undefined): string {
  if (!type) return 'Haven';
  return HAVEN_TYPE_LABELS[type] ?? type;
}

export function formatHavenStatusLabel(status: HavenStatus | null | undefined): string {
  if (!status) return 'Unknown';
  return HAVEN_STATUS_LABELS[status] ?? status;
}

export function formatHavenScaleLabel(scale: HavenScale | null | undefined): string | null {
  if (!scale) return null;
  return HAVEN_SCALE_LABELS[scale] ?? scale;
}

export function formatHavenOwnershipLabel(
  ownership: HavenOwnershipType | null | undefined,
): string | null {
  if (!ownership) return null;
  return HAVEN_OWNERSHIP_LABELS[ownership] ?? ownership;
}

export function formatHavenThemeLabel(theme: HavenPrimaryTheme | null | undefined): string | null {
  if (!theme) return null;
  return HAVEN_THEME_LABELS[theme] ?? theme;
}

export function formatHavenDiscoveryLabel(
  state: HavenDiscoveryState | null | undefined,
): string | null {
  if (!state) return null;
  return HAVEN_DISCOVERY_LABELS[state] ?? state;
}

export function isEscalatingThreat(threat: HavenThreatEntry): boolean {
  return threat.severity === 'rising' || threat.severity === 'critical';
}

export function sortThreatsBySeverity(threats: HavenThreatEntry[]): HavenThreatEntry[] {
  const order: Record<string, number> = { critical: 0, rising: 1, low: 2 };
  return [...threats].sort((a, b) => {
    const aKey = a.severity ?? 'low';
    const bKey = b.severity ?? 'low';
    return (order[aKey] ?? 3) - (order[bKey] ?? 3);
  });
}

export function sortActivityLogNewestFirst(
  entries: HavenActivityEntry[],
): HavenActivityEntry[] {
  return [...entries].sort((a, b) => {
    const aMinute = a.atEpochMinute ? BigInt(a.atEpochMinute) : 0n;
    const bMinute = b.atEpochMinute ? BigInt(b.atEpochMinute) : 0n;
    if (aMinute !== bMinute) return aMinute > bMinute ? -1 : 1;
    return 0;
  });
}

export function createHavenCrewEntry(input: {
  label: string;
  role?: string | null;
  pageId?: string | null;
}): HavenCrewEntry {
  return {
    id: randomId(),
    label: input.label.trim(),
    role: input.role ?? null,
    pageId: input.pageId ?? null,
  };
}

export function createHavenActivityEntry(input: {
  summary: string;
  origin: HavenActivityOrigin;
  atEpochMinute?: string | null;
  tone?: HavenActivityTone | null;
  sourceProjectId?: string | null;
}): HavenActivityEntry {
  return {
    id: randomId(),
    summary: input.summary.trim(),
    atEpochMinute: input.atEpochMinute ?? null,
    tone: input.tone ?? null,
    origin: input.origin,
    sourceProjectId: input.sourceProjectId ?? null,
  };
}

export function createHavenUpgradeEntry(input: {
  label: string;
  description?: string | null;
  establishedAtEpochMinute?: string | null;
  establishedByProjectId?: string | null;
  establishedByProjectTitle?: string | null;
}): HavenUpgradeEntry {
  return {
    id: randomId(),
    label: input.label.trim(),
    description: input.description ?? null,
    establishedAtEpochMinute: input.establishedAtEpochMinute ?? null,
    establishedByProjectId: input.establishedByProjectId ?? null,
    establishedByProjectTitle: input.establishedByProjectTitle ?? null,
  };
}

export function createHavenThreatEntry(input: {
  label: string;
  severity?: HavenThreatSeverity | null;
  description?: string | null;
  sinceEpochMinute?: string | null;
}): HavenThreatEntry {
  return {
    id: randomId(),
    label: input.label.trim(),
    severity: input.severity ?? null,
    description: input.description ?? null,
    sinceEpochMinute: input.sinceEpochMinute ?? null,
  };
}

export function parseProjectHavenEffectPayload(raw: unknown): ProjectHavenEffectPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const payload: ProjectHavenEffectPayload = {};
  const activitySummary = normalizeNullableString(record.activitySummary);
  if (activitySummary) payload.activitySummary = activitySummary;
  if (record.status !== undefined) {
    payload.status = normalizeHavenStatus(record.status);
  }
  if (record.upgrade && typeof record.upgrade === 'object') {
    const upgrade = record.upgrade as Record<string, unknown>;
    const label = normalizeNullableString(upgrade.label);
    if (label) {
      payload.upgrade = {
        label,
        description: normalizeNullableString(upgrade.description),
      };
    }
  }
  if (record.threat && typeof record.threat === 'object') {
    const threat = record.threat as Record<string, unknown>;
    const label = normalizeNullableString(threat.label);
    if (label) {
      payload.threat = {
        label,
        severity: normalizeHavenThreatSeverity(threat.severity),
        description: normalizeNullableString(threat.description),
      };
    }
  }
  if (record.simulationDeltas && typeof record.simulationDeltas === 'object') {
    const rawDeltas = record.simulationDeltas as Record<string, unknown>;
    const axisKeys = [
      'prosperity',
      'danger',
      'morale',
      'notoriety',
      'stability',
      'security',
    ] as const;
    const deltas: Partial<Record<HavenSimulationAxis, number>> = {};
    for (const key of axisKeys) {
      const value = rawDeltas[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        deltas[key] = value;
      }
    }
    if (Object.keys(deltas).length > 0) {
      payload.simulationDeltas = deltas;
    }
  }
  if (
    payload.activitySummary ||
    payload.status ||
    payload.upgrade ||
    payload.threat ||
    payload.simulationDeltas
  ) {
    return payload;
  }
  return null;
}

export function activityToneToFeedTone(
  tone: HavenActivityTone | null | undefined,
): 'neutral' | 'warning' | 'escalation' {
  if (tone === 'warning') return 'warning';
  if (tone === 'escalation') return 'escalation';
  return 'neutral';
}

export function threatSeverityToFeedTone(
  severity: HavenThreatSeverity | null | undefined,
): 'neutral' | 'warning' | 'escalation' {
  if (severity === 'critical') return 'escalation';
  if (severity === 'rising') return 'warning';
  return 'neutral';
}
