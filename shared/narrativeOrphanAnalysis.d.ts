/**
 * Layer 4 — tiered orphaned content analysis (pure).
 */
import type { ContinuityIssueSeverity, ContinuityIssueType } from './continuityIssue.js';
import type { EntityGraphEdge } from './entityGraph.js';
import { type NarrativeLifecycleState } from './narrativeLifecycle.js';
import type { ThreadMetadataFields } from './threadMetadata.js';
export type NarrativeIsolationClass = 'structural' | 'narrative' | 'temporal';
export type NarrativeOrphanPageRow = {
    pageId: string;
    title: string;
    codexType: string;
    inboundLinkCount: number;
    isContinuityRoot: boolean;
    lifecycleState?: NarrativeLifecycleState;
    subjectKind?: 'quest' | 'open_thread';
    thread?: ThreadMetadataFields | null;
    updatedAtMs?: number;
};
export type NarrativeOrphanScanInput = {
    pages: readonly NarrativeOrphanPageRow[];
    edges: readonly EntityGraphEdge[];
    pageIdsInThreadRelated: ReadonlySet<string>;
    pageIdsInQuestParticipation: ReadonlySet<string>;
    activeTargetPageIds: ReadonlySet<string>;
    calendarEventIds: ReadonlySet<string>;
    dissolvedOrgPageIds: ReadonlySet<string>;
};
export type NarrativeOrphanRuleId = 'entity_graph_isolated' | 'quest_isolated' | 'thread_unconnected' | 'npc_narratively_disconnected' | 'faction_inactive';
export type NarrativeOrphanFinding = {
    ruleId: NarrativeOrphanRuleId;
    isolationClass: NarrativeIsolationClass;
    issueType: ContinuityIssueType;
    severity: ContinuityIssueSeverity;
    pageId: string;
    title: string;
    messageParts: Record<string, string>;
};
export declare function isStructurallyIsolated(page: NarrativeOrphanPageRow, input: NarrativeOrphanScanInput): boolean;
export declare function detectNarrativeOrphans(input: NarrativeOrphanScanInput): NarrativeOrphanFinding[];
/** Shared structural check for entity-graph diagnostics endpoint. */
export declare function isEntityGraphStructurallyIsolated(pageId: string, input: Pick<NarrativeOrphanScanInput, 'edges' | 'pageIdsInThreadRelated' | 'pageIdsInQuestParticipation'> & {
    inboundLinkCount: number;
    isContinuityRoot: boolean;
}): boolean;
//# sourceMappingURL=narrativeOrphanAnalysis.d.ts.map