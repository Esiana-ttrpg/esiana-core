"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_CYCLE_PARTICIPANTS = exports.GLOBAL_NARRATIVE_CYCLE_CAP = void 0;
exports.canonicalizeCycle = canonicalizeCycle;
exports.canonicalCycleParticipants = canonicalCycleParticipants;
exports.tarjanStronglyConnectedComponents = tarjanStronglyConnectedComponents;
exports.extractUnlockDependencies = extractUnlockDependencies;
exports.extractCalendarPrerequisiteCycles = extractCalendarPrerequisiteCycles;
exports.detectUnlockCycles = detectUnlockCycles;
exports.detectBranchCycles = detectBranchCycles;
exports.calendarCyclesToFindings = calendarCyclesToFindings;
exports.filterFindingsByPageId = filterFindingsByPageId;
exports.applyCycleFindingCap = applyCycleFindingCap;
exports.wikiParticipantIds = wikiParticipantIds;
const contentPresence_js_1 = require("./contentPresence.js");
const entityGraph_js_1 = require("./entityGraph.js");
const entityGraphQuery_js_1 = require("./entityGraphQuery.js");
const narrativeBranchAnalysis_js_1 = require("./narrativeBranchAnalysis.js");
exports.GLOBAL_NARRATIVE_CYCLE_CAP = 50;
exports.MAX_CYCLE_PARTICIPANTS = 25;
function serializeCycle(nodes) {
    return nodes.join('>');
}
/** Rotate cycle to lex-min start, compare forward vs reverse, return canonical key. */
function canonicalizeCycle(nodeIds) {
    if (nodeIds.length === 0)
        return '';
    let cycle = [...nodeIds];
    if (cycle.length > 1 && cycle[0] === cycle[cycle.length - 1]) {
        cycle = cycle.slice(0, -1);
    }
    if (cycle.length === 0)
        return '';
    if (cycle.length === 1)
        return cycle[0];
    let minIdx = 0;
    for (let i = 1; i < cycle.length; i++) {
        if (cycle[i] < cycle[minIdx])
            minIdx = i;
    }
    const forward = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
    const reversed = [...cycle].reverse();
    let minIdxRev = 0;
    for (let i = 1; i < reversed.length; i++) {
        if (reversed[i] < reversed[minIdxRev])
            minIdxRev = i;
    }
    const reverseRotated = [...reversed.slice(minIdxRev), ...reversed.slice(0, minIdxRev)];
    const forwardKey = serializeCycle(forward);
    const reverseKey = serializeCycle(reverseRotated);
    return forwardKey <= reverseKey ? forwardKey : reverseKey;
}
/** Ordered participant list derived from canonical key (for UI). */
function canonicalCycleParticipants(nodeIds) {
    const key = canonicalizeCycle(nodeIds);
    if (!key)
        return [];
    if (!key.includes('>'))
        return [key];
    return key.split('>');
}
function subjectKindForRow(row) {
    return row.subjectKind === 'quest' ? 'quest' : 'open_thread';
}
function buildAdjacency(edges) {
    const adj = new Map();
    const ensure = (id) => {
        if (!adj.has(id))
            adj.set(id, []);
        return adj.get(id);
    };
    for (const edge of edges) {
        ensure(edge.fromId).push(edge.toId);
        ensure(edge.toId);
        ensure(edge.fromId);
    }
    return adj;
}
function hasSelfLoop(nodeId, adjacency) {
    return (adjacency.get(nodeId) ?? []).includes(nodeId);
}
/** Tarjan SCC — returns components in discovery order. */
function tarjanStronglyConnectedComponents(adjacency) {
    let index = 0;
    const stack = [];
    const onStack = new Set();
    const indices = new Map();
    const lowlinks = new Map();
    const components = [];
    const strongConnect = (node) => {
        indices.set(node, index);
        lowlinks.set(node, index);
        index += 1;
        stack.push(node);
        onStack.add(node);
        for (const next of adjacency.get(node) ?? []) {
            if (!indices.has(next)) {
                strongConnect(next);
                lowlinks.set(node, Math.min(lowlinks.get(node), lowlinks.get(next)));
            }
            else if (onStack.has(next)) {
                lowlinks.set(node, Math.min(lowlinks.get(node), indices.get(next)));
            }
        }
        if (lowlinks.get(node) === indices.get(node)) {
            const component = [];
            let w;
            do {
                w = stack.pop();
                onStack.delete(w);
                component.push(w);
            } while (w !== node);
            components.push(component);
        }
    };
    for (const node of adjacency.keys()) {
        if (!indices.has(node)) {
            strongConnect(node);
        }
    }
    return components;
}
function isCyclicComponent(component, adjacency) {
    if (component.length > 1)
        return true;
    if (component.length === 1)
        return hasSelfLoop(component[0], adjacency);
    return false;
}
function buildRepresentativePath(participantIds, edges) {
    if (participantIds.length < 2) {
        return participantIds.length === 1 ? [...participantIds] : undefined;
    }
    const participantSet = new Set(participantIds);
    const outEdges = new Map();
    for (const edge of edges) {
        if (!participantSet.has(edge.fromId) || !participantSet.has(edge.toId))
            continue;
        const list = outEdges.get(edge.fromId) ?? [];
        list.push(edge.toId);
        outEdges.set(edge.fromId, list);
    }
    const start = participantIds[0];
    const path = [start];
    const visited = new Set([start]);
    let current = start;
    while (path.length < participantIds.length) {
        const nextCandidates = (outEdges.get(current) ?? []).filter((id) => participantSet.has(id));
        const next = nextCandidates.find((id) => !visited.has(id)) ?? nextCandidates[0];
        if (!next)
            break;
        path.push(next);
        visited.add(next);
        current = next;
        if (next === start && path.length > 1)
            break;
    }
    return path.length >= 2 ? path : [...participantIds];
}
function unlockCycleSeverity(participantIds, participantKinds, pagePresenceById) {
    let anyPublished = false;
    for (let i = 0; i < participantIds.length; i++) {
        const kind = participantKinds[i];
        if (kind === 'calendar_event') {
            anyPublished = true;
            continue;
        }
        if (kind === 'scene' || kind === 'clue')
            continue;
        const presence = pagePresenceById.get(participantIds[i]) ?? contentPresence_js_1.ContentRevelationStates.REVEALED;
        if (presence !== contentPresence_js_1.ContentRevelationStates.DRAFT) {
            anyPublished = true;
        }
    }
    return anyPublished ? 'critical' : 'warning';
}
function extractUnlockDependencies(subjects, narrativeSubjectIds) {
    const edges = [];
    for (const row of subjects) {
        const dependentKind = subjectKindForRow(row);
        const graph = row.branchGraph;
        if (graph) {
            for (const edge of (0, narrativeBranchAnalysis_js_1.dedupeBranchEdges)(graph.edges)) {
                const condition = edge.condition;
                if (!condition)
                    continue;
                if (condition.type === 'lifecycle') {
                    const prereqKind = narrativeSubjectIds.has(condition.subjectId)
                        ? subjects.find((s) => s.subjectPageId === condition.subjectId)
                        : undefined;
                    edges.push({
                        fromId: condition.subjectId,
                        toId: row.subjectPageId,
                        fromKind: prereqKind ? subjectKindForRow(prereqKind) : 'quest',
                        toKind: dependentKind,
                        source: 'lifecycle_condition',
                    });
                }
                else if (condition.type === 'calendar_event') {
                    edges.push({
                        fromId: condition.eventId,
                        toId: row.subjectPageId,
                        fromKind: 'calendar_event',
                        toKind: dependentKind,
                        source: 'calendar_event_condition',
                    });
                }
            }
        }
        const rules = row.consequenceRules;
        if (!rules)
            continue;
        for (const rule of rules.rules) {
            for (const effect of rule.effects) {
                let targetId = null;
                if (effect.type === 'discover_quest')
                    targetId = effect.questPageId;
                if (effect.type === 'discover_wiki_page')
                    targetId = effect.pageId;
                if (!targetId || !narrativeSubjectIds.has(targetId))
                    continue;
                const targetRow = subjects.find((s) => s.subjectPageId === targetId);
                edges.push({
                    fromId: row.subjectPageId,
                    toId: targetId,
                    fromKind: subjectKindForRow(row),
                    toKind: targetRow ? subjectKindForRow(targetRow) : 'quest',
                    source: 'consequence_discover',
                });
            }
        }
    }
    return edges;
}
function extractCalendarPrerequisiteCycles(edges) {
    const raw = (0, entityGraphQuery_js_1.findCycles)(edges, [entityGraph_js_1.EntityRelationKinds.CALENDAR_PREREQUISITE]);
    const seen = new Set();
    const cycles = [];
    for (const finding of raw) {
        const eventIds = finding.nodeIds.filter(Boolean);
        if (eventIds.length === 0)
            continue;
        const canonicalKey = canonicalizeCycle(eventIds);
        if (seen.has(canonicalKey))
            continue;
        seen.add(canonicalKey);
        cycles.push({
            eventIds: canonicalCycleParticipants(eventIds),
            canonicalKey,
        });
    }
    return cycles;
}
function detectUnlockCycles(input) {
    const deps = extractUnlockDependencies(input.subjects, input.narrativeSubjectIds);
    if (deps.length === 0)
        return [];
    const adjacency = buildAdjacency(deps);
    const kindById = new Map();
    for (const edge of deps) {
        kindById.set(edge.fromId, edge.fromKind);
        kindById.set(edge.toId, edge.toKind);
    }
    const maxParticipants = input.maxParticipants ?? exports.MAX_CYCLE_PARTICIPANTS;
    const findings = [];
    const seenKeys = new Set();
    for (const component of tarjanStronglyConnectedComponents(adjacency)) {
        if (!isCyclicComponent(component, adjacency))
            continue;
        const participantIds = canonicalCycleParticipants(component);
        const canonicalKey = canonicalizeCycle(component);
        if (seenKeys.has(canonicalKey))
            continue;
        seenKeys.add(canonicalKey);
        const participantKinds = participantIds.map((id) => kindById.get(id) ?? 'quest');
        const summarized = participantIds.length > maxParticipants;
        const displayIds = summarized
            ? participantIds.slice(0, maxParticipants)
            : participantIds;
        const titleById = new Map();
        for (const row of input.subjects) {
            titleById.set(row.subjectPageId, row.subjectTitle);
        }
        const participantLabels = {};
        for (const id of displayIds) {
            participantLabels[id] = titleById.get(id) ?? id;
        }
        findings.push({
            ruleId: summarized ? 'unlock_cycle_large_scc' : 'unlock_cycle_scc',
            issueType: 'narrative_unlock_cycle',
            issueCategory: 'system_consistency',
            severity: unlockCycleSeverity(participantIds, participantKinds, input.pagePresenceById),
            participantIds: displayIds,
            participantKinds: participantKinds.slice(0, displayIds.length),
            participantLabels,
            representativePath: buildRepresentativePath(displayIds, deps),
            summarized,
            messageParts: {
                participantCount: String(participantIds.length),
                canonicalCycleKey: canonicalKey,
            },
        });
    }
    return findings;
}
function detectBranchCycles(input) {
    const findings = [];
    const seenKeys = new Set();
    for (const row of input.subjects) {
        const graph = row.branchGraph;
        if (!graph)
            continue;
        const edges = (0, narrativeBranchAnalysis_js_1.dedupeBranchEdges)(graph.edges);
        if (edges.length === 0)
            continue;
        const adjacency = buildAdjacency(edges.map((edge) => ({ fromId: edge.from, toId: edge.to })));
        const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
        for (const component of tarjanStronglyConnectedComponents(adjacency)) {
            if (!isCyclicComponent(component, adjacency))
                continue;
            const participantIds = canonicalCycleParticipants(component);
            const scopedKey = `${row.subjectPageId}:${canonicalizeCycle(component)}`;
            if (seenKeys.has(scopedKey))
                continue;
            seenKeys.add(scopedKey);
            const participantLabels = {};
            for (const id of participantIds) {
                participantLabels[id] = nodesById.get(id)?.label ?? id;
            }
            findings.push({
                ruleId: 'branch_cycle_scc',
                issueType: 'narrative_branch_cycle',
                issueCategory: 'structural',
                severity: 'warning',
                subjectPageId: row.subjectPageId,
                participantIds,
                representativePath: [...participantIds],
                messageParts: {
                    subjectTitle: row.subjectTitle,
                    participantCount: String(participantIds.length),
                    canonicalCycleKey: canonicalizeCycle(component),
                },
                participantLabels,
            });
        }
    }
    return findings;
}
function calendarCyclesToFindings(cycles, eventTitles, maxParticipants = exports.MAX_CYCLE_PARTICIPANTS) {
    return cycles.map((cycle) => {
        const summarized = cycle.eventIds.length > maxParticipants;
        const displayIds = summarized
            ? cycle.eventIds.slice(0, maxParticipants)
            : cycle.eventIds;
        const participantLabels = {};
        for (const id of displayIds) {
            participantLabels[id] = eventTitles.get(id) ?? id;
        }
        return {
            ruleId: summarized ? 'calendar_prerequisite_large_scc' : 'calendar_prerequisite_scc',
            issueType: 'calendar_prerequisite_cycle',
            issueCategory: 'system_consistency',
            severity: 'warning',
            participantIds: displayIds,
            participantKinds: displayIds.map(() => 'calendar_event'),
            participantLabels,
            representativePath: [...displayIds],
            summarized,
            messageParts: {
                participantCount: String(cycle.eventIds.length),
                canonicalCycleKey: cycle.canonicalKey,
            },
        };
    });
}
function filterFindingsByPageId(findings, filterPageId, eventWikiPageIds) {
    return findings.filter((finding) => {
        if (finding.subjectPageId === filterPageId)
            return true;
        if (finding.participantIds.includes(filterPageId))
            return true;
        if (eventWikiPageIds) {
            for (const eventId of finding.participantIds) {
                if (eventWikiPageIds.get(eventId) === filterPageId)
                    return true;
            }
        }
        return false;
    });
}
function applyCycleFindingCap(findings, cap = exports.GLOBAL_NARRATIVE_CYCLE_CAP) {
    if (findings.length <= cap)
        return findings;
    return findings.slice(0, cap);
}
/** Resolve wiki-page participant ids for cycle UI links. */
function wikiParticipantIds(finding) {
    const kinds = finding.participantKinds ?? [];
    return finding.participantIds.filter((id, index) => {
        const kind = kinds[index];
        return kind === 'quest' || kind === 'open_thread' || kind === undefined;
    });
}
//# sourceMappingURL=narrativeCircularDependency.js.map