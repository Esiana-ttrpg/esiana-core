/**
 * Layer 2 — open narrative thread metadata (wiki-canonical).
 * @see docs/architecture-internal/narrative-threads.md
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
export declare const THREAD_METADATA_VERSION = "thread-metadata-v1";
export declare const THREAD_KINDS: readonly ["mystery", "promise", "foreshadowing", "clue", "theory"];
export type ThreadKind = (typeof THREAD_KINDS)[number];
export declare const THREAD_STATUSES: readonly ["OPEN", "DORMANT", "RESOLVED", "ABANDONED"];
export type ThreadStatus = (typeof THREAD_STATUSES)[number];
export declare const DEFAULT_THREAD_STATUS: ThreadStatus;
export declare const THREAD_NARRATIVE_WEIGHTS: readonly ["minor", "major", "critical"];
export type ThreadNarrativeWeight = (typeof THREAD_NARRATIVE_WEIGHTS)[number];
export declare const DEFAULT_THREAD_NARRATIVE_WEIGHT: ThreadNarrativeWeight;
export declare const EMOTIONAL_RESIDUE_KINDS: readonly ["grief", "revenge", "rivalry", "romance", "debt", "other"];
export type EmotionalResidueKind = (typeof EMOTIONAL_RESIDUE_KINDS)[number];
export interface ThreadMetadataFields {
    threadMetadataVersion: string;
    threadKind: ThreadKind;
    threadStatus: ThreadStatus;
    narrativeWeight: ThreadNarrativeWeight;
    relatedPageIds: string[];
    introducedSessionId: string | null;
    lastAdvancedSessionId: string | null;
    resolvedSessionId: string | null;
    payoffPageId: string | null;
    playerSubmitted: boolean;
    sortOrder: number | null;
    emotionalResidueKind: EmotionalResidueKind | null;
}
export declare function normalizeThreadKind(raw: unknown): ThreadKind;
export declare function normalizeThreadStatus(raw: unknown): ThreadStatus;
export declare function normalizeRelatedPageIds(raw: unknown): string[];
export declare function normalizeNullableId(raw: unknown): string | null;
export declare function normalizeSortOrder(raw: unknown): number | null;
export declare function normalizePlayerSubmitted(raw: unknown): boolean;
export declare function normalizeEmotionalResidueKind(raw: unknown): EmotionalResidueKind | null;
export declare function normalizeThreadNarrativeWeight(raw: unknown): ThreadNarrativeWeight;
/** Strict parse for create/PATCH — returns null when invalid. */
export declare function parseThreadNarrativeWeightStrict(raw: unknown): ThreadNarrativeWeight | null;
/** Strict kind for create — returns null when not one of THREAD_KINDS. */
export declare function parseThreadKindStrict(raw: unknown): ThreadKind | null;
export declare function parseThreadMetadata(metadata: unknown): ThreadMetadataFields;
export interface ParseThreadMetadataResult {
    fields: ThreadMetadataFields;
    warnings: string[];
}
export declare function parseThreadMetadataWithWarnings(metadata: unknown): ParseThreadMetadataResult;
export declare function emptyThreadMetadata(): ThreadMetadataFields;
export declare function isThreadMetadataPresent(metadata: unknown): boolean;
/** Backfill / hint mapping from published threadStatus. */
export declare function publishedThreadStatusToLifecycleHint(status: unknown): NarrativeLifecycleState;
export declare function lifecycleToThreadStatus(state: NarrativeLifecycleState, existingStatus?: ThreadStatus): ThreadStatus;
/** @deprecated Use lifecycleTargetForThreadStatusPatch from threadLifecycleMatrix */
export declare function publishedThreadStatusToLifecycleTarget(status: ThreadStatus, currentLifecycle: NarrativeLifecycleState): NarrativeLifecycleState | null;
export { lifecycleTargetForThreadStatusPatch } from './threadLifecycleMatrix.js';
//# sourceMappingURL=threadMetadata.d.ts.map