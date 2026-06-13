/**
 * Layer 1 — downtime project simulation contracts (wiki-linked).
 * WikiPage = narrative surface; DowntimeProject row = simulation state.
 * @see docs/architecture-internal/downtime-projects.md
 */
export declare const DOWNTIME_PROJECT_SEMANTICS_VERSION = "downtime-project-v1";
export declare const DOWNTIME_PROJECT_TEMPLATE_TYPE = "DOWNTIME_PROJECT";
export declare const PROJECT_TYPES: readonly ["construction", "research", "training", "operations", "recovery"];
export type ProjectType = (typeof PROJECT_TYPES)[number];
export declare const DEFAULT_PROJECT_TYPE: ProjectType;
export declare const PROJECT_STATUSES: readonly ["PLANNED", "ACTIVE", "PAUSED", "SUSPENDED", "COMPLETED", "FAILED", "ABANDONED"];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export declare const DEFAULT_PROJECT_STATUS: ProjectStatus;
export declare const TERMINAL_PROJECT_STATUSES: readonly ["COMPLETED", "FAILED", "ABANDONED"];
export type TerminalProjectStatus = (typeof TERMINAL_PROJECT_STATUSES)[number];
export declare const SIMULATION_PROJECT_STATUSES: readonly ["PLANNED", "ACTIVE", "PAUSED", "SUSPENDED"];
export type SimulationProjectStatus = (typeof SIMULATION_PROJECT_STATUSES)[number];
export declare const PROJECT_PRIORITIES: readonly ["low", "normal", "high", "critical"];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
export declare const DEFAULT_PROJECT_PRIORITY: ProjectPriority;
/** Narrative posture on wiki metadata — not simulation status. */
export declare const DOWNTIME_OPERATION_POSTURE_METADATA_KEY = "downtimeOperationPosture";
export declare const OPERATION_POSTURES: readonly ["quiet_effort", "public_campaign", "urgent_response", "secret_operation", "long_term_undertaking"];
export type OperationPosture = (typeof OPERATION_POSTURES)[number];
export declare function normalizeOperationPosture(raw: unknown): OperationPosture | null;
export declare function formatOperationPostureLabel(posture: OperationPosture | null | undefined): string | null;
export declare function parseOperationPostureFromWikiMetadata(metadata: unknown): OperationPosture | null;
export declare const PROJECT_RESOURCE_SOURCE_KINDS: readonly ["manual", "linked_page", "ledger", "future_hook"];
export type ProjectResourceSourceKind = (typeof PROJECT_RESOURCE_SOURCE_KINDS)[number];
export declare const DEFAULT_PROJECT_RESOURCE_SOURCE_KIND: ProjectResourceSourceKind;
export declare const PROJECT_OUTCOME_KINDS: readonly ["unlock_entity", "alter_location", "generate_event", "haven_effect", "reputation_effect", "future_hook", "treasury_effect"];
export type ProjectOutcomeKind = (typeof PROJECT_OUTCOME_KINDS)[number];
export declare const PROJECT_OUTCOME_STATUSES: readonly ["pending", "applied"];
export type ProjectOutcomeStatus = (typeof PROJECT_OUTCOME_STATUSES)[number];
export declare const PROJECT_OUTCOME_APPLICATION_SOURCES: readonly ["project_progression", "manual_patch", "replay"];
export type ProjectOutcomeApplicationSource = (typeof PROJECT_OUTCOME_APPLICATION_SOURCES)[number];
export declare const PROJECT_RISK_SEVERITIES: readonly ["low", "medium", "high"];
export type ProjectRiskSeverity = (typeof PROJECT_RISK_SEVERITIES)[number];
export interface ProjectResourceEntry {
    id: string;
    label: string;
    quantity: number | null;
    unit: string | null;
    satisfied: boolean;
    linkedPageId: string | null;
    sourceKind: ProjectResourceSourceKind;
    /** When sourceKind is ledger — optional treasury amount for suggestions. */
    ledgerAmount?: number | null;
    /** credit | debit when sourceKind is ledger. */
    ledgerImpactKind?: 'credit' | 'debit' | null;
}
export type ProjectTreasuryEffectPayload = {
    amount: number;
    kind: 'credit' | 'debit';
    category?: LedgerCategoryLike | null;
    title?: string | null;
};
type LedgerCategoryLike = 'upkeep' | 'project' | 'income' | 'reward' | 'trade' | 'donation' | 'debt' | 'other';
export interface ProjectBlockerEntry {
    id: string;
    label: string;
    description: string | null;
    resolved: boolean;
    linkedPageId: string | null;
}
export interface ProjectOutcomeEntry {
    id: string;
    outcomeKind: ProjectOutcomeKind;
    description: string | null;
    linkedPageIds: string[];
    status: ProjectOutcomeStatus;
    appliedAtEpochMinute?: string | null;
    applicationSource?: ProjectOutcomeApplicationSource | null;
    applicationRunId?: string | null;
    /** Structured payload for `haven_effect` outcomes. */
    havenEffect?: import('./havenMetadata.js').ProjectHavenEffectPayload | null;
    /** Structured payload for `treasury_effect` outcomes. */
    treasuryEffect?: ProjectTreasuryEffectPayload | null;
}
export interface ProjectRiskEntry {
    id: string;
    label: string;
    severity: ProjectRiskSeverity | null;
    description: string | null;
    linkedPageId: string | null;
}
export interface DowntimeProjectFields {
    semanticsVersion: string;
    projectType: ProjectType;
    status: ProjectStatus;
    priority: ProjectPriority | null;
    progressPercent: number;
    durationTotalMinutes: bigint;
    durationElapsedMinutes: bigint;
    stalledDurationMinutes: bigint;
    startedAtEpochMinute: bigint | null;
    completedAtEpochMinute: bigint | null;
    targetCompletionEpochMinute: bigint | null;
    ownerPageId: string | null;
    havenPageId: string | null;
    relatedPageIds: string[];
    resources: ProjectResourceEntry[];
    blockers: ProjectBlockerEntry[];
    outcomes: ProjectOutcomeEntry[];
    risks: ProjectRiskEntry[];
}
export type DowntimeProjectSummary = {
    id: string;
    wikiPageId: string;
    title: string;
    href: string;
    projectType: ProjectType;
    status: ProjectStatus;
    priority: ProjectPriority | null;
    progressPercent: number;
    durationTotalMinutes: string;
    durationElapsedMinutes: string;
    stalledDurationMinutes: string;
    startedAtEpochMinute: string | null;
    completedAtEpochMinute: string | null;
    ownerPageId: string | null;
    havenPageId: string | null;
    updatedAt: string;
};
export type DowntimeProjectDetail = DowntimeProjectSummary & {
    targetCompletionEpochMinute: string | null;
    relatedPageIds: string[];
    resources: ProjectResourceEntry[];
    blockers: ProjectBlockerEntry[];
    outcomes: ProjectOutcomeEntry[];
    risks: ProjectRiskEntry[];
    semanticsVersion: string;
    createdAt: string;
    /** Narrative posture from wiki metadata. */
    operationPosture: OperationPosture | null;
};
export declare function projectPrioritySortKey(priority: ProjectPriority | null | undefined): number;
export declare function compareProjectSummariesByPriority(a: Pick<DowntimeProjectSummary, 'priority' | 'title'>, b: Pick<DowntimeProjectSummary, 'priority' | 'title'>): number;
export declare function isTerminalProjectStatus(status: ProjectStatus): boolean;
export declare function isSimulationProjectStatus(status: ProjectStatus): boolean;
export declare function isValidProjectStatusTransition(from: ProjectStatus, to: ProjectStatus): boolean;
export declare function normalizeProjectType(raw: unknown): ProjectType;
export declare function normalizeProjectStatus(raw: unknown): ProjectStatus;
export declare function normalizeProjectPriority(raw: unknown): ProjectPriority | null;
export declare function normalizeNullableString(raw: unknown): string | null;
export declare function normalizeStringArray(raw: unknown): string[];
export declare function normalizeProjectResourceSourceKind(raw: unknown): ProjectResourceSourceKind;
export declare function normalizeProjectResourceEntry(raw: unknown): ProjectResourceEntry | null;
export declare function normalizeProjectBlockerEntry(raw: unknown): ProjectBlockerEntry | null;
export declare function normalizeProjectOutcomeKind(raw: unknown): ProjectOutcomeKind;
export declare function normalizeProjectOutcomeStatus(raw: unknown): ProjectOutcomeStatus;
export declare function normalizeProjectOutcomeApplicationSource(raw: unknown): ProjectOutcomeApplicationSource | null;
export declare function parseProjectTreasuryEffectPayload(raw: unknown): ProjectTreasuryEffectPayload | null;
export declare function normalizeProjectOutcomeEntry(raw: unknown): ProjectOutcomeEntry | null;
export declare function normalizeProjectRiskSeverity(raw: unknown): ProjectRiskSeverity | null;
export declare function normalizeProjectRiskEntry(raw: unknown): ProjectRiskEntry | null;
export declare function normalizeBigIntField(raw: unknown, fallback?: bigint): bigint;
export declare function normalizeNullableBigInt(raw: unknown): bigint | null;
export declare function normalizeProgressPercent(raw: unknown): number;
/**
 * Presentation-oriented progress derived from elapsed/total minutes.
 * Canonical simulation truth remains duration fields + status.
 */
export declare function computeProgressPercent(elapsedMinutes: bigint, totalMinutes: bigint): number;
/** Gate: all blockers resolved and all resources satisfied. */
export declare function canProjectProgress(fields: DowntimeProjectFields): boolean;
export declare function shouldAccumulateStall(status: ProjectStatus, canProgress: boolean): boolean;
export declare function accumulateProjectStall(fields: DowntimeProjectFields, deltaMinutes: bigint): DowntimeProjectFields;
export type ProjectAdvanceResult = {
    fields: DowntimeProjectFields;
    completed: boolean;
    stalled: boolean;
    progressed: boolean;
};
/**
 * Apply one time-advance tick to simulation fields (pure).
 * Caller persists when result indicates change.
 */
export declare function advanceProjectElapsed(fields: DowntimeProjectFields, deltaMinutes: bigint, nextEpochMinute: bigint): ProjectAdvanceResult;
export declare function formatProjectRemainingLabel(elapsedMinutes: bigint, totalMinutes: bigint): string | null;
export declare function formatProjectStalledLabel(stalledMinutes: bigint): string | null;
export declare function buildProjectRequiresSummary(resources: ProjectResourceEntry[]): string | null;
export declare function buildProjectBlockersSummary(blockers: ProjectBlockerEntry[]): string | null;
export type ProjectClockState = 'running' | 'waiting' | 'paused' | 'complete' | 'failed';
export declare function resolveProjectClockState(status: ProjectStatus, canProgress: boolean): ProjectClockState;
export declare function emptyDowntimeProjectFields(): DowntimeProjectFields;
export declare function parseDowntimeProjectFields(raw: unknown): DowntimeProjectFields;
export declare function bigintToDto(value: bigint | null | undefined): string | null;
export {};
//# sourceMappingURL=projectMetadata.d.ts.map