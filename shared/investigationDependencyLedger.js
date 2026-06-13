"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInvestigationDependencyLedger = buildInvestigationDependencyLedger;
/**
 * Layer 5 — investigation dependency ledger + enriched topology projection.
 */
const entityGraph_js_1 = require("./entityGraph.js");
const storyboardEdgeDerivation_js_1 = require("./storyboardEdgeDerivation.js");
const LEAD_THREAD_KINDS = new Set(['mystery', 'foreshadowing', 'promise']);
const NPC_CATEGORY_KEYS = new Set(['characters', 'bestiary', 'ancestries']);
const LOCATION_CATEGORY_KEYS = new Set(['locations', 'maps']);
function formatExplanation(template, sourceTitle, targetTitle) {
    return template.replace('{source}', sourceTitle).replace('{target}', targetTitle);
}
function provenanceFor(relationKind) {
    return storyboardEdgeDerivation_js_1.STORYBOARD_EDGE_PROVENANCE[relationKind];
}
function titleOf(titlesById, id) {
    return titlesById.get(id) ?? 'Untitled';
}
function entityCategory(entityCategoryById, id) {
    return entityCategoryById?.get(id) ?? null;
}
function isNpcCategory(category) {
    return category != null && NPC_CATEGORY_KEYS.has(category.toLowerCase());
}
function isLocationCategory(category) {
    return category != null && LOCATION_CATEGORY_KEYS.has(category.toLowerCase());
}
function columnGroupForTarget(targetId, entityCategoryById, sceneIds, discoveryIds) {
    if (sceneIds.has(targetId))
        return 'scenes';
    if (discoveryIds.has(targetId))
        return 'discoveries';
    const category = entityCategory(entityCategoryById, targetId);
    if (isNpcCategory(category))
        return 'npcs';
    if (isLocationCategory(category))
        return 'locations';
    return null;
}
function edgeKindForClue(clueId, spofClueIds) {
    return spofClueIds.has(clueId) ? 'spof_risk' : 'guaranteed';
}
function pushCell(cells, cell) {
    const exists = cells.some((c) => c.rowId === cell.rowId &&
        c.columnGroup === cell.columnGroup &&
        c.targetId === cell.targetId &&
        c.relationKind === cell.relationKind);
    if (!exists)
        cells.push(cell);
}
function pushEdge(edges, edge) {
    const exists = edges.some((e) => e.sourceId === edge.sourceId &&
        e.targetId === edge.targetId &&
        e.edgeKind === edge.edgeKind);
    if (!exists)
        edges.push(edge);
}
function pushNode(nodes, node) {
    if (!nodes.some((n) => n.id === node.id))
        nodes.push(node);
}
function pushColumn(columns, column) {
    if (!columns.some((c) => c.id === column.id && c.columnGroup === column.columnGroup)) {
        columns.push(column);
    }
}
function isInvestigationScene(scene) {
    return (scene.sceneKind === 'investigation' ||
        scene.linkedCluePageIds.length > 0 ||
        scene.linkedThreadPageIds.length > 0);
}
function isDiscoveryThread(thread) {
    return thread.reachable && thread.threadKind !== 'theory' && !thread.playerSubmitted;
}
function isDiscoveryScene(scene) {
    if (scene.reachable)
        return true;
    return scene.outcomes.some((o) => o.outcomeType === 'information_revealed');
}
function buildInvestigationDependencyLedger(input) {
    const rows = [];
    const columns = [];
    const cells = [];
    const nodes = [];
    const edges = [];
    const investigationScenes = input.scenes.filter(isInvestigationScene);
    const sceneIds = new Set(investigationScenes.map((s) => s.id));
    const discoveryIds = new Set();
    for (const thread of input.threads) {
        if (isDiscoveryThread(thread))
            discoveryIds.add(thread.id);
    }
    for (const scene of investigationScenes) {
        if (isDiscoveryScene(scene))
            discoveryIds.add(scene.id);
        for (const outcome of scene.outcomes) {
            if (outcome.outcomeType === 'information_revealed')
                discoveryIds.add(scene.id);
            if (outcome.outcomeType === 'location_unlock') {
                for (const id of outcome.linkedPageIds ?? [])
                    discoveryIds.add(id);
            }
        }
    }
    for (const thread of input.threads) {
        if (thread.payoffPageId)
            discoveryIds.add(thread.payoffPageId);
    }
    const clueThreads = input.threads.filter((t) => t.threadKind === 'clue' && !t.playerSubmitted);
    const leadThreads = input.threads.filter((t) => LEAD_THREAD_KINDS.has(t.threadKind) &&
        !t.playerSubmitted &&
        (t.relatedPageIds.length > 0 ||
            t.payoffPageId != null ||
            investigationScenes.some((s) => s.linkedThreadPageIds.includes(t.id))));
    for (const scene of investigationScenes) {
        pushColumn(columns, {
            id: scene.id,
            title: scene.title,
            columnGroup: 'scenes',
            reachable: scene.reachable && !input.unreachableIds.has(scene.id),
        });
        pushNode(nodes, {
            id: scene.id,
            kind: 'scene',
            title: scene.title,
            reachable: scene.reachable && !input.unreachableIds.has(scene.id),
            pressureAccumulating: false,
        });
        if (scene.locationPageId) {
            pushColumn(columns, {
                id: scene.locationPageId,
                title: titleOf(input.titlesById, scene.locationPageId),
                columnGroup: 'locations',
                reachable: !input.unreachableIds.has(scene.locationPageId),
            });
            pushNode(nodes, {
                id: scene.locationPageId,
                kind: 'location',
                title: titleOf(input.titlesById, scene.locationPageId),
                reachable: !input.unreachableIds.has(scene.locationPageId),
                pressureAccumulating: false,
            });
        }
        for (const participantId of scene.participantPageIds) {
            if (!isNpcCategory(entityCategory(input.entityCategoryById, participantId)))
                continue;
            pushColumn(columns, {
                id: participantId,
                title: titleOf(input.titlesById, participantId),
                columnGroup: 'npcs',
                reachable: !input.unreachableIds.has(participantId),
            });
            pushNode(nodes, {
                id: participantId,
                kind: 'npc',
                title: titleOf(input.titlesById, participantId),
                reachable: !input.unreachableIds.has(participantId),
                pressureAccumulating: false,
            });
        }
        for (const outcome of scene.outcomes) {
            if (outcome.outcomeType !== 'location_unlock')
                continue;
            for (const locationId of outcome.linkedPageIds ?? []) {
                pushColumn(columns, {
                    id: locationId,
                    title: titleOf(input.titlesById, locationId),
                    columnGroup: 'locations',
                    reachable: !input.unreachableIds.has(locationId),
                });
                pushNode(nodes, {
                    id: locationId,
                    kind: 'unlock',
                    title: titleOf(input.titlesById, locationId),
                    reachable: !input.unreachableIds.has(locationId),
                    pressureAccumulating: false,
                });
            }
        }
    }
    for (const id of discoveryIds) {
        pushColumn(columns, {
            id,
            title: titleOf(input.titlesById, id),
            columnGroup: 'discoveries',
            reachable: !input.unreachableIds.has(id),
        });
        const kind = sceneIds.has(id)
            ? 'revelation'
            : input.threads.some((t) => t.id === id)
                ? 'revelation'
                : 'unlock';
        pushNode(nodes, {
            id,
            kind,
            title: titleOf(input.titlesById, id),
            reachable: !input.unreachableIds.has(id),
            pressureAccumulating: false,
        });
    }
    for (const clue of clueThreads) {
        const isSpof = input.spofClueIds.has(clue.id);
        rows.push({
            id: clue.id,
            kind: 'clue',
            title: clue.title,
            narrativeWeight: clue.narrativeWeight,
            reachable: clue.reachable,
            isSpof,
            pressureAccumulating: !clue.reachable && !input.unreachableIds.has(clue.id),
        });
        pushNode(nodes, {
            id: clue.id,
            kind: 'clue',
            title: clue.title,
            reachable: clue.reachable,
            pressureAccumulating: !clue.reachable && !input.unreachableIds.has(clue.id),
        });
        for (const scene of investigationScenes) {
            if (!scene.linkedCluePageIds.includes(clue.id))
                continue;
            const prov = provenanceFor(entityGraph_js_1.EntityRelationKinds.SCENE_CLUE);
            const edgeKind = edgeKindForClue(clue.id, input.spofClueIds);
            pushCell(cells, {
                rowId: clue.id,
                columnGroup: 'scenes',
                targetId: scene.id,
                relationKind: entityGraph_js_1.EntityRelationKinds.SCENE_CLUE,
                derivationSource: prov.derivationSource,
                explanation: formatExplanation(prov.explanationTemplate, scene.title, clue.title),
                edgeKind,
            });
            pushEdge(edges, {
                sourceId: clue.id,
                targetId: scene.id,
                edgeKind,
            });
            for (const participantId of scene.participantPageIds) {
                if (!isNpcCategory(entityCategory(input.entityCategoryById, participantId)))
                    continue;
                const partProv = provenanceFor(entityGraph_js_1.EntityRelationKinds.SCENE_PARTICIPANT);
                pushCell(cells, {
                    rowId: clue.id,
                    columnGroup: 'npcs',
                    targetId: participantId,
                    relationKind: entityGraph_js_1.EntityRelationKinds.SCENE_PARTICIPANT,
                    derivationSource: partProv.derivationSource,
                    explanation: formatExplanation(partProv.explanationTemplate, scene.title, titleOf(input.titlesById, participantId)),
                    edgeKind,
                });
                pushEdge(edges, { sourceId: clue.id, targetId: participantId, edgeKind });
            }
            if (scene.locationPageId) {
                const locProv = provenanceFor(entityGraph_js_1.EntityRelationKinds.SCENE_LOCATION);
                pushCell(cells, {
                    rowId: clue.id,
                    columnGroup: 'locations',
                    targetId: scene.locationPageId,
                    relationKind: entityGraph_js_1.EntityRelationKinds.SCENE_LOCATION,
                    derivationSource: locProv.derivationSource,
                    explanation: formatExplanation(locProv.explanationTemplate, scene.title, titleOf(input.titlesById, scene.locationPageId)),
                    edgeKind,
                });
                pushEdge(edges, {
                    sourceId: clue.id,
                    targetId: scene.locationPageId,
                    edgeKind,
                });
            }
            for (const outcome of scene.outcomes) {
                if (outcome.outcomeType !== 'location_unlock')
                    continue;
                for (const locationId of outcome.linkedPageIds ?? []) {
                    pushCell(cells, {
                        rowId: clue.id,
                        columnGroup: 'locations',
                        targetId: locationId,
                        relationKind: 'SCENE_OUTCOME_LOCATION_UNLOCK',
                        derivationSource: 'outcomes[].linkedPageIds',
                        explanation: `${scene.title} unlocks ${titleOf(input.titlesById, locationId)}`,
                        edgeKind,
                    });
                    pushEdge(edges, { sourceId: clue.id, targetId: locationId, edgeKind });
                }
            }
            if (isDiscoveryScene(scene) || scene.reachable) {
                pushCell(cells, {
                    rowId: clue.id,
                    columnGroup: 'discoveries',
                    targetId: scene.id,
                    relationKind: 'INVESTIGATION_DISCOVERY',
                    derivationSource: 'lifecycle + information_revealed outcomes',
                    explanation: `${clue.title} discovery surfaced in ${scene.title}`,
                    edgeKind: clue.reachable ? 'guaranteed' : 'optional',
                });
            }
        }
        for (const relatedId of clue.relatedPageIds) {
            const group = columnGroupForTarget(relatedId, input.entityCategoryById, sceneIds, discoveryIds);
            if (!group || group === 'discoveries')
                continue;
            const prov = provenanceFor(entityGraph_js_1.EntityRelationKinds.THREAD_RELATED);
            pushCell(cells, {
                rowId: clue.id,
                columnGroup: group,
                targetId: relatedId,
                relationKind: entityGraph_js_1.EntityRelationKinds.THREAD_RELATED,
                derivationSource: prov.derivationSource,
                explanation: formatExplanation(prov.explanationTemplate, clue.title, titleOf(input.titlesById, relatedId)),
                edgeKind: edgeKindForClue(clue.id, input.spofClueIds),
            });
            pushEdge(edges, {
                sourceId: clue.id,
                targetId: relatedId,
                edgeKind: edgeKindForClue(clue.id, input.spofClueIds),
            });
        }
        if (clue.payoffPageId) {
            pushCell(cells, {
                rowId: clue.id,
                columnGroup: 'discoveries',
                targetId: clue.payoffPageId,
                relationKind: entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF,
                derivationSource: provenanceFor(entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF).derivationSource,
                explanation: formatExplanation(provenanceFor(entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF).explanationTemplate, clue.title, titleOf(input.titlesById, clue.payoffPageId)),
                edgeKind: edgeKindForClue(clue.id, input.spofClueIds),
            });
        }
    }
    for (const lead of leadThreads) {
        rows.push({
            id: lead.id,
            kind: 'lead',
            title: lead.title,
            narrativeWeight: lead.narrativeWeight,
            reachable: lead.reachable,
            isSpof: false,
            pressureAccumulating: !lead.reachable && !input.unreachableIds.has(lead.id),
        });
        pushNode(nodes, {
            id: lead.id,
            kind: 'lead',
            title: lead.title,
            reachable: lead.reachable,
            pressureAccumulating: !lead.reachable && !input.unreachableIds.has(lead.id),
        });
        for (const scene of investigationScenes) {
            if (!scene.linkedThreadPageIds.includes(lead.id))
                continue;
            const prov = provenanceFor(entityGraph_js_1.EntityRelationKinds.SCENE_THREAD);
            pushCell(cells, {
                rowId: lead.id,
                columnGroup: 'scenes',
                targetId: scene.id,
                relationKind: entityGraph_js_1.EntityRelationKinds.SCENE_THREAD,
                derivationSource: prov.derivationSource,
                explanation: formatExplanation(prov.explanationTemplate, scene.title, lead.title),
                edgeKind: 'guaranteed',
            });
            pushEdge(edges, { sourceId: lead.id, targetId: scene.id, edgeKind: 'guaranteed' });
        }
        for (const relatedId of lead.relatedPageIds) {
            const targetTitle = titleOf(input.titlesById, relatedId);
            const prov = provenanceFor(entityGraph_js_1.EntityRelationKinds.THREAD_RELATED);
            const edgeKind = input.spofClueIds.has(relatedId)
                ? 'spof_risk'
                : 'guaranteed';
            if (input.threads.some((t) => t.id === relatedId && t.threadKind === 'clue')) {
                pushCell(cells, {
                    rowId: lead.id,
                    columnGroup: 'discoveries',
                    targetId: relatedId,
                    relationKind: entityGraph_js_1.EntityRelationKinds.THREAD_RELATED,
                    derivationSource: prov.derivationSource,
                    explanation: formatExplanation(prov.explanationTemplate, lead.title, targetTitle),
                    edgeKind,
                });
                pushEdge(edges, { sourceId: lead.id, targetId: relatedId, edgeKind });
                continue;
            }
            const group = columnGroupForTarget(relatedId, input.entityCategoryById, sceneIds, discoveryIds);
            if (!group || group === 'discoveries')
                continue;
            pushCell(cells, {
                rowId: lead.id,
                columnGroup: group,
                targetId: relatedId,
                relationKind: entityGraph_js_1.EntityRelationKinds.THREAD_RELATED,
                derivationSource: prov.derivationSource,
                explanation: formatExplanation(prov.explanationTemplate, lead.title, targetTitle),
                edgeKind,
            });
            pushEdge(edges, { sourceId: lead.id, targetId: relatedId, edgeKind });
        }
        if (lead.payoffPageId) {
            pushCell(cells, {
                rowId: lead.id,
                columnGroup: 'discoveries',
                targetId: lead.payoffPageId,
                relationKind: entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF,
                derivationSource: provenanceFor(entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF).derivationSource,
                explanation: formatExplanation(provenanceFor(entityGraph_js_1.EntityRelationKinds.THREAD_PAYOFF).explanationTemplate, lead.title, titleOf(input.titlesById, lead.payoffPageId)),
                edgeKind: 'guaranteed',
            });
        }
    }
    rows.sort((a, b) => {
        if (a.kind !== b.kind)
            return a.kind === 'clue' ? -1 : 1;
        return a.title.localeCompare(b.title);
    });
    const columnOrder = [
        'scenes',
        'npcs',
        'locations',
        'discoveries',
    ];
    columns.sort((a, b) => {
        const groupDiff = columnOrder.indexOf(a.columnGroup) - columnOrder.indexOf(b.columnGroup);
        if (groupDiff !== 0)
            return groupDiff;
        return a.title.localeCompare(b.title);
    });
    return {
        rows,
        columns,
        cells,
        legend: {
            edgeKinds: ['guaranteed', 'optional', 'spof_risk'],
            columnGroups: columnOrder,
        },
        nodes,
        edges,
    };
}
//# sourceMappingURL=investigationDependencyLedger.js.map