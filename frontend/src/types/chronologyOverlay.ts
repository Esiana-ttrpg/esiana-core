/**
 * Wire types for GET /chronology/overlay (frontend-only; avoids bundling shared convergence stack).
 */
export type ConvergenceTimelineLink = {
  hrefKind: string;
  path: string;
};

export type ConvergenceTimelineEntry = {
  entryId: string;
  sortOrdinal: string;
  instant: {
    epochMinute: string | null;
    dateParts: { year: number | null; month: number | null; day: number | null } | null;
  };
  display: {
    title: string;
    summary: string | null;
    dateLabel: string | null;
  };
  source: {
    domain: string;
    entityType: string;
    entityId: string;
    subEntityId: string | null;
    collectorVersion: string;
    collectedFrom: string;
  };
  domain: string;
  domainPayload: unknown;
  projection: {
    visible: boolean;
    visibilityTier: string;
    revelationState: string | null;
    temporalMode: string;
    suppressReason: string | null;
  };
  links: ConvergenceTimelineLink[];
  sessionLink: { timelinePointId: string; sequenceOrder: number } | null;
};

export type ConvergenceOverlayBundle = {
  bundleVersion: string;
  evaluatedAt: string;
  projectionContextHash: string;
  campaignNowEpochMinute: string;
  viewerRole: string | null;
  window: { mode: string; from: string; to: string };
  domains: string[];
  sourcesIncluded: string[];
  entries: ConvergenceTimelineEntry[];
  truncation: {
    capped: boolean;
    maxEntries: number;
    totalCollected: number;
  };
};
