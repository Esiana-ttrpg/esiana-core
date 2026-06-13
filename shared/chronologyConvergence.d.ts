import type { ContentRevelationState } from './contentPresence.js';
import { type CanonicalChronologyAnchor, type ChronologyDomainKindValue, type ChronologyDomainPayload, type ChronologyInstant, type ChronologyWindowQuery } from './chronologyTypes.js';
import { type PublicPagePath } from './publicPagePath.js';
import { TemporalHistoricalMode, type NarrativeViewerContext, type NarrativeVisibilityTierValue } from './narrativeProjection.js';
export declare const CONVERGENCE_BUNDLE_VERSION = "convergence-v1";
export declare const CONVERGENCE_COLLECTOR_VERSION = "1";
export declare const CONVERGENCE_MAX_ENTRIES = 2000;
export type ConvergenceSourceRef = {
    domain: ChronologyDomainKindValue;
    entityType: string;
    entityId: string;
    subEntityId: string | null;
    collectorVersion: string;
    collectedFrom: string;
};
export type ConvergenceTimelineLink = {
    hrefKind: string;
    path: PublicPagePath;
};
export type ConvergenceEntryProjection = {
    visible: boolean;
    visibilityTier: NarrativeVisibilityTierValue;
    revelationState: ContentRevelationState | null;
    temporalMode: (typeof TemporalHistoricalMode)[keyof typeof TemporalHistoricalMode];
    suppressReason: string | null;
};
export type ConvergenceTimelineEntry = {
    entryId: string;
    sortOrdinal: string;
    instant: ChronologyInstant;
    display: {
        title: string;
        summary: string | null;
        dateLabel: string | null;
    };
    source: ConvergenceSourceRef;
    domain: ChronologyDomainKindValue;
    domainPayload: ChronologyDomainPayload;
    projection: ConvergenceEntryProjection;
    links: ConvergenceTimelineLink[];
    sessionLink: {
        timelinePointId: string;
        sequenceOrder: number;
    } | null;
};
export type ConvergenceOverlayBundle = {
    bundleVersion: string;
    evaluatedAt: string;
    projectionContextHash: string;
    campaignNowEpochMinute: string;
    viewerRole: string | null;
    window: ChronologyWindowQuery;
    domains: ChronologyDomainKindValue[];
    sourcesIncluded: ChronologyDomainKindValue[];
    entries: ConvergenceTimelineEntry[];
    truncation: {
        capped: boolean;
        maxEntries: number;
        totalCollected: number;
    };
};
export type CampaignLinkContext = {
    campaignHandle: string;
    /** Resolve workspace-first browser paths for wiki pages referenced by id only. */
    resolveWikiPagePath?: (pageId: string) => PublicPagePath | null;
};
export declare function buildProjectionContextHash(ctx: NarrativeViewerContext): string;
export declare function buildCampaignLinks(anchor: CanonicalChronologyAnchor, linkCtx: CampaignLinkContext): ConvergenceTimelineLink[];
export declare function buildConvergenceEntry(anchor: CanonicalChronologyAnchor, ctx: NarrativeViewerContext, linkCtx: CampaignLinkContext, presenceMap: Map<string, ContentRevelationState>, options?: {
    sessionTimelinePointIds?: Set<string>;
    sessionSequenceByPointId?: Map<string, number>;
}): ConvergenceTimelineEntry;
export declare function mergeAndSortEntries(entries: ConvergenceTimelineEntry[]): ConvergenceTimelineEntry[];
export declare function filterEntriesForViewer(entries: ConvergenceTimelineEntry[], includeSuppressed: boolean): ConvergenceTimelineEntry[];
export declare function filterEntriesByDomains(entries: ConvergenceTimelineEntry[], domains: ChronologyDomainKindValue[] | null): ConvergenceTimelineEntry[];
export declare function filterEntriesSessionLinkedOnly(entries: ConvergenceTimelineEntry[]): ConvergenceTimelineEntry[];
export declare function filterEntriesByWindow(entries: ConvergenceTimelineEntry[], window: ChronologyWindowQuery): ConvergenceTimelineEntry[];
export declare function capConvergenceEntries(entries: ConvergenceTimelineEntry[], max?: number): {
    entries: ConvergenceTimelineEntry[];
    totalCollected: number;
    capped: boolean;
};
export declare function parseDomainsQuery(raw: string | undefined): ChronologyDomainKindValue[] | null;
//# sourceMappingURL=chronologyConvergence.d.ts.map