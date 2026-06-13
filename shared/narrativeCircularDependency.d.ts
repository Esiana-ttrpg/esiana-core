/**
 * Layer 4 — circular dependency detection (SCC-based, canonical fingerprints).
 */
import type { ContentRevelationState } from './contentPresence.js';
import type { ContinuityIssueCategory, ContinuityIssueSeverity, ContinuityIssueType } from './continuityIssue.js';
import { type EntityGraphEdge } from './entityGraph.js';
import type { NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';
export declare const GLOBAL_NARRATIVE_CYCLE_CAP = 50;
export declare const MAX_CYCLE_PARTICIPANTS = 25;
export type NarrativeUnlockNodeKind = 'quest' | 'open_thread' | 'calendar_event' | 'scene' | 'clue';
export type UnlockDependencyEdge = {
    fromId: string;
    toId: string;
    fromKind: NarrativeUnlockNodeKind;
    toKind: NarrativeUnlockNodeKind;
    source: 'lifecycle_condition' | 'consequence_discover' | 'calendar_event_condition';
};
export type CalendarPrerequisiteCycle = {
    eventIds: string[];
    canonicalKey: string;
};
export type NarrativeCircularDependencyFinding = {
    ruleId: string;
    issueType: ContinuityIssueType;
    issueCategory: ContinuityIssueCategory;
    severity: ContinuityIssueSeverity;
    subjectPageId?: string;
    participantIds: string[];
    participantKinds?: NarrativeUnlockNodeKind[];
    participantLabels?: Record<string, string>;
    representativePath?: string[];
    summarized?: boolean;
    messageParts: Record<string, string>;
};
export type DetectUnlockCyclesInput = {
    subjects: readonly NarrativeDeadEndScanRow[];
    narrativeSubjectIds: ReadonlySet<string>;
    pagePresenceById: ReadonlyMap<string, ContentRevelationState>;
    maxParticipants?: number;
};
export type DetectBranchCyclesInput = {
    subjects: readonly NarrativeDeadEndScanRow[];
};
/** Rotate cycle to lex-min start, compare forward vs reverse, return canonical key. */
export declare function canonicalizeCycle(nodeIds: readonly string[]): string;
/** Ordered participant list derived from canonical key (for UI). */
export declare function canonicalCycleParticipants(nodeIds: readonly string[]): string[];
/** Tarjan SCC — returns components in discovery order. */
export declare function tarjanStronglyConnectedComponents(adjacency: Map<string, string[]>): string[][];
export declare function extractUnlockDependencies(subjects: readonly NarrativeDeadEndScanRow[], narrativeSubjectIds: ReadonlySet<string>): UnlockDependencyEdge[];
export declare function extractCalendarPrerequisiteCycles(edges: readonly EntityGraphEdge[]): CalendarPrerequisiteCycle[];
export declare function detectUnlockCycles(input: DetectUnlockCyclesInput): NarrativeCircularDependencyFinding[];
export declare function detectBranchCycles(input: DetectBranchCyclesInput): NarrativeCircularDependencyFinding[];
export declare function calendarCyclesToFindings(cycles: readonly CalendarPrerequisiteCycle[], eventTitles: ReadonlyMap<string, string>, maxParticipants?: number): NarrativeCircularDependencyFinding[];
export declare function filterFindingsByPageId(findings: readonly NarrativeCircularDependencyFinding[], filterPageId: string, eventWikiPageIds?: ReadonlyMap<string, string | null>): NarrativeCircularDependencyFinding[];
export declare function applyCycleFindingCap(findings: NarrativeCircularDependencyFinding[], cap?: number): NarrativeCircularDependencyFinding[];
/** Resolve wiki-page participant ids for cycle UI links. */
export declare function wikiParticipantIds(finding: NarrativeCircularDependencyFinding): string[];
//# sourceMappingURL=narrativeCircularDependency.d.ts.map