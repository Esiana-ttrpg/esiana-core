export type RegionDiffV1 = {
  audience: 'party' | 'GAMEMASTER';
  summaryLines: string[];
  structuredDiff: Record<string, unknown>;
  versionWarnings?: Array<{ code: string; message: string; facet?: string }>;
  facetCompatibility?: Record<string, string>;
  truncation?: Record<string, boolean>;
  diegeticFallback?: boolean;
};

/** Reserved for future compare-to-live; v1 requires two saved snapshots. */
export const LIVE_CURRENT_SNAPSHOT_ID = 'LIVE_CURRENT';

export type NarrativeSnapshotKind = 'party_visit' | 'milestone' | 'manual';

export type NarrativeSnapshotKindLabel = 'visit' | 'milestone' | 'manual';

export type NarrativeSnapshotListItem = {
  id: string;
  kind: NarrativeSnapshotKind;
  label: string | null;
  capturedAtEpochMinute: string;
  displayLabel: string;
  dateLabel: string;
  kindLabel: NarrativeSnapshotKindLabel;
  anchorLocationPageId: string | null;
  anchorLocationTitle: string | null;
  payloadTier: string;
  snapshotType: string;
  comparable: boolean;
  compareTargetKind: 'snapshot';
};

export type LatestVisitResponse = {
  visit: {
    id: string;
    locationPageId: string;
    snapshotId: string;
    visitedAtEpochMinute: string;
    snapshot: {
      id: string;
      payloadTier: string;
      capturedAtEpochMinute: string;
      projectionSemanticsVersion: string;
    };
  };
};

export type VisitSuggestion = {
  id: string;
  locationPageId: string;
  sessionTimelinePointId: string | null;
  sourceLabel: string | null;
  createdAt: string;
};
