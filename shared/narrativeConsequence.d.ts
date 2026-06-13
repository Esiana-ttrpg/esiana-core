/**
 * Layer 2 — declarative consequence rules (wiki metadata).
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';
export declare const NARRATIVE_CONSEQUENCE_VERSION = "narrative-consequence-v1";
export type ConsequenceTrigger = {
    type: 'on_lifecycle';
    lifecycleTarget: NarrativeLifecycleState;
} | {
    type: 'on_enter_node';
    branchNodeId: string;
};
export type ConsequenceEffect = {
    type: 'discover_wiki_page';
    pageId: string;
} | {
    type: 'discover_quest';
    questPageId: string;
} | {
    type: 'set_faction_stance';
    factionPageId: string;
    stance: string;
} | {
    type: 'append_snapshot_facet';
    facetKey: string;
    payload: unknown;
} | {
    type: 'circulate_rumor';
    claimId?: string;
    draft?: {
        statement: string;
        subjectPageId: string;
        stableKey?: string;
    };
    targetLocationPageId?: string;
    targetOrgPageId?: string;
    stance?: string;
    awarenessScope?: string;
    visibility?: 'PARTY' | 'GM_ONLY';
};
export type ConsequenceRule = {
    id: string;
    trigger: ConsequenceTrigger;
    effects: ConsequenceEffect[];
};
export type ConsequenceRuleSet = {
    version: typeof NARRATIVE_CONSEQUENCE_VERSION;
    rules: ConsequenceRule[];
};
export declare function parseConsequenceRuleSet(raw: unknown): ConsequenceRuleSet | null;
//# sourceMappingURL=narrativeConsequence.d.ts.map