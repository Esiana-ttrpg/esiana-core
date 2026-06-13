"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELATIONS_PROJECTION_VERSION = void 0;
exports.buildNarrativeSummary = buildNarrativeSummary;
exports.projectSocialRelations = projectSocialRelations;
exports.projectStructureRelations = projectStructureRelations;
exports.projectKinshipRelations = projectKinshipRelations;
exports.projectRelationsLens = projectRelationsLens;
const entityGraph_js_1 = require("./entityGraph.js");
const narrativeRelationSemantics_js_1 = require("./narrativeRelationSemantics.js");
const relationsRenderCaps_js_1 = require("./relationsRenderCaps.js");
exports.RELATIONS_PROJECTION_VERSION = 'relations-projection-v1';
function previewTitle(previews, pageId) {
    const key = (0, entityGraph_js_1.nodeRefKey)({
        entityType: entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE,
        entityId: pageId,
    });
    return previews.get(key)?.title ?? 'Unknown';
}
function previewCodex(previews, pageId) {
    const key = (0, entityGraph_js_1.nodeRefKey)({
        entityType: entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE,
        entityId: pageId,
    });
    return previews.get(key)?.codexType ?? null;
}
function standingLabel(trust) {
    if (trust >= 60)
        return 'Trusted';
    if (trust >= 35)
        return 'Friendly';
    if (trust >= 15)
        return 'Neutral';
    if (trust >= -15)
        return 'Wary';
    if (trust >= -40)
        return 'Hostile';
    return 'Hated';
}
function stanceLabel(stance) {
    const s = stance.trim().toUpperCase();
    if (s === 'ALLY')
        return 'allied';
    if (s === 'HOSTILE' || s === 'SECRET_HOSTILE')
        return 'hostile';
    if (s === 'VASSAL')
        return 'vassal';
    if (s === 'AT_WAR')
        return 'at war';
    return 'neutral';
}
function buildNarrativeSummary(input) {
    const bullets = [];
    for (const tension of input.tensions.slice(0, 2)) {
        if (tension.polarity === 'negative') {
            bullets.push(`${tension.sourceBlocTitle} is escalating tensions with ${tension.targetBlocTitle}.`);
        }
        else if (tension.polarity === 'positive') {
            bullets.push(`${tension.sourceBlocTitle} maintains an alliance with ${tension.targetBlocTitle}.`);
        }
    }
    for (const standing of input.partyStandings.slice(0, 2)) {
        if (standing.trust >= 35) {
            bullets.push(`The party is ${standing.label.toLowerCase()} by ${standing.blocTitle}.`);
        }
        else if (standing.trust <= -15) {
            bullets.push(`The party is ${standing.label.toLowerCase()} to ${standing.blocTitle}.`);
        }
    }
    for (const conflict of input.conflicts.slice(0, 2)) {
        bullets.push(conflict.description);
    }
    const capped = bullets.slice(0, relationsRenderCaps_js_1.PROJECTION_DERIVED.maxNarrativeBullets);
    if (capped.length === 0) {
        capped.push('No major tensions recorded at this time.');
    }
    return {
        headline: input.headline ?? 'Current Situation',
        bullets: capped,
        at: input.at,
    };
}
function collectBlocAffiliations(edges) {
    const map = new Map();
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION)
            continue;
        if (edge.source.entityType !== entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE ||
            edge.target.entityType !== entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE) {
            continue;
        }
        const orgId = edge.target.entityId;
        const charId = edge.source.entityId;
        if (!map.has(orgId))
            map.set(orgId, new Set());
        map.get(orgId).add(charId);
    }
    return map;
}
function buildBlocSummaries(orgPages, affiliations, reputationByFaction, previews, maxBlocs) {
    const all = orgPages.map((org) => {
        const rep = reputationByFaction[org.id];
        const trust = rep?.trust ?? null;
        return {
            id: org.id,
            title: org.title,
            codexType: previewCodex(previews, org.id) ?? org.templateType,
            memberCount: affiliations.get(org.id)?.size ?? 0,
            partyTrust: trust,
            partyNotoriety: rep?.notoriety ?? null,
            standingLabel: trust !== null ? standingLabel(trust) : null,
        };
    });
    all.sort((a, b) => b.memberCount - a.memberCount);
    const visible = all.slice(0, maxBlocs);
    return { blocs: visible, hiddenBlocs: Math.max(0, all.length - visible.length) };
}
function buildAggregatedTensions(edges, previews) {
    const diplomatic = edges.filter((e) => e.relationKind === entityGraph_js_1.EntityRelationKinds.ORG_DIPLOMATIC);
    const map = new Map();
    for (const edge of diplomatic) {
        if (edge.source.entityType !== entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE ||
            edge.target.entityType !== entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE) {
            continue;
        }
        const stance = edge.payload?.kind === entityGraph_js_1.EntityRelationKinds.ORG_DIPLOMATIC
            ? edge.payload.stance
            : 'NEUTRAL';
        const key = [edge.source.entityId, edge.target.entityId].sort().join('|');
        const existing = map.get(key);
        const polarity = (0, narrativeRelationSemantics_js_1.stanceToPolarity)(stance);
        if (existing) {
            existing.supportingEdgeCount += 1;
        }
        else {
            map.set(key, {
                id: key,
                sourceBlocId: edge.source.entityId,
                sourceBlocTitle: previewTitle(previews, edge.source.entityId),
                targetBlocId: edge.target.entityId,
                targetBlocTitle: previewTitle(previews, edge.target.entityId),
                polarity,
                stance: stanceLabel(stance),
                supportingEdgeCount: 1,
                topActors: [],
            });
        }
    }
    const tensions = [...map.values()].sort((a, b) => b.supportingEdgeCount - a.supportingEdgeCount);
    return {
        tensions,
        totalEdgeCount: diplomatic.length,
        aggregatedHidden: Math.max(0, diplomatic.length - tensions.length),
    };
}
function buildPartyStandings(blocs) {
    return blocs
        .filter((b) => b.partyTrust !== null)
        .map((b) => ({
        blocId: b.id,
        blocTitle: b.title,
        trust: b.partyTrust,
        notoriety: b.partyNotoriety ?? 0,
        label: b.standingLabel ?? standingLabel(b.partyTrust),
    }))
        .sort((a, b) => b.trust - a.trust);
}
function buildConflicts(tensions, edges, previews) {
    const items = [];
    for (const t of tensions) {
        if (t.polarity !== 'negative')
            continue;
        items.push({
            id: t.id,
            title: `${t.sourceBlocTitle} ↔ ${t.targetBlocTitle}`,
            description: `${t.sourceBlocTitle} is ${t.stance} toward ${t.targetBlocTitle}.`,
            polarity: 'negative',
            entityIds: [t.sourceBlocId, t.targetBlocId],
        });
    }
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL)
            continue;
        const payload = edge.payload;
        if (payload?.kind !== entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL)
            continue;
        const sem = payload.semantics;
        if (sem?.polarity !== 'negative' && payload.narrativeType !== 'rival')
            continue;
        items.push({
            id: edge.id,
            title: previewTitle(previews, edge.target.entityId),
            description: `Active rivalry involving ${previewTitle(previews, edge.source.entityId)}.`,
            polarity: 'negative',
            entityIds: [edge.source.entityId, edge.target.entityId],
        });
    }
    return items.slice(0, 10);
}
function buildClusterMembers(blocId, edges, previews, cap) {
    const members = [];
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION)
            continue;
        if (edge.target.entityId !== blocId)
            continue;
        const role = edge.payload?.kind === entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION
            ? edge.payload.role ?? null
            : null;
        members.push({
            id: edge.source.entityId,
            title: previewTitle(previews, edge.source.entityId),
            role,
            codexType: previewCodex(previews, edge.source.entityId),
        });
    }
    members.sort((a, b) => a.title.localeCompare(b.title));
    return {
        members: members.slice(0, cap),
        hidden: Math.max(0, members.length - cap),
    };
}
function buildConnectionGraph(focusEntityId, edges, previews, caps, affiliations) {
    const nodeIds = new Set([focusEntityId]);
    const relevantEdges = [];
    for (const edge of edges) {
        const involvesFocus = (edge.source.entityType === entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE &&
            edge.source.entityId === focusEntityId) ||
            (edge.target.entityType === entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE &&
                edge.target.entityId === focusEntityId);
        if (!involvesFocus)
            continue;
        relevantEdges.push(edge);
        if (edge.source.entityType === entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE) {
            nodeIds.add(edge.source.entityId);
        }
        if (edge.target.entityType === entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE) {
            nodeIds.add(edge.target.entityId);
        }
    }
    const allNodeIds = [...nodeIds];
    const visibleIds = allNodeIds.slice(0, caps.maxVisibleNodes);
    const charToBloc = new Map();
    for (const [orgId, chars] of affiliations) {
        for (const charId of chars)
            charToBloc.set(charId, orgId);
    }
    const nodes = visibleIds.map((id, index) => {
        const count = visibleIds.length;
        const angle = (index / Math.max(count, 1)) * Math.PI * 2;
        const radius = id === focusEntityId ? 0 : 120 + (index % 3) * 40;
        return {
            id,
            title: previewTitle(previews, id),
            codexType: previewCodex(previews, id),
            angle,
            radius,
            blocId: charToBloc.get(id) ?? null,
        };
    });
    const visibleSet = new Set(visibleIds);
    const connectionEdges = [];
    for (const edge of relevantEdges) {
        const src = edge.source.entityType === entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE
            ? edge.source.entityId
            : null;
        const tgt = edge.target.entityType === entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE
            ? edge.target.entityId
            : null;
        if (!src || !tgt || !visibleSet.has(src) || !visibleSet.has(tgt))
            continue;
        let polarity = 'neutral';
        if (edge.relationKind === entityGraph_js_1.EntityRelationKinds.ORG_DIPLOMATIC && edge.payload?.kind === entityGraph_js_1.EntityRelationKinds.ORG_DIPLOMATIC) {
            polarity = (0, narrativeRelationSemantics_js_1.stanceToPolarity)(edge.payload.stance);
        }
        else if (edge.payload?.kind === entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL) {
            polarity = edge.payload.semantics?.polarity ?? 'neutral';
        }
        connectionEdges.push({
            id: edge.id,
            sourceId: src,
            targetId: tgt,
            polarity,
            relationKind: edge.relationKind,
            inferred: edge.payload?.kind === entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL
                ? edge.payload.semantics?.provenance === 'inferred'
                : false,
        });
        if (connectionEdges.length >= caps.maxVisibleEdges)
            break;
    }
    return {
        nodes,
        connectionEdges,
        totalNodes: allNodeIds.length,
        totalEdges: relevantEdges.length,
    };
}
function projectSocialRelations(input) {
    const { window, caps, edges, nodePreviews, orgPages, reputationByFaction } = input;
    const affiliations = collectBlocAffiliations(edges);
    const { blocs, hiddenBlocs } = buildBlocSummaries(orgPages, affiliations, reputationByFaction, nodePreviews, relationsRenderCaps_js_1.PROJECTION_DERIVED.maxBlocCount);
    const { tensions, totalEdgeCount, aggregatedHidden } = buildAggregatedTensions(edges, nodePreviews);
    const partyStandings = buildPartyStandings(blocs);
    const conflicts = buildConflicts(tensions, edges, nodePreviews);
    let members = [];
    let connectionNodes = [];
    let connectionEdges = [];
    let visibleNodes = blocs.length;
    let totalNodes = blocs.length + hiddenBlocs;
    let visibleEdges = tensions.length;
    let totalEdges = totalEdgeCount;
    const truncationReasons = [];
    if (aggregatedHidden > 0)
        truncationReasons.push('cluster');
    if (hiddenBlocs > 0)
        truncationReasons.push('bloc_cap');
    if (window.level === 'cluster' && window.focus.kind === 'bloc') {
        const { members: clusterMembers, hidden } = buildClusterMembers(window.focus.blocId, edges, nodePreviews, relationsRenderCaps_js_1.PROJECTION_DERIVED.maxMembersPerBloc);
        members = clusterMembers;
        visibleNodes = members.length;
        totalNodes = members.length + hidden;
        if (hidden > 0)
            truncationReasons.push('member_cap');
    }
    if (window.level === 'entity' && window.focus.kind === 'wiki_page') {
        const graph = buildConnectionGraph(window.focus.entityId, edges, nodePreviews, caps, affiliations);
        connectionNodes = graph.nodes;
        connectionEdges = graph.connectionEdges;
        visibleNodes = graph.nodes.length;
        totalNodes = graph.totalNodes;
        visibleEdges = graph.connectionEdges.length;
        totalEdges = graph.totalEdges;
    }
    const narrativeSummary = buildNarrativeSummary({
        at: window.at,
        tensions,
        partyStandings,
        conflicts,
    });
    const truncation = (0, relationsRenderCaps_js_1.buildRelationsTruncation)({
        visibleNodes,
        totalNodes,
        visibleEdges,
        totalEdges,
        caps,
        reasons: truncationReasons,
    });
    return {
        lens: 'social',
        mode: window.mode || 'blocs',
        level: window.level,
        narrativeSummary,
        blocs,
        tensions,
        partyStandings,
        conflicts,
        members,
        connectionNodes,
        connectionEdges,
        truncation,
        focus: window,
    };
}
function buildInstitutionalOverviewNodes(orgPages, edges, nodePreviews, cap) {
    const nodes = [];
    for (const org of orgPages.slice(0, cap)) {
        const members = edges.filter((edge) => edge.relationKind === entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION &&
            edge.target.entityId === org.id).length;
        const subordinates = edges.filter((edge) => edge.relationKind === entityGraph_js_1.EntityRelationKinds.ORG_PARENT &&
            edge.source.entityId === org.id).length;
        const leaders = edges.filter((edge) => edge.relationKind === entityGraph_js_1.EntityRelationKinds.ORG_LEADER &&
            edge.source.entityId === org.id).length;
        nodes.push({
            id: org.id,
            title: org.title || previewTitle(nodePreviews, org.id),
            role: members + subordinates + leaders > 0
                ? `${members} members · ${subordinates} sub-orgs · ${leaders} leaders`
                : 'Organization',
            depth: 0,
            parentId: null,
        });
    }
    return nodes;
}
function projectStructureRelations(input) {
    const { window, caps, edges, nodePreviews, orgPages } = input;
    const mode = window.mode || 'chain';
    const nodes = [];
    const rootId = window.focus.kind === 'bloc'
        ? window.focus.blocId
        : window.focus.kind === 'wiki_page'
            ? window.focus.entityId
            : null;
    if (!rootId && mode === 'institutional') {
        nodes.push(...buildInstitutionalOverviewNodes(orgPages, edges, nodePreviews, relationsRenderCaps_js_1.PROJECTION_DERIVED.maxBlocCount));
    }
    else if (rootId) {
        nodes.push({
            id: rootId,
            title: previewTitle(nodePreviews, rootId),
            role: 'Leader',
            depth: 0,
            parentId: null,
        });
        for (const edge of edges) {
            if (edge.relationKind === entityGraph_js_1.EntityRelationKinds.ORG_LEADER && edge.source.entityId === rootId) {
                nodes.push({
                    id: edge.target.entityId,
                    title: previewTitle(nodePreviews, edge.target.entityId),
                    role: 'Leader',
                    depth: 1,
                    parentId: rootId,
                });
            }
            if (edge.relationKind === entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION &&
                edge.target.entityId === rootId) {
                const role = edge.payload?.kind === entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION
                    ? (edge.payload.role ?? null)
                    : null;
                nodes.push({
                    id: edge.source.entityId,
                    title: previewTitle(nodePreviews, edge.source.entityId),
                    role,
                    depth: 1,
                    parentId: rootId,
                });
            }
            if (edge.relationKind === entityGraph_js_1.EntityRelationKinds.ORG_PARENT && edge.source.entityId === rootId) {
                nodes.push({
                    id: edge.target.entityId,
                    title: previewTitle(nodePreviews, edge.target.entityId),
                    role: 'Subordinate org',
                    depth: 1,
                    parentId: rootId,
                });
            }
        }
    }
    const visible = nodes.slice(0, caps.maxVisibleNodes);
    const narrativeSummary = buildNarrativeSummary({
        headline: 'Institutional Structure',
        at: window.at,
        tensions: [],
        partyStandings: [],
        conflicts: [],
    });
    if (visible.length === 0) {
        narrativeSummary.bullets =
            mode === 'institutional'
                ? ['No organizations recorded for an institutional overview.']
                : ['Select an organization focus to explore its command structure.'];
    }
    else if (mode === 'institutional' && !rootId) {
        narrativeSummary.bullets = [
            `${visible.length} organizations appear in the institutional map.`,
            'Explore an organization to see its command chain.',
        ];
    }
    else {
        narrativeSummary.bullets = [
            `${visible[0].title} anchors the current institutional view.`,
            `${Math.max(0, visible.length - 1)} related roles and subordinates are visible.`,
        ];
    }
    return {
        lens: 'structure',
        mode,
        level: window.level,
        narrativeSummary,
        nodes: visible,
        truncation: (0, relationsRenderCaps_js_1.buildRelationsTruncation)({
            visibleNodes: visible.length,
            totalNodes: nodes.length,
            visibleEdges: 0,
            totalEdges: 0,
            caps,
            reasons: nodes.length > visible.length ? ['node_cap'] : undefined,
        }),
        focus: window,
    };
}
function assignKinshipGenerations(memberIds, kinshipEdges) {
    const parentOf = new Map();
    for (const edge of kinshipEdges) {
        if (edge.linkKind !== 'parent')
            continue;
        parentOf.set(edge.sourceId, edge.targetId);
    }
    const generations = new Map();
    const queue = [];
    for (const id of memberIds) {
        if (!parentOf.has(id)) {
            generations.set(id, 0);
            queue.push(id);
        }
    }
    if (queue.length === 0 && memberIds.length > 0) {
        generations.set(memberIds[0], 0);
        queue.push(memberIds[0]);
    }
    while (queue.length > 0) {
        const current = queue.shift();
        const gen = generations.get(current) ?? 0;
        for (const edge of kinshipEdges) {
            if (edge.linkKind !== 'parent' || edge.targetId !== current)
                continue;
            const childId = edge.sourceId;
            if (generations.has(childId))
                continue;
            generations.set(childId, gen + 1);
            queue.push(childId);
        }
    }
    for (const id of memberIds) {
        if (!generations.has(id))
            generations.set(id, 0);
    }
    return generations;
}
function projectKinshipRelations(input) {
    const { window, caps, edges, nodePreviews } = input;
    const memberIdSet = new Set();
    const kinshipEdges = [];
    const focusFamilyId = window.focus.kind === 'bloc' ? window.focus.blocId : null;
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.CHARACTER_LINEAGE)
            continue;
        const payload = edge.payload;
        const relationshipType = payload?.kind === entityGraph_js_1.EntityRelationKinds.CHARACTER_LINEAGE
            ? payload.relationshipType
            : 'OTHER';
        const linkKind = payload?.kind === entityGraph_js_1.EntityRelationKinds.CHARACTER_LINEAGE
            ? payload.linkKind ?? 'parent'
            : 'parent';
        kinshipEdges.push({
            id: edge.id,
            sourceId: edge.source.entityId,
            targetId: edge.target.entityId,
            relationshipType,
            linkKind,
        });
        memberIdSet.add(edge.source.entityId);
        memberIdSet.add(edge.target.entityId);
    }
    const generationById = assignKinshipGenerations([...memberIdSet], kinshipEdges);
    const members = [...memberIdSet]
        .map((id) => ({
        id,
        title: previewTitle(nodePreviews, id),
        generation: generationById.get(id) ?? 0,
        lineageRole: null,
    }))
        .sort((a, b) => a.generation - b.generation || a.title.localeCompare(b.title));
    const visibleMembers = members.slice(0, caps.maxVisibleNodes);
    const visibleEdges = kinshipEdges.slice(0, caps.maxVisibleEdges);
    const mode = window.mode || 'generations';
    const successionEdges = kinshipEdges.filter((edge) => {
        const upper = edge.relationshipType.trim().toUpperCase();
        return upper === 'SUCCESSOR' || upper === 'HEIR';
    });
    const narrativeSummary = buildNarrativeSummary({
        headline: mode === 'succession' ? 'Line of Succession' : 'Kinship & Legacy',
        at: window.at,
        tensions: [],
        partyStandings: [],
        conflicts: [],
    });
    if (visibleMembers.length === 0) {
        narrativeSummary.bullets = ['No lineage links recorded for this focus.'];
    }
    else if (mode === 'succession') {
        if (successionEdges.length === 0) {
            narrativeSummary.bullets = [
                'No explicit succession or heir links are recorded.',
                `${visibleMembers.length} figures appear in the broader lineage view.`,
            ];
        }
        else {
            const lead = successionEdges[0];
            narrativeSummary.bullets = [
                `${previewTitle(nodePreviews, lead.sourceId)} is marked as ${lead.relationshipType.toLowerCase()} to ${previewTitle(nodePreviews, lead.targetId)}.`,
                `${successionEdges.length} succession tie${successionEdges.length === 1 ? '' : 's'} are visible.`,
            ];
        }
    }
    else {
        narrativeSummary.bullets = [
            `${visibleMembers.length} figures appear across ${new Set(visibleMembers.map((m) => m.generation)).size} generations.`,
        ];
        if (focusFamilyId) {
            narrativeSummary.bullets.push(`Exploring heritage connections for ${previewTitle(nodePreviews, focusFamilyId)}.`);
        }
    }
    return {
        lens: 'kinship',
        mode,
        level: window.level,
        narrativeSummary,
        members: visibleMembers,
        edges: visibleEdges,
        truncation: (0, relationsRenderCaps_js_1.buildRelationsTruncation)({
            visibleNodes: visibleMembers.length,
            totalNodes: members.length,
            visibleEdges: visibleEdges.length,
            totalEdges: kinshipEdges.length,
            caps,
        }),
        focus: window,
    };
}
function projectRelationsLens(input) {
    if (input.window.lens === 'structure') {
        return projectStructureRelations(input);
    }
    if (input.window.lens === 'kinship') {
        return projectKinshipRelations(input);
    }
    return projectSocialRelations(input);
}
//# sourceMappingURL=relationshipLensProjections.js.map