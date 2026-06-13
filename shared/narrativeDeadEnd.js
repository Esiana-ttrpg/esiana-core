"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STALE_EDGE_WINDOW_MS = void 0;
exports.normalizeNarrativeSubject = normalizeNarrativeSubject;
exports.detectNarrativeDeadEnds = detectNarrativeDeadEnds;
const contentPresence_js_1 = require("./contentPresence.js");
const narrativeBranch_js_1 = require("./narrativeBranch.js");
const narrativeBranchAnalysis_js_1 = require("./narrativeBranchAnalysis.js");
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
exports.DEFAULT_STALE_EDGE_WINDOW_MS = 5 * 60 * 1000;
const TERMINAL_KINDS = new Set([
    narrativeBranch_js_1.BranchNodeKinds.OUTCOME,
    narrativeBranch_js_1.BranchNodeKinds.FAILURE,
    narrativeBranch_js_1.BranchNodeKinds.MERGE,
]);
const TERMINAL_LIFECYCLE = new Set([
    narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED,
    narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED,
]);
function hasLifecycleResolutionHook(rules) {
    if (!rules)
        return false;
    return rules.rules.some((rule) => rule.trigger.type === 'on_lifecycle' &&
        (rule.trigger.lifecycleTarget === narrativeLifecycle_js_1.NarrativeLifecycleStates.COMPLETED ||
            rule.trigger.lifecycleTarget === narrativeLifecycle_js_1.NarrativeLifecycleStates.FAILED));
}
function normalizeNarrativeSubject(row, input) {
    const now = input.now ?? new Date();
    const staleWindow = input.staleEdgeWindowMs ?? exports.DEFAULT_STALE_EDGE_WINDOW_MS;
    const isDraftSubject = row.presenceState === contentPresence_js_1.ContentRevelationStates.DRAFT;
    const isRecentlyEdited = now.getTime() - row.updatedAt.getTime() < staleWindow;
    const graph = row.branchGraph;
    const dedupedEdges = graph ? (0, narrativeBranchAnalysis_js_1.dedupeBranchEdges)(graph.edges) : [];
    const nodeIdSet = new Set(graph?.nodes.map((n) => n.id) ?? []);
    const nodesById = new Map((graph?.nodes ?? []).map((n) => [n.id, n]));
    const entryNodeIds = graph ? (0, narrativeBranchAnalysis_js_1.resolveEntryNodeIds)(graph, row.activeNodeId) : [];
    const reachableFromEntry = graph && entryNodeIds.length > 0
        ? (0, narrativeBranchAnalysis_js_1.bfsReachable)(entryNodeIds, dedupedEdges)
        : new Set();
    const terminalNodeIds = (graph?.nodes ?? [])
        .filter((n) => TERMINAL_KINDS.has(n.kind))
        .map((n) => n.id);
    return {
        row,
        subjectPageId: row.subjectPageId,
        subjectTitle: row.subjectTitle,
        subjectKind: row.subjectKind,
        lifecycleState: row.lifecycleState,
        isDraftSubject,
        isRecentlyEdited,
        entryNodeIds,
        terminalNodeIds,
        reachableFromEntry,
        dedupedEdges,
        nodeIdSet,
        nodesById,
        hasLifecycleResolutionHook: hasLifecycleResolutionHook(row.consequenceRules),
        isConsequenceReferenced: input.consequenceReferenceIndex.has(row.subjectPageId),
    };
}
function isStaleDanglingEdge(subject) {
    return subject.isDraftSubject || subject.isRecentlyEdited;
}
function passStructuralIntegrity(subject) {
    const findings = [];
    const graph = subject.row.branchGraph;
    if (!graph)
        return findings;
    for (const edge of graph.edges) {
        const missingFrom = !subject.nodeIdSet.has(edge.from);
        const missingTo = !subject.nodeIdSet.has(edge.to);
        if (!missingFrom && !missingTo)
            continue;
        const branchNodeId = missingFrom ? edge.from : edge.to;
        if (isStaleDanglingEdge(subject)) {
            findings.push({
                ruleId: 'branch_stale_edge',
                issueCategory: 'structural',
                issueType: 'narrative_broken_chain',
                severity: 'info',
                subjectPageId: subject.subjectPageId,
                branchNodeId,
                messageParts: {
                    subjectTitle: subject.subjectTitle,
                    branchNodeId,
                },
            });
        }
        else {
            findings.push({
                ruleId: 'branch_hard_dangling_edge',
                issueCategory: 'structural',
                issueType: 'narrative_broken_chain',
                severity: subject.isDraftSubject ? 'warning' : 'critical',
                subjectPageId: subject.subjectPageId,
                branchNodeId,
                messageParts: {
                    subjectTitle: subject.subjectTitle,
                    branchNodeId,
                },
            });
        }
    }
    for (const node of graph.nodes) {
        const hasOutgoing = subject.dedupedEdges.some((e) => e.from === node.id);
        if (hasOutgoing || TERMINAL_KINDS.has(node.kind))
            continue;
        findings.push({
            ruleId: 'branch_non_terminal_leaf',
            issueCategory: 'structural',
            issueType: 'narrative_dead_end',
            severity: 'warning',
            subjectPageId: subject.subjectPageId,
            branchNodeId: node.id,
            messageParts: {
                subjectTitle: subject.subjectTitle,
                nodeLabel: node.label,
                branchNodeId: node.id,
            },
        });
    }
    return findings;
}
function passResolutionTopology(subject) {
    const findings = [];
    const graph = subject.row.branchGraph;
    if (!graph || subject.isDraftSubject)
        return findings;
    for (const terminalId of subject.terminalNodeIds) {
        if (subject.reachableFromEntry.has(terminalId))
            continue;
        const node = subject.nodesById.get(terminalId);
        findings.push({
            ruleId: 'branch_unreachable_terminal',
            issueCategory: 'structural',
            issueType: 'narrative_unreachable_conclusion',
            severity: 'warning',
            subjectPageId: subject.subjectPageId,
            branchNodeId: terminalId,
            messageParts: {
                subjectTitle: subject.subjectTitle,
                nodeLabel: node?.label ?? terminalId,
                branchNodeId: terminalId,
            },
        });
    }
    if (subject.subjectKind !== 'quest')
        return findings;
    const livingQuest = subject.lifecycleState === narrativeLifecycle_js_1.NarrativeLifecycleStates.DISCOVERED ||
        subject.lifecycleState === narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE;
    if (!livingQuest || subject.hasLifecycleResolutionHook)
        return findings;
    const hasReachableTerminal = subject.terminalNodeIds.some((id) => subject.reachableFromEntry.has(id));
    if (hasReachableTerminal)
        return findings;
    findings.push({
        ruleId: 'quest_no_resolution_path',
        issueCategory: 'narrative_intent',
        issueType: 'narrative_incomplete_arc',
        severity: 'warning',
        subjectPageId: subject.subjectPageId,
        messageParts: {
            subjectTitle: subject.subjectTitle,
        },
    });
    return findings;
}
function shouldEscalateThread(subject, thread) {
    return (thread.threadKind === 'promise' ||
        thread.narrativeWeight === 'critical' ||
        subject.isConsequenceReferenced);
}
function passNarrativeIntent(subject, input) {
    const findings = [];
    if (subject.subjectKind === 'open_thread' && subject.row.thread) {
        const thread = subject.row.thread;
        const eligibleKind = thread.threadKind === 'foreshadowing' || thread.threadKind === 'promise';
        const open = thread.threadStatus === 'OPEN';
        const noPayoff = !thread.payoffPageId;
        const notTerminal = !TERMINAL_LIFECYCLE.has(subject.lifecycleState);
        if (eligibleKind && open && noPayoff && notTerminal) {
            if (shouldEscalateThread(subject, thread)) {
                findings.push({
                    ruleId: 'thread_incomplete_escalated',
                    issueCategory: 'narrative_intent',
                    issueType: 'narrative_incomplete_arc',
                    severity: 'warning',
                    subjectPageId: subject.subjectPageId,
                    messageParts: {
                        subjectTitle: subject.subjectTitle,
                        threadKind: thread.threadKind,
                    },
                });
            }
            else {
                findings.push({
                    ruleId: 'thread_unresolved_soft',
                    issueCategory: 'narrative_intent',
                    issueType: 'narrative_unresolved_thread',
                    severity: 'info',
                    subjectPageId: subject.subjectPageId,
                    messageParts: {
                        subjectTitle: subject.subjectTitle,
                        threadKind: thread.threadKind,
                    },
                });
            }
        }
    }
    const rules = subject.row.consequenceRules;
    if (!rules)
        return findings;
    for (const rule of rules.rules) {
        if (rule.trigger.type === 'on_enter_node') {
            const branchNodeId = rule.trigger.branchNodeId;
            if (!subject.nodeIdSet.has(branchNodeId)) {
                const severity = subject.isDraftSubject
                    ? 'warning'
                    : 'critical';
                findings.push({
                    ruleId: 'consequence_missing_branch_node',
                    issueCategory: 'system_consistency',
                    issueType: 'narrative_broken_chain',
                    severity,
                    subjectPageId: subject.subjectPageId,
                    branchNodeId,
                    consequenceRuleId: rule.id,
                    messageParts: {
                        subjectTitle: subject.subjectTitle,
                        branchNodeId,
                        consequenceRuleId: rule.id,
                    },
                });
            }
        }
        for (const effect of rule.effects) {
            let targetPageId = null;
            if (effect.type === 'discover_wiki_page')
                targetPageId = effect.pageId;
            if (effect.type === 'discover_quest')
                targetPageId = effect.questPageId;
            if (!targetPageId)
                continue;
            if (!input.existingPageIds.has(targetPageId)) {
                findings.push({
                    ruleId: 'consequence_missing_page',
                    issueCategory: 'system_consistency',
                    issueType: 'narrative_broken_chain',
                    severity: subject.isDraftSubject ? 'warning' : 'critical',
                    subjectPageId: subject.subjectPageId,
                    relatedPageId: targetPageId,
                    consequenceRuleId: rule.id,
                    messageParts: {
                        subjectTitle: subject.subjectTitle,
                        targetPageId,
                        consequenceRuleId: rule.id,
                    },
                });
                continue;
            }
            const presence = input.pagePresenceById.get(targetPageId) ?? contentPresence_js_1.ContentRevelationStates.REVEALED;
            if (presence === contentPresence_js_1.ContentRevelationStates.DRAFT) {
                findings.push({
                    ruleId: 'consequence_target_draft',
                    issueCategory: 'system_consistency',
                    issueType: 'narrative_broken_chain',
                    severity: 'warning',
                    subjectPageId: subject.subjectPageId,
                    relatedPageId: targetPageId,
                    consequenceRuleId: rule.id,
                    messageParts: {
                        subjectTitle: subject.subjectTitle,
                        targetPageId,
                        consequenceRuleId: rule.id,
                    },
                });
            }
        }
    }
    return findings;
}
function detectNarrativeDeadEnds(input) {
    const findings = [];
    for (const row of input.subjects) {
        const subject = normalizeNarrativeSubject(row, input);
        findings.push(...passStructuralIntegrity(subject), ...passResolutionTopology(subject), ...passNarrativeIntent(subject, input));
    }
    return findings;
}
//# sourceMappingURL=narrativeDeadEnd.js.map