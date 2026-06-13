"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStructurallyIsolated = isStructurallyIsolated;
exports.detectNarrativeOrphans = detectNarrativeOrphans;
exports.isEntityGraphStructurallyIsolated = isEntityGraphStructurallyIsolated;
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const narrativeConnectivity_js_1 = require("./narrativeConnectivity.js");
const NARRATIVE_CODEX_TYPES = new Set([
    'CHARACTER',
    'QUEST',
    'LOCATION',
    'ORGANIZATION',
    'BESTIARY',
    'OBJECT',
    'FAMILY',
    'ANCESTRY',
    'LANGUAGE',
    'RULE_RESOURCE',
]);
function isDraftLifecycle(state) {
    return state === undefined;
}
function isOpenAuthoredThread(thread) {
    if (!thread)
        return false;
    if (thread.playerSubmitted || thread.threadKind === 'theory')
        return false;
    return thread.threadStatus === 'OPEN' || thread.threadStatus === 'DORMANT';
}
function isStructurallyIsolated(page, input) {
    if (page.isContinuityRoot)
        return false;
    if (page.lifecycleState === narrativeLifecycle_js_1.NarrativeLifecycleStates.LOCKED)
        return false;
    if ((0, narrativeConnectivity_js_1.hasNonParentNarrativeEdge)(page.pageId, input.edges))
        return false;
    if (page.inboundLinkCount > 0)
        return false;
    if (input.pageIdsInThreadRelated.has(page.pageId))
        return false;
    if ((0, narrativeConnectivity_js_1.hasThreadGraphEdge)(page.pageId, input.edges))
        return false;
    if (input.pageIdsInQuestParticipation.has(page.pageId))
        return false;
    if ((0, narrativeConnectivity_js_1.hasChronologyEdge)(page.pageId, input.edges))
        return false;
    return true;
}
function detectNarrativeOrphans(input) {
    const findings = [];
    for (const page of input.pages) {
        const isThreadSubject = page.subjectKind === 'open_thread';
        const isQuestSubject = page.subjectKind === 'quest';
        if (!NARRATIVE_CODEX_TYPES.has(page.codexType) &&
            !isThreadSubject &&
            !isQuestSubject) {
            continue;
        }
        if (page.isContinuityRoot)
            continue;
        if (isDraftLifecycle(page.lifecycleState) && page.subjectKind) {
            // skip draft subjects when lifecycle unknown — treat as non-draft for entities
        }
        const structurallyIsolated = isStructurallyIsolated(page, input);
        if (structurallyIsolated &&
            page.codexType !== 'QUEST' &&
            page.subjectKind !== 'open_thread') {
            findings.push({
                ruleId: 'entity_graph_isolated',
                isolationClass: 'structural',
                issueType: 'narrative_orphan_entity',
                severity: 'info',
                pageId: page.pageId,
                title: page.title,
                messageParts: { codexType: page.codexType },
            });
            continue;
        }
        if (page.subjectKind === 'quest' &&
            page.lifecycleState === narrativeLifecycle_js_1.NarrativeLifecycleStates.ACTIVE &&
            structurallyIsolated) {
            findings.push({
                ruleId: 'quest_isolated',
                isolationClass: 'structural',
                issueType: 'narrative_orphan_quest',
                severity: 'warning',
                pageId: page.pageId,
                title: page.title,
                messageParts: {},
            });
            continue;
        }
        if (page.subjectKind === 'open_thread' &&
            isOpenAuthoredThread(page.thread) &&
            !page.thread?.relatedPageIds.length &&
            !(0, narrativeConnectivity_js_1.hasThreadGraphEdge)(page.pageId, input.edges)) {
            findings.push({
                ruleId: 'thread_unconnected',
                isolationClass: 'structural',
                issueType: 'narrative_orphan_thread',
                severity: 'warning',
                pageId: page.pageId,
                title: page.title,
                messageParts: { threadKind: page.thread?.threadKind ?? 'thread' },
            });
            continue;
        }
        if (page.codexType === 'CHARACTER' && !structurallyIsolated) {
            const score = (0, narrativeConnectivity_js_1.computeConnectivityScore)({
                startPageId: page.pageId,
                edges: input.edges,
                activeTargetPageIds: input.activeTargetPageIds,
                calendarEventIds: input.calendarEventIds,
            });
            if (!(0, narrativeConnectivity_js_1.isNarrativelyConnected)(score)) {
                findings.push({
                    ruleId: 'npc_narratively_disconnected',
                    isolationClass: 'narrative',
                    issueType: 'narrative_orphan_npc',
                    severity: 'info',
                    pageId: page.pageId,
                    title: page.title,
                    messageParts: {},
                });
            }
            continue;
        }
        if (page.codexType === 'ORGANIZATION') {
            const hasActiveRefs = input.activeTargetPageIds.has(page.pageId) ||
                input.pageIdsInQuestParticipation.has(page.pageId) ||
                input.pageIdsInThreadRelated.has(page.pageId);
            if (hasActiveRefs)
                continue;
            const score = (0, narrativeConnectivity_js_1.computeConnectivityScore)({
                startPageId: page.pageId,
                edges: input.edges,
                activeTargetPageIds: input.activeTargetPageIds,
                calendarEventIds: input.calendarEventIds,
            });
            const isDissolved = input.dissolvedOrgPageIds.has(page.pageId);
            const inactive = isDissolved ||
                score.strongScore === 0 ||
                !(0, narrativeConnectivity_js_1.isNarrativelyConnected)(score);
            if (inactive) {
                findings.push({
                    ruleId: 'faction_inactive',
                    isolationClass: 'temporal',
                    issueType: 'narrative_orphan_faction',
                    severity: 'info',
                    pageId: page.pageId,
                    title: page.title,
                    messageParts: { dissolved: isDissolved ? 'true' : 'false' },
                });
            }
        }
    }
    return findings;
}
/** Shared structural check for entity-graph diagnostics endpoint. */
function isEntityGraphStructurallyIsolated(pageId, input) {
    return isStructurallyIsolated({
        pageId,
        title: '',
        codexType: 'CHARACTER',
        inboundLinkCount: input.inboundLinkCount,
        isContinuityRoot: input.isContinuityRoot,
    }, {
        pages: [],
        edges: input.edges,
        pageIdsInThreadRelated: input.pageIdsInThreadRelated,
        pageIdsInQuestParticipation: input.pageIdsInQuestParticipation,
        activeTargetPageIds: new Set(),
        calendarEventIds: new Set(),
        dissolvedOrgPageIds: new Set(),
    });
}
//# sourceMappingURL=narrativeOrphanAnalysis.js.map