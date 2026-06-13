"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.augmentWithInferredRelationEdges = augmentWithInferredRelationEdges;
/**
 * Runtime inferred edges for Relations projections (not persisted to EntityRelation).
 */
const entityGraph_js_1 = require("./entityGraph.js");
const MAX_SHARED_FACTION_PAIRS = 48;
function socialPairKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}
function hasExplicitSocial(edges, a, b) {
    const key = socialPairKey(a, b);
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL)
            continue;
        const pair = socialPairKey(edge.source.entityId, edge.target.entityId);
        if (pair === key)
            return true;
    }
    return false;
}
/**
 * Infer weak CHARACTER_SOCIAL ties between characters sharing an affiliation org.
 */
function augmentWithInferredRelationEdges(edges) {
    const byOrg = new Map();
    for (const edge of edges) {
        if (edge.relationKind !== entityGraph_js_1.EntityRelationKinds.CHARACTER_AFFILIATION)
            continue;
        if (edge.target.entityType !== entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE)
            continue;
        const orgId = edge.target.entityId;
        const charId = edge.source.entityId;
        const list = byOrg.get(orgId) ?? [];
        list.push(charId);
        byOrg.set(orgId, list);
    }
    const inferred = [];
    for (const [orgId, members] of byOrg) {
        const unique = [...new Set(members)].sort();
        if (unique.length < 2)
            continue;
        for (let i = 0; i < unique.length && inferred.length < MAX_SHARED_FACTION_PAIRS; i++) {
            for (let j = i + 1; j < unique.length && inferred.length < MAX_SHARED_FACTION_PAIRS; j++) {
                const a = unique[i];
                const b = unique[j];
                if (hasExplicitSocial(edges, a, b))
                    continue;
                const id = `inferred:shared_faction:${a}:${b}`;
                inferred.push({
                    id,
                    source: { entityType: entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE, entityId: a },
                    target: { entityType: entityGraph_js_1.EntityGraphEntityTypes.WIKI_PAGE, entityId: b },
                    relationKind: entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL,
                    direction: entityGraph_js_1.EntityRelationDirections.UNDIRECTED,
                    startDate: null,
                    endDate: null,
                    visibility: null,
                    payload: {
                        kind: entityGraph_js_1.EntityRelationKinds.CHARACTER_SOCIAL,
                        narrativeType: 'member',
                        semantics: {
                            narrativeType: 'member',
                            polarity: 'neutral',
                            provenance: 'inferred',
                            inferenceSource: 'shared_faction',
                            context: `Shared affiliation (${orgId})`,
                        },
                    },
                    sourceDomain: entityGraph_js_1.EntityRelationSourceDomains.WIKI_METADATA,
                    sourceRecordKey: id,
                    sourcePageId: a,
                });
            }
        }
    }
    return inferred.length > 0 ? [...edges, ...inferred] : edges;
}
//# sourceMappingURL=inferredRelationEdges.js.map