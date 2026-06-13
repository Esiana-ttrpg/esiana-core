export type RumorFeedItem = {
  claim: {
    id: string;
    statement: string;
    pageId: string;
    knowledgeState?: string | null;
  };
  primaryCirculation: {
    id: string;
    stance: string;
    awarenessScope: string;
    circulatedAtEpochMinute: string;
    visibility: string;
  } | null;
  activeCirculations: Array<{
    id: string;
    stance: string;
    awarenessScope: string;
    circulatedAtEpochMinute: string;
    visibility: string;
    targetKind: string;
    targetRef: string;
  }>;
  stance: string;
  awarenessScope: string;
  primaryInclusionReason: { rank: number; code: string };
  inclusionReasons: Array<{ rank: number; code: string }>;
  firstCirculatedAt: string | null;
  lastCirculatedAt: string | null;
};

export type ContradictionPerspective = {
  scopeKind: string;
  scopeRef: string;
  scopeLabel?: string | null;
  stance: string;
  circulationCount: number;
  latestCirculatedAt: string;
  summary: string;
};

export type ContradictionBundle = {
  groupId: string | null;
  isContested: boolean;
  contestReasons: string[];
  perspectives: ContradictionPerspective[];
  claims: Array<{ id: string; statement: string }>;
};

export type RumorFeedProjection = {
  version: string;
  asOfEpochMinute: string;
  isElevated: boolean;
  items: RumorFeedItem[];
  contradictionBundles: ContradictionBundle[];
};

export type LocationRumorsResponse = {
  feed: RumorFeedProjection;
  scope: {
    anchorLocationPageId: string;
    regionKey: string | null;
    locationPageIds: string[];
  };
  circulations?: unknown[];
};

export type FactionGossipResponse = {
  feed: RumorFeedProjection;
  scope: {
    orgPageId: string;
    orgRegion: string | null;
  };
  circulations?: unknown[];
};

export type SpreadRumorTarget = {
  kind: 'region' | 'faction';
  locationPageId?: string;
  orgPageId?: string;
};

export type SpreadRumorBody = {
  sourceClaimId?: string;
  draft?: { statement: string; subjectPageId: string; stableKey?: string };
  targets: SpreadRumorTarget[];
  stance?: string;
  awarenessScope?: string;
  visibility?: 'PARTY' | 'GM_ONLY';
};

export type SpreadRumorResult = {
  spreadEventId: string;
  circulationIds: string[];
  claimId: string;
  circulatedAtEpochMinute: string;
};

export type RetractRumorResult = {
  spreadEventId: string;
  retractionCirculationId: string;
  circulatedAtEpochMinute: string;
};

export type {
  RumorCirculationRecord,
  CirculationEdgeKind,
  CirculationTargetKind,
  RumorStance,
  AwarenessScope,
  CirculationVisibility,
  EpochMinuteString,
} from '@shared/rumorEngine';

export type ClaimCirculationsResponse = {
  circulations: import('@shared/rumorEngine').RumorCirculationRecord[];
};
