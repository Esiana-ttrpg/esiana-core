/**
 * Layer 1 — temporal snapshot primitives (region capture + diff).
 * @see docs/architecture-internal/temporal-snapshots.md
 */
import { buildProjectionContextHash } from './chronologyConvergence.js';
import type { NarrativeViewerContext } from './narrativeProjection.js';

export const SNAPSHOT_PAYLOAD_VERSION = 'region-v1';
export const PROJECTION_SEMANTICS_VERSION = 'narrative-projection-v1';

export const SnapshotPayloadTier = {
  HOT: 'hot',
  COLD: 'cold',
  COMPRESSING: 'compressing',
} as const;

export const SnapshotKind = {
  PARTY_VISIT: 'party_visit',
  MILESTONE: 'milestone',
  MANUAL: 'manual',
} as const;

export const SnapshotFacetKey = {
  NPC_PRESENCE: 'npcPresence',
  ORG_STANCE: 'orgStance',
  MAP_PRESENCE: 'mapPresence',
  PARTY_KNOWLEDGE: 'partyKnowledge',
  DANGER: 'danger',
} as const;

export type SnapshotFacetKeyValue =
  (typeof SnapshotFacetKey)[keyof typeof SnapshotFacetKey];

export const SNAPSHOT_COLLECTOR_VERSIONS: Record<SnapshotFacetKeyValue, string> = {
  [SnapshotFacetKey.NPC_PRESENCE]: '1',
  [SnapshotFacetKey.ORG_STANCE]: '1',
  [SnapshotFacetKey.MAP_PRESENCE]: '1',
  [SnapshotFacetKey.PARTY_KNOWLEDGE]: '2',
  [SnapshotFacetKey.DANGER]: '1',
};

export const SNAPSHOT_SCOPE_CAPS = {
  maxLocationPages: 50,
  maxNpcs: 100,
  maxOrgStances: 80,
  maxMapObjects: 200,
  maxKnowledgeClaims: 40,
} as const;

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

export const SUMMARY_TEMPLATES: Record<string, (p: Record<string, string | number>) => string> = {
  npc_move: (p) => `${p.title} is now at ${p.locationLabel}.`,
  npc_departed: (p) => `${p.title} is no longer present.`,
  org_stance: (p) =>
    `${p.orgTitle} is now ${p.stance} toward ${p.targetTitle}.`,
  rumor_one: () => '1 new rumor(s) circulating.',
  rumor_many: (p) => `${p.count} new rumor(s) circulating.`,
  danger_change: (p) => `Danger level is now ${p.level}.`,
};

export function renderSummaryLine(candidate: SummaryLineCandidate): string | null {
  const fn = SUMMARY_TEMPLATES[candidate.templateId];
  if (!fn) return null;
  return fn(candidate.params);
}

export function stableJsonHash(value: unknown): string {
  const str = JSON.stringify(value, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v,
  );
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function hashNpcPresence(facet: NpcPresenceRow[]): string {
  const sorted = [...facet].sort((a, b) => a.pageId.localeCompare(b.pageId));
  return stableJsonHash(sorted);
}

export function hashOrgStance(facet: OrgStanceRow[]): string {
  const sorted = [...facet].sort((a, b) =>
    `${a.orgPageId}:${a.targetOrgPageId}`.localeCompare(
      `${b.orgPageId}:${b.targetOrgPageId}`,
    ),
  );
  return stableJsonHash(sorted);
}

export function hashMapPresence(facet: MapPresenceFacet): string {
  return stableJsonHash({
    ids: [...facet.visibleObjectIds].sort(),
    rev: facet.revelationByObjectId,
  });
}

export function hashPartyKnowledge(facet: PartyKnowledgeRow[]): string {
  const sorted = [...facet].sort((a, b) => a.claimId.localeCompare(b.claimId));
  return stableJsonHash(sorted);
}

export function hashDanger(facet: DangerRow[]): string {
  const sorted = [...facet].sort((a, b) =>
    a.locationPageId.localeCompare(b.locationPageId),
  );
  return stableJsonHash(sorted);
}

export function buildFacetHashes(facets: RegionSnapshotFacets): RegionSnapshotFacetHashes {
  return {
    entityPresenceHash: hashNpcPresence(facets.npcPresence),
    orgRelationHash: hashOrgStance(facets.orgStance),
    mapPresenceHash: hashMapPresence(facets.mapPresence),
    knowledgeHash: hashPartyKnowledge(facets.partyKnowledge),
    dangerHash: hashDanger(facets.danger),
  };
}

export function buildRegionSnapshotMeta(
  ctx: NarrativeViewerContext,
  anchorLocationPageId: string,
  regionKey: string | null,
  capturedAtEpochMinute: bigint,
): RegionSnapshotPayloadMeta {
  return {
    snapshotVersion: SNAPSHOT_PAYLOAD_VERSION,
    projectionSemanticsVersion: PROJECTION_SEMANTICS_VERSION,
    projectionContextHash: buildProjectionContextHash(ctx),
    collectorVersions: { ...SNAPSHOT_COLLECTOR_VERSIONS },
    regionKey,
    anchorLocationPageId,
    capturedAtEpochMinute: capturedAtEpochMinute.toString(),
  };
}

export function compressPayloadToCold(
  payload: RegionSnapshotPayloadV1,
): RegionSnapshotPayloadV1 {
  return {
    meta: payload.meta,
    facetHashes: payload.facetHashes,
    facets: {
      npcPresence: [],
      orgStance: [],
      mapPresence: { visibleObjectIds: [], revelationByObjectId: {} },
      partyKnowledge: [],
      danger: [],
    },
    summaryLinesAtCapture: payload.summaryLinesAtCapture ?? [],
  };
}

export type FacetCompatibility = 'ok' | 'stale_collector' | 'stale_semantics';

export type VersionWarning = {
  code: string;
  message: string;
  facet?: SnapshotFacetKeyValue;
};

export type NpcPresenceDiff = {
  added: NpcPresenceRow[];
  removed: NpcPresenceRow[];
  moved: Array<{ pageId: string; title: string | null; from: string | null; to: string | null }>;
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
  changed: Array<{ locationPageId: string; from: number | null; to: number }>;
};

export type FacetDiffMap = {
  npcPresence?: NpcPresenceDiff & { confidence?: string };
  orgStance?: OrgStanceDiff & { confidence?: string };
  mapPresence?: MapPresenceDiff & { confidence?: string };
  partyKnowledge?: PartyKnowledgeDiff & { confidence?: string };
  danger?: DangerDiff & { confidence?: string };
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

export function resolveFacetCompatibility(
  baselineMeta: RegionSnapshotPayloadMeta,
  facet: SnapshotFacetKeyValue,
): FacetCompatibility {
  if (baselineMeta.projectionSemanticsVersion !== PROJECTION_SEMANTICS_VERSION) {
    return 'stale_semantics';
  }
  const baseVer = baselineMeta.collectorVersions[facet];
  const currentVer = SNAPSHOT_COLLECTOR_VERSIONS[facet];
  if (baseVer !== currentVer) return 'stale_collector';
  return 'ok';
}

export function diffNpcPresence(
  baseline: NpcPresenceRow[],
  live: NpcPresenceRow[],
  titleById: Map<string, string>,
  locationLabelById: Map<string, string>,
): { diff: NpcPresenceDiff; lines: SummaryLineCandidate[] } {
  const baseMap = new Map(baseline.map((r) => [r.pageId, r]));
  const liveMap = new Map(live.map((r) => [r.pageId, r]));
  const added: NpcPresenceRow[] = [];
  const removed: NpcPresenceRow[] = [];
  const moved: NpcPresenceDiff['moved'] = [];
  const lines: SummaryLineCandidate[] = [];

  for (const row of live) {
    const prev = baseMap.get(row.pageId);
    if (!prev) {
      if (row.locationPageId) {
        lines.push({
          templateId: 'npc_move',
          params: {
            title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
            locationLabel:
              locationLabelById.get(row.locationPageId) ?? 'another place',
          },
        });
      }
      continue;
    }
    if (prev.locationPageId !== row.locationPageId) {
      if (row.locationPageId) {
        moved.push({
          pageId: row.pageId,
          title: row.title ?? titleById.get(row.pageId) ?? null,
          from: prev.locationPageId,
          to: row.locationPageId,
        });
        lines.push({
          templateId: 'npc_move',
          params: {
            title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
            locationLabel:
              locationLabelById.get(row.locationPageId) ?? 'another place',
          },
        });
      } else {
        lines.push({
          templateId: 'npc_departed',
          params: {
            title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
          },
        });
      }
    }
  }

  for (const row of baseline) {
    if (!liveMap.has(row.pageId)) {
      removed.push(row);
      lines.push({
        templateId: 'npc_departed',
        params: {
          title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
        },
      });
    }
  }

  return { diff: { added, removed, moved }, lines };
}

export function diffOrgStance(
  baseline: OrgStanceRow[],
  live: OrgStanceRow[],
  titleById: Map<string, string>,
): { diff: OrgStanceDiff; lines: SummaryLineCandidate[] } {
  const key = (r: OrgStanceRow) => `${r.orgPageId}:${r.targetOrgPageId}:${r.relationType}`;
  const baseMap = new Map(baseline.map((r) => [key(r), r]));
  const changed: OrgStanceDiff['changed'] = [];
  const lines: SummaryLineCandidate[] = [];

  for (const row of live) {
    const prev = baseMap.get(key(row));
    if (prev && prev.stance === row.stance) continue;
    changed.push({
      orgPageId: row.orgPageId,
      targetOrgPageId: row.targetOrgPageId,
      fromStance: prev?.stance ?? null,
      toStance: row.stance,
      orgTitle: titleById.get(row.orgPageId),
      targetTitle: titleById.get(row.targetOrgPageId),
    });
    lines.push({
      templateId: 'org_stance',
      params: {
        orgTitle: titleById.get(row.orgPageId) ?? 'A faction',
        targetTitle: titleById.get(row.targetOrgPageId) ?? 'another faction',
        stance: row.stance,
      },
    });
  }

  return { diff: { changed }, lines };
}

export function diffMapPresence(
  baseline: MapPresenceFacet,
  live: MapPresenceFacet,
): { diff: MapPresenceDiff; lines: SummaryLineCandidate[] } {
  const baseSet = new Set(baseline.visibleObjectIds);
  const liveSet = new Set(live.visibleObjectIds);
  const revealedIds = live.visibleObjectIds.filter((id) => !baseSet.has(id));
  const hiddenIds = baseline.visibleObjectIds.filter((id) => !liveSet.has(id));
  return { diff: { revealedIds, hiddenIds }, lines: [] };
}

export function diffPartyKnowledge(
  baseline: PartyKnowledgeRow[],
  live: PartyKnowledgeRow[],
): { diff: PartyKnowledgeDiff; lines: SummaryLineCandidate[] } {
  const baseIds = new Set(baseline.map((r) => r.claimId));
  const liveIds = new Set(live.map((r) => r.claimId));
  const addedClaimIds = live.filter((r) => !baseIds.has(r.claimId)).map((r) => r.claimId);
  const removedClaimIds = baseline
    .filter((r) => !liveIds.has(r.claimId))
    .map((r) => r.claimId);
  const lines: SummaryLineCandidate[] = [];
  if (addedClaimIds.length === 1) {
    lines.push({ templateId: 'rumor_one', params: {} });
  } else if (addedClaimIds.length > 1) {
    lines.push({ templateId: 'rumor_many', params: { count: addedClaimIds.length } });
  }
  return {
    diff: {
      addedClaimIds,
      removedClaimIds,
      addedCount: addedClaimIds.length,
    },
    lines,
  };
}

export function diffDanger(
  baseline: DangerRow[],
  live: DangerRow[],
): { diff: DangerDiff; lines: SummaryLineCandidate[] } {
  const baseMap = new Map(baseline.map((r) => [r.locationPageId, r.level]));
  const changed: DangerDiff['changed'] = [];
  const lines: SummaryLineCandidate[] = [];
  for (const row of live) {
    const prev = baseMap.get(row.locationPageId);
    if (prev === row.level) continue;
    changed.push({
      locationPageId: row.locationPageId,
      from: prev ?? null,
      to: row.level,
    });
    lines.push({ templateId: 'danger_change', params: { level: row.level } });
  }
  return { diff: { changed }, lines };
}

export function buildRegionDiff(input: {
  audience: 'party' | 'dm';
  baseline: RegionSnapshotPayloadV1;
  live: RegionSnapshotPayloadV1;
  titleById: Map<string, string>;
  locationLabelById: Map<string, string>;
}): RegionDiffV1 {
  const { audience, baseline, live, titleById, locationLabelById } = input;
  const facetCompatibility: Partial<Record<SnapshotFacetKeyValue, FacetCompatibility>> = {};
  const versionWarnings: VersionWarning[] = [];
  const structuredDiff: FacetDiffMap = {};
  const lineCandidates: SummaryLineCandidate[] = [];

  let semanticsStale = false;
  if (baseline.meta.projectionSemanticsVersion !== PROJECTION_SEMANTICS_VERSION) {
    semanticsStale = true;
    if (audience === 'dm') {
      versionWarnings.push({
        code: 'stale_semantics',
        message:
          'Visit snapshot outdated—projection rules changed. Re-mark party visited to refresh.',
      });
    }
  }

  const facets: SnapshotFacetKeyValue[] = [
    SnapshotFacetKey.NPC_PRESENCE,
    SnapshotFacetKey.ORG_STANCE,
    SnapshotFacetKey.MAP_PRESENCE,
    SnapshotFacetKey.PARTY_KNOWLEDGE,
    SnapshotFacetKey.DANGER,
  ];

  const hashMatch = (key: keyof RegionSnapshotFacetHashes): boolean =>
    baseline.facetHashes[key] === live.facetHashes[key];

  for (const facetKey of facets) {
    const compat = resolveFacetCompatibility(baseline.meta, facetKey);
    facetCompatibility[facetKey] = compat;
    if (compat === 'stale_semantics' && semanticsStale) continue;
    if (compat === 'stale_collector') {
      if (audience === 'dm') {
        versionWarnings.push({
          code: 'stale_collector',
          message: `${facetKey} diff uses collector v${SNAPSHOT_COLLECTOR_VERSIONS[facetKey]}; snapshot was v${baseline.meta.collectorVersions[facetKey]}—re-mark visit for full accuracy.`,
          facet: facetKey,
        });
      }
      continue;
    }

    if (facetKey === SnapshotFacetKey.NPC_PRESENCE) {
      if (!hashMatch('entityPresenceHash')) {
        const r = diffNpcPresence(
          baseline.facets.npcPresence,
          live.facets.npcPresence,
          titleById,
          locationLabelById,
        );
        structuredDiff.npcPresence = r.diff;
        lineCandidates.push(...r.lines);
      }
    } else if (facetKey === SnapshotFacetKey.ORG_STANCE) {
      if (!hashMatch('orgRelationHash')) {
        const r = diffOrgStance(
          baseline.facets.orgStance,
          live.facets.orgStance,
          titleById,
        );
        structuredDiff.orgStance = r.diff;
        lineCandidates.push(...r.lines);
      }
    } else if (facetKey === SnapshotFacetKey.MAP_PRESENCE) {
      if (!hashMatch('mapPresenceHash')) {
        const r = diffMapPresence(
          baseline.facets.mapPresence,
          live.facets.mapPresence,
        );
        structuredDiff.mapPresence = r.diff;
        lineCandidates.push(...r.lines);
      }
    } else if (facetKey === SnapshotFacetKey.PARTY_KNOWLEDGE) {
      if (!hashMatch('knowledgeHash')) {
        const r = diffPartyKnowledge(
          baseline.facets.partyKnowledge,
          live.facets.partyKnowledge,
        );
        structuredDiff.partyKnowledge = r.diff;
        lineCandidates.push(...r.lines);
      }
    } else if (facetKey === SnapshotFacetKey.DANGER) {
      if (!hashMatch('dangerHash')) {
        const r = diffDanger(baseline.facets.danger, live.facets.danger);
        structuredDiff.danger = r.diff;
        lineCandidates.push(...r.lines);
      }
    }
  }

  let summaryLines = lineCandidates
    .map(renderSummaryLine)
    .filter((s): s is string => Boolean(s));

  let diegeticFallback = false;
  if (
    semanticsStale &&
    audience === 'party' &&
    summaryLines.length === 0
  ) {
    summaryLines = ['Things feel different since you were last here.'];
    diegeticFallback = true;
  }

  const result: RegionDiffV1 = {
    audience,
    summaryLines,
    structuredDiff,
    truncation: baseline.meta.truncation,
  };

  if (diegeticFallback) result.diegeticFallback = true;

  if (audience === 'dm') {
    if (versionWarnings.length > 0) result.versionWarnings = versionWarnings;
    result.facetCompatibility = facetCompatibility;
  }

  return result;
}

export { buildProjectionContextHash };
