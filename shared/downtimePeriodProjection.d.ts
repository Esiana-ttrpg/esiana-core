/**
 * Derived downtime period projection helpers (browser-safe).
 * @see docs/architecture-internal/downtime-timeline.md
 */
export type DowntimePeriodGapBounds = {
    gapId: string;
    startEpochMinute: string;
    endEpochMinute: string;
    isOpen: boolean;
    sessionBeforeId: string | null;
    sessionAfterId: string | null;
    sessionBeforeSequenceOrder: number | null;
};
export type DowntimePeriodEnrichmentCounts = {
    advanceRunCount: number;
    projectCompletions: number;
    projectFailures: number;
};
export declare function elapsedDaysBetweenEpochMinutes(startEpochMinute: string, endEpochMinute: string): bigint;
export declare function formatDowntimeElapsedLabel(days: bigint): string;
export declare function formatDowntimePeriodTitle(input: {
    isOpen: boolean;
    startEpochMinute: string;
    endEpochMinute: string;
    promotedLabel?: string | null;
}): string;
export declare function formatDowntimePeriodRollupHeadline(input: {
    isOpen: boolean;
    startEpochMinute: string;
    endEpochMinute: string;
    counts: DowntimePeriodEnrichmentCounts;
}): string;
export declare function deriveDowntimePeriodGapsFromSessionEpochs(input: {
    sessionEpochs: Array<{
        timelinePointId: string;
        sequenceOrder: number;
        epochMinute: string;
    }>;
    fallbackStartEpochMinute: string | null;
    currentEpochMinute: string;
}): DowntimePeriodGapBounds[];
//# sourceMappingURL=downtimePeriodProjection.d.ts.map