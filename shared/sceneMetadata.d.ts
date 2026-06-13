/**
 * Layer 5 — narrative scene metadata (wiki-canonical).
 * @see docs/architecture-internal/narrative-scenes.md
 */
import type { BranchCondition } from './narrativeBranch.js';
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
export declare const SCENE_METADATA_VERSION = "scene-metadata-v1";
export declare const SCENE_STATUSES: readonly ["PLANNED", "READY", "PLAYED", "SKIPPED"];
export type SceneStatus = (typeof SCENE_STATUSES)[number];
export declare const DEFAULT_SCENE_STATUS: SceneStatus;
export declare const SCENE_NARRATIVE_WEIGHTS: readonly ["minor", "major", "critical"];
export type SceneNarrativeWeight = (typeof SCENE_NARRATIVE_WEIGHTS)[number];
export declare const DEFAULT_SCENE_NARRATIVE_WEIGHT: SceneNarrativeWeight;
export declare const SCENE_BEAT_TYPES: readonly ["reveal", "complication", "choice", "escalation", "twist", "reversal", "resolution", "fallout", "setup", "loss"];
export type SceneBeatType = (typeof SCENE_BEAT_TYPES)[number];
export declare const SCENE_KINDS: readonly ["investigation", "faction", "environmental", "downtime", "flashback", "travel", "ambient", "combat", "social", "other"];
export type SceneKind = (typeof SCENE_KINDS)[number];
export declare const SCENE_OUTCOMES: readonly ["information_revealed", "relationship_shift", "faction_escalation", "world_state_change", "location_unlock", "quest_unlock", "threat_progression", "resource_loss"];
export type SceneOutcome = (typeof SCENE_OUTCOMES)[number];
export interface SceneOutcomeEntry {
    outcomeType: SceneOutcome;
    description?: string | null;
    linkedPageIds?: string[];
}
export interface SceneMetadataFields {
    sceneMetadataVersion: string;
    sceneStatus: SceneStatus;
    narrativeWeight: SceneNarrativeWeight;
    beatType: SceneBeatType | null;
    tone: string | null;
    pacingTags: string[];
    sceneKind: SceneKind | null;
    summary: string | null;
    entryConditions: BranchCondition[];
    exitConditions: BranchCondition[];
    outcomes: SceneOutcomeEntry[];
    participantPageIds: string[];
    locationPageId: string | null;
    linkedQuestPageIds: string[];
    linkedObjectivePageIds: string[];
    linkedCluePageIds: string[];
    linkedThreadPageIds: string[];
    consequencePageIds: string[];
    followsScenePageIds: string[];
    plannedSessionId: string | null;
    playedSessionId: string | null;
    gmNotes: string | null;
    sortOrder: number | null;
}
export declare function normalizeSceneStatus(raw: unknown): SceneStatus;
export declare function normalizeSceneNarrativeWeight(raw: unknown): SceneNarrativeWeight;
export declare function parseSceneNarrativeWeightStrict(raw: unknown): SceneNarrativeWeight | null;
export declare function normalizeSceneBeatType(raw: unknown): SceneBeatType | null;
export declare function normalizeSceneKind(raw: unknown): SceneKind | null;
export declare function normalizeSceneOutcome(raw: unknown): SceneOutcome | null;
export declare function normalizeStringArray(raw: unknown): string[];
export declare function normalizeNullableId(raw: unknown): string | null;
export declare function normalizeNullableString(raw: unknown): string | null;
export declare function normalizeSortOrder(raw: unknown): number | null;
export declare function normalizeBranchConditions(raw: unknown): BranchCondition[];
/** @deprecated Use normalizeBranchConditions */
export declare function normalizeEntryConditions(raw: unknown): BranchCondition[];
export declare function normalizeSceneOutcomes(raw: unknown): SceneOutcomeEntry[];
export declare function parseSceneMetadata(metadata: unknown): SceneMetadataFields;
export interface ParseSceneMetadataResult {
    fields: SceneMetadataFields;
    warnings: string[];
}
export declare function parseSceneMetadataWithWarnings(metadata: unknown): ParseSceneMetadataResult;
export declare function emptySceneMetadata(): SceneMetadataFields;
export declare function isSceneMetadataPresent(metadata: unknown): boolean;
export declare function publishedSceneStatusToLifecycleHint(status: unknown): NarrativeLifecycleState;
export declare function lifecycleToSceneStatus(state: NarrativeLifecycleState, existingStatus?: SceneStatus): SceneStatus;
export { lifecycleTargetForSceneStatusPatch } from './sceneLifecycleMatrix.js';
//# sourceMappingURL=sceneMetadata.d.ts.map