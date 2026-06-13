/**
 * Layer 5 — quest-scoped objective metadata (wiki child of quest page).
 * Parent quest = wiki parentId only — never stored here.
 * @see docs/architecture-internal/narrative-objectives.md
 */
export declare const OBJECTIVE_METADATA_VERSION = "objective-metadata-v1";
export declare const OBJECTIVE_STATUSES: readonly ["PLANNED", "ACTIVE", "COMPLETED", "SKIPPED"];
export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];
export declare const DEFAULT_OBJECTIVE_STATUS: ObjectiveStatus;
export interface ObjectiveMetadataFields {
    objectiveMetadataVersion: string;
    objectiveStatus: ObjectiveStatus;
    sortOrder: number | null;
    summary: string | null;
}
export declare function normalizeObjectiveStatus(raw: unknown): ObjectiveStatus;
export declare function normalizeSortOrder(raw: unknown): number | null;
export declare function normalizeNullableString(raw: unknown): string | null;
export declare function parseObjectiveMetadata(metadata: unknown): ObjectiveMetadataFields;
export declare function emptyObjectiveMetadata(): ObjectiveMetadataFields;
export declare function isObjectiveMetadataPresent(metadata: unknown): boolean;
/** Strip legacy relational keys that must not be persisted on objectives. */
export declare function sanitizeObjectiveMetadataForStorage(metadata: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=objectiveMetadata.d.ts.map