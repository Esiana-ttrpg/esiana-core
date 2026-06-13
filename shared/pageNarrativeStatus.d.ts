/**
 * Layer 1 — page narrative status (GM canon editorial state).
 * Values must stay in 1:1 sync with Prisma enum PageNarrativeStatusType.
 * @see docs/plans/canonical-page-editor.md
 */
import type { NarrativeViewerContext } from './narrativeProjection.js';
export declare const PAGE_NARRATIVE_STATUS_SEMANTICS_VERSION = "page-narrative-status-v1";
/** Must stay in 1:1 sync with Prisma enum PageNarrativeStatusType */
export declare const PageNarrativeStatuses: {
    readonly ACTIVE: "ACTIVE";
    readonly MISSING: "MISSING";
    readonly DEAD: "DEAD";
    readonly ARCHIVED: "ARCHIVED";
    readonly RUMORED: "RUMORED";
    readonly RETIRED: "RETIRED";
    readonly HISTORICAL: "HISTORICAL";
    readonly LEGENDARY: "LEGENDARY";
    readonly SECRET: "SECRET";
};
export type PageNarrativeStatusValue = (typeof PageNarrativeStatuses)[keyof typeof PageNarrativeStatuses];
export declare const ALL_PAGE_NARRATIVE_STATUSES: readonly PageNarrativeStatusValue[];
export type PageNarrativeStatusTone = 'neutral' | 'muted' | 'warning' | 'legend' | 'secret';
export type PageNarrativeStatusCssModifier = 'none' | 'muted' | 'strikethrough' | 'legend';
export interface PageNarrativeStatusRecord {
    wikiPageId: string;
    status: PageNarrativeStatusValue;
    reason?: string | null;
}
export interface PageNarrativeStatusProjection {
    status: PageNarrativeStatusValue;
    label: string;
    tone: PageNarrativeStatusTone;
    cssModifier: PageNarrativeStatusCssModifier;
    visibleToParty: boolean;
    reason?: string | null;
}
/** Legacy character identity status → page narrative status */
export type CharacterLifeStatusFallback = 'ALIVE' | 'DECEASED' | 'MISSING' | 'EXILED' | 'UNKNOWN';
export declare function normalizePageNarrativeStatus(raw: unknown): PageNarrativeStatusValue | null;
export declare function mapCharacterLifeStatusToNarrativeStatus(lifeStatus: CharacterLifeStatusFallback): PageNarrativeStatusValue | null;
export declare function resolvePageNarrativeStatus(input: {
    storedStatus?: PageNarrativeStatusValue | null;
    characterLifeStatus?: CharacterLifeStatusFallback | null;
}): PageNarrativeStatusValue;
export declare function formatPageNarrativeStatusLabel(status: PageNarrativeStatusValue): string;
export declare function pageNarrativeStatusTone(status: PageNarrativeStatusValue): PageNarrativeStatusTone;
export declare function pageNarrativeStatusCssModifier(status: PageNarrativeStatusValue): PageNarrativeStatusCssModifier;
export declare function shouldShowPageNarrativeStatusBadge(status: PageNarrativeStatusValue): boolean;
export declare function isPageNarrativeStatusVisibleToParty(status: PageNarrativeStatusValue, ctx: NarrativeViewerContext): boolean;
export declare function projectPageNarrativeStatus(status: PageNarrativeStatusValue, ctx: NarrativeViewerContext, reason?: string | null): PageNarrativeStatusProjection;
export declare function parseStatusSearchToken(query: string): PageNarrativeStatusValue | null;
export declare function stripStatusSearchToken(query: string): string;
//# sourceMappingURL=pageNarrativeStatus.d.ts.map