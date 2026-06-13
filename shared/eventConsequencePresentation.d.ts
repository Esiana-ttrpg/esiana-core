import type { EventConsequence, EventConsequenceApplicationState, EventConsequenceApplyResult, EventConsequenceKind, EventConsequencePreviewRow, EventHavenThreatSeverity, RouteChangeReason, RouteChangeSeverity } from './eventConsequence.js';
export declare const EVENT_CONSEQUENCE_KIND_GM_LABELS: Record<EventConsequenceKind, string>;
export declare const EVENT_CONSEQUENCE_KIND_SENTENCE_LABELS: Record<EventConsequenceKind, string>;
export declare const EVENT_CONSEQUENCE_APPLICATION_GM_LABELS: Record<EventConsequenceApplicationState, string>;
export declare const ROUTE_CHANGE_SEVERITY_GM_LABELS: Record<RouteChangeSeverity, string>;
export declare const ROUTE_CHANGE_REASON_GM_LABELS: Record<RouteChangeReason, string>;
export declare const HAVEN_THREAT_SEVERITY_GM_LABELS: Record<EventHavenThreatSeverity, string>;
export type PageTitleLookup = Map<string, string> | Record<string, string>;
export type FormattedPreviewLine = {
    text: string;
    tone: 'default' | 'warning' | 'blocked';
};
export declare function collectConsequencePageIds(row: EventConsequence): string[];
export declare function collectApplyResultPageIds(consequences: EventConsequence[], previewRows?: EventConsequencePreviewRow[]): string[];
export declare function formatConsequenceCardTitle(row: EventConsequence): string;
export declare function formatConsequenceSentenceLabel(row: EventConsequence): string;
export declare function formatApplicationStateLabel(state: EventConsequenceApplicationState | undefined): string;
export declare function formatConsequenceDetailLine(row: EventConsequence, titles: PageTitleLookup, options?: {
    projectedState?: EventConsequencePreviewRow['projectedState'];
}): string;
export declare function formatConsequenceFeedSummary(row: EventConsequence, titles: PageTitleLookup): string;
export declare function shouldShowApplyCountHeadline(result: EventConsequenceApplyResult): boolean;
export declare function formatApplyResultHeadline(result: EventConsequenceApplyResult): string | null;
export declare function formatPreviewRows(result: EventConsequenceApplyResult, consequences: EventConsequence[], titles: PageTitleLookup): FormattedPreviewLine[];
export declare function formatPendingConfirmation(line: string, titles: PageTitleLookup): string;
export declare const WORLD_IMPACT_TEMPLATE_CARDS: Array<{
    kind: EventConsequenceKind;
    label: string;
    description: string;
}>;
//# sourceMappingURL=eventConsequencePresentation.d.ts.map