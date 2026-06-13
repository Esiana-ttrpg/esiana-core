/**
 * Layer 3 — rumor engine ontology (claim vs circulation vs spread).
 */
import type { LoreClaimRecord, LoreInterpretationAccountRecord } from './loreKnowledge.js';

export const RUMOR_ENGINE_VERSION = 'rumor-engine-v1';

export type EpochMinuteString = string;

export const RumorStances = {
  ASSERTS: 'asserts',
  DENIES: 'denies',
  DISTORTS: 'distorts',
  MYTHOLOGIZES: 'mythologizes',
  SATIRIZES: 'satirizes',
} as const;

export type RumorStance = (typeof RumorStances)[keyof typeof RumorStances];

export const AwarenessScopes = {
  LOCAL: 'local',
  REGIONAL: 'regional',
  FACTIONAL: 'factional',
  GLOBAL: 'global',
} as const;

export type AwarenessScope = (typeof AwarenessScopes)[keyof typeof AwarenessScopes];

export const CirculationEdgeKinds = {
  CIRCULATION: 'circulation',
  RETRACTION: 'retraction',
} as const;

export type CirculationEdgeKind =
  (typeof CirculationEdgeKinds)[keyof typeof CirculationEdgeKinds];

export const CirculationTargetKinds = {
  REGION: 'region',
  FACTION: 'faction',
} as const;

export type CirculationTargetKind =
  (typeof CirculationTargetKinds)[keyof typeof CirculationTargetKinds];

export const CirculationVisibilities = {
  PARTY: 'PARTY',
  GM_ONLY: 'GM_ONLY',
} as const;

export type CirculationVisibility =
  (typeof CirculationVisibilities)[keyof typeof CirculationVisibilities];

/** Append-only propagation edge (API / projection shape). */
export type RumorCirculationRecord = {
  id: string;
  stableKey: string;
  campaignId: string;
  claimId: string;
  edgeKind: CirculationEdgeKind;
  targetKind: CirculationTargetKind;
  targetRef: string;
  stance: RumorStance;
  awarenessScope: AwarenessScope;
  visibility: CirculationVisibility;
  spreadEventId: string;
  circulatedAtEpochMinute: EpochMinuteString;
  supersedesCirculationId?: string | null;
};

export const InclusionReasonRanks = {
  SUBJECT_LOCALITY: 1,
  SOURCE_LOCALITY: 2,
  EXPLICIT_SPREAD: 3,
  INTERPRETATION_REGION: 4,
  ORG_GRAPH: 5,
} as const;

export type InclusionReasonRank =
  (typeof InclusionReasonRanks)[keyof typeof InclusionReasonRanks];

export type InclusionReasonCode =
  | 'subject_locality'
  | 'source_locality'
  | 'explicit_spread'
  | 'interpretation_region'
  | 'org_graph';

export type InclusionReason = {
  rank: InclusionReasonRank;
  code: InclusionReasonCode;
};

export type RumorProjectionContext = {
  asOfEpochMinute: EpochMinuteString;
  isElevated: boolean;
};

export type RegionProjectionScope = {
  anchorLocationPageId: string;
  regionKey: string | null;
  locationPageIds: string[];
  regionLabels: string[];
  orgPageIdsInScope: string[];
};

export type FactionProjectionScope = {
  orgPageId: string;
  orgRegion: string | null;
  relatedOrgPageIds: string[];
};

export type ContradictionPerspective = {
  scopeKind: CirculationTargetKind;
  scopeRef: string;
  scopeLabel?: string | null;
  stance: RumorStance;
  circulationCount: number;
  latestCirculatedAt: EpochMinuteString;
  summary: string;
};

export type ContradictionBundle = {
  groupId: string | null;
  claims: LoreClaimRecord[];
  interpretations: LoreInterpretationAccountRecord[];
  isContested: boolean;
  contestReasons: string[];
  perspectives: ContradictionPerspective[];
};

export type RumorFeedItem = {
  claim: LoreClaimRecord;
  primaryCirculation: RumorCirculationRecord | null;
  activeCirculations: RumorCirculationRecord[];
  stance: RumorStance;
  awarenessScope: AwarenessScope;
  primaryInclusionReason: InclusionReason;
  inclusionReasons: InclusionReason[];
  firstCirculatedAt: EpochMinuteString | null;
  lastCirculatedAt: EpochMinuteString | null;
};

export type RumorFeedProjection = {
  version: typeof RUMOR_ENGINE_VERSION;
  asOfEpochMinute: EpochMinuteString;
  isElevated: boolean;
  items: RumorFeedItem[];
  contradictionBundles: ContradictionBundle[];
};

export function compareEpochMinutes(a: EpochMinuteString, b: EpochMinuteString): number {
  const ba = BigInt(a);
  const bb = BigInt(b);
  if (ba < bb) return -1;
  if (ba > bb) return 1;
  return 0;
}

export function isEpochAtOrBefore(
  epoch: EpochMinuteString,
  asOf: EpochMinuteString,
): boolean {
  return compareEpochMinutes(epoch, asOf) <= 0;
}

export function inferAwarenessScopeForTarget(
  targetKind: CirculationTargetKind,
  override?: AwarenessScope | null,
): AwarenessScope {
  if (override) return override;
  return targetKind === CirculationTargetKinds.FACTION
    ? AwarenessScopes.FACTIONAL
    : AwarenessScopes.REGIONAL;
}

export function normalizeRumorStance(raw: string | null | undefined): RumorStance {
  const v = raw?.trim().toLowerCase();
  const values = Object.values(RumorStances) as string[];
  if (v && values.includes(v)) return v as RumorStance;
  return RumorStances.ASSERTS;
}

export function normalizeAwarenessScope(
  raw: string | null | undefined,
): AwarenessScope {
  const v = raw?.trim().toLowerCase();
  const values = Object.values(AwarenessScopes) as string[];
  if (v && values.includes(v)) return v as AwarenessScope;
  return AwarenessScopes.REGIONAL;
}

export function normalizeCirculationVisibility(
  raw: string | null | undefined,
): CirculationVisibility {
  return raw?.trim().toUpperCase() === CirculationVisibilities.PARTY
    ? CirculationVisibilities.PARTY
    : CirculationVisibilities.GM_ONLY;
}
