/**
 * Layer 1 — downtime haven simulation contracts (wiki-linked).
 * WikiPage = narrative surface; DowntimeHaven row = persistent anchor state.
 * @see docs/architecture-internal/downtime-havens.md
 */
import type { HavenSimulationAxis } from './havenSimulation.js';
export declare const DOWNTIME_HAVEN_SEMANTICS_VERSION = "downtime-haven-v2";
export declare const LEGACY_DOWNTIME_HAVEN_SEMANTICS_VERSION = "downtime-haven-v1";
export declare const DOWNTIME_HAVEN_TEMPLATE_TYPE = "DOWNTIME_HAVEN";
export declare const HAVEN_TYPES: readonly ["inn", "ship", "camp", "sanctuary", "estate", "station", "fortress", "caravan", "custom"];
export type HavenType = (typeof HAVEN_TYPES)[number];
export declare const DEFAULT_HAVEN_TYPE: HavenType;
export declare const HAVEN_STATUSES: readonly ["prosperous", "damaged", "hidden", "threatened", "under_siege"];
export type HavenStatus = (typeof HAVEN_STATUSES)[number];
export declare const DEFAULT_HAVEN_STATUS: HavenStatus;
export declare const HAVEN_SCALES: readonly ["outpost", "modest", "sprawling", "legendary"];
export type HavenScale = (typeof HAVEN_SCALES)[number];
export declare const HAVEN_OWNERSHIP_TYPES: readonly ["party", "faction", "shared", "patron_owned"];
export type HavenOwnershipType = (typeof HAVEN_OWNERSHIP_TYPES)[number];
export declare const HAVEN_PRIMARY_THEMES: readonly ["smuggler", "arcane", "militant", "noble", "sacred", "neutral"];
export type HavenPrimaryTheme = (typeof HAVEN_PRIMARY_THEMES)[number];
export declare const HAVEN_DISCOVERY_STATES: readonly ["public", "known", "concealed", "mythic"];
export type HavenDiscoveryState = (typeof HAVEN_DISCOVERY_STATES)[number];
export declare const HAVEN_THREAT_SEVERITIES: readonly ["low", "rising", "critical"];
export type HavenThreatSeverity = (typeof HAVEN_THREAT_SEVERITIES)[number];
export declare const HAVEN_ACTIVITY_ORIGINS: readonly ["manual", "project_outcome", "event_consequence", "future_simulation", "migration"];
export type HavenActivityOrigin = (typeof HAVEN_ACTIVITY_ORIGINS)[number];
export declare const HAVEN_ACTIVITY_TONES: readonly ["neutral", "warning", "escalation"];
export type HavenActivityTone = (typeof HAVEN_ACTIVITY_TONES)[number];
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
export declare const HAVEN_REFERENCE_TYPES: readonly ["map", "rules", "handout", "vtt_scene", "external_doc", "image", "timeline_event", "wiki_page"];
export type HavenReferenceType = (typeof HAVEN_REFERENCE_TYPES)[number];
export declare const HAVEN_REFERENCE_TARGET_TYPES: readonly ["wiki_page", "asset", "calendar_event", "map_pin", "external"];
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
export declare function normalizeNullableString(raw: unknown): string | null;
export declare function normalizeStringArray(raw: unknown): string[];
export declare function normalizeHavenType(raw: unknown): HavenType;
export declare function normalizeHavenStatus(raw: unknown): HavenStatus;
export declare function normalizeHavenScale(raw: unknown): HavenScale | null;
export declare function normalizeHavenOwnershipType(raw: unknown): HavenOwnershipType | null;
export declare function normalizeHavenPrimaryTheme(raw: unknown): HavenPrimaryTheme | null;
export declare function normalizeHavenDiscoveryState(raw: unknown): HavenDiscoveryState | null;
export declare function normalizeHavenThreatSeverity(raw: unknown): HavenThreatSeverity | null;
export declare function normalizeHavenActivityOrigin(raw: unknown): HavenActivityOrigin;
export declare function normalizeHavenActivityTone(raw: unknown): HavenActivityTone | null;
export declare function normalizeSimulationHints(raw: unknown): Record<string, unknown>;
export type HavenLedgerSimulationHints = {
    ledgerUpkeepSuggestionsEnabled: boolean;
    upkeepCost: number | null;
    constructionCost: number | null;
};
export declare function parseHavenLedgerSimulationHints(raw: unknown): HavenLedgerSimulationHints;
export declare function parseHavenActivityEntry(raw: unknown, index: number): HavenActivityEntry | null;
export declare function emptyHavenIdentityHints(): HavenIdentityHints;
export declare function normalizeHavenReferenceType(raw: unknown): HavenReferenceType;
export declare function normalizeHavenReferenceTargetType(raw: unknown): HavenReferenceTargetType;
export declare function parseHavenIdentityHints(raw: unknown): HavenIdentityHints;
export declare function parseHavenReferenceEntry(raw: unknown, index: number): HavenReferenceEntry | null;
export declare function parseHavenSpaceEntry(raw: unknown, index: number): HavenSpaceEntry | null;
export declare function sortHavenReferences(entries: HavenReferenceEntry[]): HavenReferenceEntry[];
export declare function sortHavenSpaces(entries: HavenSpaceEntry[]): HavenSpaceEntry[];
export declare function createHavenReferenceEntry(input: {
    type: HavenReferenceType;
    title: string;
    targetType: HavenReferenceTargetType;
    targetId?: string | null;
    url?: string | null;
    relatedSpaceId?: string | null;
    sortOrder?: number;
}): HavenReferenceEntry;
export declare function createHavenSpaceEntry(input: {
    label: string;
    description?: string | null;
    sortOrder?: number;
}): HavenSpaceEntry;
export declare function createHavenBenefitEntry(input: {
    label: string;
    description?: string | null;
}): HavenBenefitEntry;
export declare function emptyDowntimeHavenFields(): DowntimeHavenFields;
export declare function parseDowntimeHavenFields(raw: unknown): DowntimeHavenFields;
export declare function formatHavenTypeLabel(type: HavenType | null | undefined): string;
export declare function formatHavenStatusLabel(status: HavenStatus | null | undefined): string;
export declare function formatHavenScaleLabel(scale: HavenScale | null | undefined): string | null;
export declare function formatHavenOwnershipLabel(ownership: HavenOwnershipType | null | undefined): string | null;
export declare function formatHavenThemeLabel(theme: HavenPrimaryTheme | null | undefined): string | null;
export declare function formatHavenDiscoveryLabel(state: HavenDiscoveryState | null | undefined): string | null;
export declare function isEscalatingThreat(threat: HavenThreatEntry): boolean;
export declare function sortThreatsBySeverity(threats: HavenThreatEntry[]): HavenThreatEntry[];
export declare function sortActivityLogNewestFirst(entries: HavenActivityEntry[]): HavenActivityEntry[];
export declare function createHavenCrewEntry(input: {
    label: string;
    role?: string | null;
    pageId?: string | null;
}): HavenCrewEntry;
export declare function createHavenActivityEntry(input: {
    summary: string;
    origin: HavenActivityOrigin;
    atEpochMinute?: string | null;
    tone?: HavenActivityTone | null;
    sourceProjectId?: string | null;
}): HavenActivityEntry;
export declare function createHavenUpgradeEntry(input: {
    label: string;
    description?: string | null;
    establishedAtEpochMinute?: string | null;
    establishedByProjectId?: string | null;
    establishedByProjectTitle?: string | null;
}): HavenUpgradeEntry;
export declare function createHavenThreatEntry(input: {
    label: string;
    severity?: HavenThreatSeverity | null;
    description?: string | null;
    sinceEpochMinute?: string | null;
}): HavenThreatEntry;
export declare function parseProjectHavenEffectPayload(raw: unknown): ProjectHavenEffectPayload | null;
export declare function activityToneToFeedTone(tone: HavenActivityTone | null | undefined): 'neutral' | 'warning' | 'escalation';
export declare function threatSeverityToFeedTone(severity: HavenThreatSeverity | null | undefined): 'neutral' | 'warning' | 'escalation';
//# sourceMappingURL=havenMetadata.d.ts.map