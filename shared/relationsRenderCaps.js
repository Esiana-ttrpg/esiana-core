"use strict";
/**
 * Relations workspace render safety caps (browser-safe).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECTION_DERIVED = exports.RELATIONS_RENDER_CAP_LIMITS = exports.RELATIONS_RENDER_CAP_DEFAULTS = void 0;
exports.clampCap = clampCap;
exports.resolveRelationsRenderCaps = resolveRelationsRenderCaps;
exports.buildRelationsTruncation = buildRelationsTruncation;
exports.truncationUserMessage = truncationUserMessage;
exports.RELATIONS_RENDER_CAP_DEFAULTS = {
    maxVisibleNodes: 50,
    maxVisibleEdges: 80,
};
exports.RELATIONS_RENDER_CAP_LIMITS = {
    minNodes: 20,
    maxNodes: 100,
    minEdges: 40,
    maxEdges: 200,
};
exports.PROJECTION_DERIVED = {
    maxBlocCount: 12,
    maxMembersPerBloc: 15,
    maxNarrativeBullets: 5,
    maxTopActorsPerTension: 3,
};
function clampCap(value, fallback, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(value)));
}
function resolveRelationsRenderCaps(input) {
    return {
        maxVisibleNodes: clampCap(input?.relationsMaxVisibleNodes, exports.RELATIONS_RENDER_CAP_DEFAULTS.maxVisibleNodes, exports.RELATIONS_RENDER_CAP_LIMITS.minNodes, exports.RELATIONS_RENDER_CAP_LIMITS.maxNodes),
        maxVisibleEdges: clampCap(input?.relationsMaxVisibleEdges, exports.RELATIONS_RENDER_CAP_DEFAULTS.maxVisibleEdges, exports.RELATIONS_RENDER_CAP_LIMITS.minEdges, exports.RELATIONS_RENDER_CAP_LIMITS.maxEdges),
    };
}
function buildRelationsTruncation(input) {
    const hiddenNodes = Math.max(0, input.totalNodes - input.visibleNodes);
    const hiddenEdges = Math.max(0, input.totalEdges - input.visibleEdges);
    const reasons = [...(input.reasons ?? [])];
    if (hiddenNodes > 0 && !reasons.includes('node_cap')) {
        reasons.push('node_cap');
    }
    if (hiddenEdges > 0 && !reasons.includes('edge_cap') && !reasons.includes('cluster')) {
        reasons.push('edge_cap');
    }
    let truncationReason = 'none';
    if (reasons.length > 0) {
        truncationReason = reasons[0];
    }
    else if (hiddenEdges > 0) {
        truncationReason = 'edge_cap';
    }
    else if (hiddenNodes > 0) {
        truncationReason = 'node_cap';
    }
    return {
        visibleNodes: input.visibleNodes,
        hiddenNodes,
        visibleEdges: input.visibleEdges,
        hiddenEdges,
        appliedNodeCap: input.caps.maxVisibleNodes,
        appliedEdgeCap: input.caps.maxVisibleEdges,
        truncationReason,
        truncationReasons: reasons.length > 0 ? reasons : undefined,
    };
}
function truncationUserMessage(truncation) {
    const { truncationReason, hiddenNodes, hiddenEdges } = truncation;
    if (truncationReason === 'none')
        return null;
    if (truncationReason === 'node_cap' || truncationReason === 'edge_cap') {
        if (hiddenNodes > 0)
            return `+${hiddenNodes} more connections hidden`;
        if (hiddenEdges > 0)
            return `+${hiddenEdges} more ties hidden`;
    }
    if (truncationReason === 'bloc_cap')
        return `+${hiddenNodes} more factions not shown`;
    if (truncationReason === 'member_cap')
        return `+${hiddenNodes} more members in this faction`;
    if (truncationReason === 'cluster' && hiddenEdges > 0) {
        return `${hiddenEdges} supporting ties summarized`;
    }
    return null;
}
//# sourceMappingURL=relationsRenderCaps.js.map