/**
 * Layer 1 — temporal snapshot primitives (region capture + diff).
 * @see docs/architecture-internal/temporal-snapshots.md
 */
import { buildProjectionContextHash } from './chronologyConvergence.js';
import type { NarrativeViewerContext } from './narrativeProjection.js';
export declare const SNAPSHOT_PAYLOAD_VERSION = "region-v1";
export declare const PROJECTION_SEMANTICS_VERSION = "narrative-projection-v1";
export declare const SnapshotPayloadTier: {
    readonly HOT: "hot";
    readonly COLD: "cold";
    readonly COMPRESSING: "compressing";
};
export declare const SnapshotKind: {
    readonly PARTY_VISIT: "party_visit";
    readonly MILESTONE: "milestone";
    readonly MANUAL: "manual";
};
export declare const SnapshotFacetKey: {
    readonly NPC_PRESENCE: "npcPresence";
    readonly ORG_STANCE: "orgStance";
    readonly MAP_PRESENCE: "mapPresence";
    readonly PARTY_KNOWLEDGE: "partyKnowledge";
    readonly DANGER: "danger";
};
export type SnapshotFacetKeyValue = (typeof SnapshotFacetKey)[keyof typeof SnapshotFacetKey];
export declare const SNAPSHOT_COLLECTOR_VERSIONS: Record<SnapshotFacetKeyValue, string>;
export declare const SNAPSHOT_SCOPE_CAPS: {
    readonly maxLocationPages: 50;
    readonly maxNpcs: 100;
    readonly maxOrgStances: 80;
    readonly maxMapObjects: 200;
    readonly maxKnowledgeClaims: 40;
};
export type NpcPresenceRow = {
    pageId: string;
    locationPageId: string | null;
    title: string | null;
};
export type OrgStanceRow = {
    orgPageId: string;
    targetOrgPageId: string;
    stance: string;
    relationType: string;
};
export type MapPresenceFacet = {
    visibleObjectIds: string[];
    revelationByObjectId: Record<string, string>;
};
export type PartyKnowledgeRow = {
    claimId: string;
    subjectPageId: string | null;
    label: string | null;
};
export type DangerRow = {
    locationPageId: string;
    level: number;
};
export type RegionSnapshotFacets = {
    npcPresence: NpcPresenceRow[];
    orgStance: OrgStanceRow[];
    mapPresence: MapPresenceFacet;
    partyKnowledge: PartyKnowledgeRow[];
    danger: DangerRow[];
};
export type RegionSnapshotFacetHashes = {
    entityPresenceHash: string;
    orgRelationHash: string;
    mapPresenceHash: string;
    knowledgeHash: string;
    dangerHash: string;
};
export type SnapshotTruncationMeta = {
    npcPresence?: boolean;
    orgStance?: boolean;
    mapPresence?: boolean;
    partyKnowledge?: boolean;
};
export type RegionSnapshotPayloadMeta = {
    snapshotVersion: typeof SNAPSHOT_PAYLOAD_VERSION;
    projectionSemanticsVersion: string;
    projectionContextHash: string;
    collectorVersions: Record<SnapshotFacetKeyValue, string>;
    regionKey: string | null;
    anchorLocationPageId: string;
    capturedAtEpochMinute: string;
    truncation?: SnapshotTruncationMeta;
};
export type RegionSnapshotPayloadV1 = {
    meta: RegionSnapshotPayloadMeta;
    facets: RegionSnapshotFacets;
    facetHashes: RegionSnapshotFacetHashes;
    summaryLinesAtCapture?: string[];
};
export type SummaryLineCandidate = {
    templateId: string;
    params: Record<string, string | number>;
};
export declare const SUMMARY_TEMPLATES: Record<string, (p: Record<string, string | number>) => string>;
export declare function renderSummaryLine(candidate: SummaryLineCandidate): string | null;
export declare function stableJsonHash(value: unknown): string;
export declare function hashNpcPresence(facet: NpcPresenceRow[]): string;
export declare function hashOrgStance(facet: OrgStanceRow[]): string;
export declare function hashMapPresence(facet: MapPresenceFacet): string;
export declare function hashPartyKnowledge(facet: PartyKnowledgeRow[]): string;
export declare function hashDanger(facet: DangerRow[]): string;
export declare function buildFacetHashes(facets: RegionSnapshotFacets): RegionSnapshotFacetHashes;
export declare function buildRegionSnapshotMeta(ctx: NarrativeViewerContext, anchorLocationPageId: string, regionKey: string | null, capturedAtEpochMinute: bigint): RegionSnapshotPayloadMeta;
export declare function compressPayloadToCold(payload: RegionSnapshotPayloadV1): RegionSnapshotPayloadV1;
export type FacetCompatibility = 'ok' | 'stale_collector' | 'stale_semantics';
export type VersionWarning = {
    code: string;
    message: string;
    facet?: SnapshotFacetKeyValue;
};
export type NpcPresenceDiff = {
    added: NpcPresenceRow[];
    removed: NpcPresenceRow[];
    moved: Array<{
        pageId: string;
        title: string | null;
        from: string | null;
        to: string | null;
    }>;
};
export type OrgStanceDiff = {
    changed: Array<{
        orgPageId: string;
        targetOrgPageId: string;
        fromStance: string | null;
        toStance: string;
        orgTitle?: string;
        targetTitle?: string;
    }>;
};
export type MapPresenceDiff = {
    revealedIds: string[];
    hiddenIds: string[];
};
export type PartyKnowledgeDiff = {
    addedClaimIds: string[];
    removedClaimIds: string[];
    addedCount: number;
};
export type DangerDiff = {
    changed: Array<{
        locationPageId: string;
        from: number | null;
        to: number;
    }>;
};
export type FacetDiffMap = {
    npcPresence?: NpcPresenceDiff & {
        confidence?: string;
    };
    orgStance?: OrgStanceDiff & {
        confidence?: string;
    };
    mapPresence?: MapPresenceDiff & {
        confidence?: string;
    };
    partyKnowledge?: PartyKnowledgeDiff & {
        confidence?: string;
    };
    danger?: DangerDiff & {
        confidence?: string;
    };
};
export type RegionDiffV1 = {
    audience: 'party' | 'dm';
    summaryLines: string[];
    structuredDiff: FacetDiffMap;
    versionWarnings?: VersionWarning[];
    facetCompatibility?: Partial<Record<SnapshotFacetKeyValue, FacetCompatibility>>;
    truncation?: SnapshotTruncationMeta;
    diegeticFallback?: boolean;
};
export declare function resolveFacetCompatibility(baselineMeta: RegionSnapshotPayloadMeta, facet: SnapshotFacetKeyValue): FacetCompatibility;
export declare function diffNpcPresence(baseline: NpcPresenceRow[], live: NpcPresenceRow[], titleById: Map<string, string>, locationLabelById: Map<string, string>): {
    diff: NpcPresenceDiff;
    lines: SummaryLineCandidate[];
};
export declare function diffOrgStance(baseline: OrgStanceRow[], live: OrgStanceRow[], titleById: Map<string, string>): {
    diff: OrgStanceDiff;
    lines: SummaryLineCandidate[];
};
export declare function diffMapPresence(baseline: MapPresenceFacet, live: MapPresenceFacet): {
    diff: MapPresenceDiff;
    lines: SummaryLineCandidate[];
};
export declare function diffPartyKnowledge(baseline: PartyKnowledgeRow[], live: PartyKnowledgeRow[]): {
    diff: PartyKnowledgeDiff;
    lines: SummaryLineCandidate[];
};
export declare function diffDanger(baseline: DangerRow[], live: DangerRow[]): {
    diff: DangerDiff;
    lines: SummaryLineCandidate[];
};
export declare function buildRegionDiff(input: {
    audience: 'party' | 'dm';
    baseline: RegionSnapshotPayloadV1;
    live: RegionSnapshotPayloadV1;
    titleById: Map<string, string>;
    locationLabelById: Map<string, string>;
}): RegionDiffV1;
export { buildProjectionContextHash };
//# sourceMappingURL=narrativeSnapshots.d.ts.map