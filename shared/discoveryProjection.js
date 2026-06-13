"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryStates = exports.RevelationSourceTypes = void 0;
exports.isEntityDiscovered = isEntityDiscovered;
exports.resolvePresenceState = resolvePresenceState;
exports.projectPageDiscovery = projectPageDiscovery;
exports.partitionByDiscovery = partitionByDiscovery;
exports.projectBrowseSummary = projectBrowseSummary;
exports.filterClaimsForPartyKnowledge = filterClaimsForPartyKnowledge;
exports.computeIsContested = computeIsContested;
exports.computePartyKnowledgeGroups = computePartyKnowledgeGroups;
exports.inferRevelationSource = inferRevelationSource;
exports.serializeClaimRevelation = serializeClaimRevelation;
exports.serializePresenceRevelation = serializePresenceRevelation;
exports.emptyPartyKnowledgeGroups = emptyPartyKnowledgeGroups;
exports.projectDiscoveryState = projectDiscoveryState;
exports.isDiscoveryAvailable = isDiscoveryAvailable;
/**
 * Phase 23 — discovery projection contract.
 * Single shape for browse, search, links, inspector, and future surfaces.
 */
const contentPresence_js_1 = require("./contentPresence.js");
const loreKnowledge_js_1 = require("./loreKnowledge.js");
exports.RevelationSourceTypes = {
    SESSION: 'SESSION',
    MANUAL: 'MANUAL',
    IMPORT: 'IMPORT',
    QUEST: 'QUEST',
    SCENE: 'SCENE',
    RUMOR: 'RUMOR',
};
exports.DiscoveryStates = {
    HIDDEN: 'hidden',
    RUMOR: 'rumor',
    PARTIAL: 'partial',
    CONTESTED: 'contested',
    KNOWN: 'known',
};
const PARTY_VISIBLE_KNOWLEDGE_STATES = [
    loreKnowledge_js_1.KnowledgeStates.KNOWN,
    loreKnowledge_js_1.KnowledgeStates.SUSPECTED,
    loreKnowledge_js_1.KnowledgeStates.CONFIRMED,
    loreKnowledge_js_1.KnowledgeStates.DISPROVEN,
];
function isEntityDiscovered(presenceState, isManagerView) {
    if (isManagerView)
        return true;
    return (presenceState !== contentPresence_js_1.ContentRevelationStates.HIDDEN &&
        presenceState !== contentPresence_js_1.ContentRevelationStates.DRAFT);
}
function resolvePresenceState(presenceMap, entityId) {
    return presenceMap.get(entityId) ?? contentPresence_js_1.ContentRevelationStates.REVEALED;
}
function projectPageDiscovery(pageId, presenceMap, isManagerView, revelation) {
    const presenceState = resolvePresenceState(presenceMap, pageId);
    return {
        isDiscovered: isEntityDiscovered(presenceState, isManagerView),
        presenceState,
        isManagerView,
        visibleKnowledgeStates: isManagerView
            ? Object.values(loreKnowledge_js_1.KnowledgeStates)
            : PARTY_VISIBLE_KNOWLEDGE_STATES,
        revelation,
    };
}
function partitionByDiscovery(items, presenceMap, isManagerView) {
    if (isManagerView) {
        return { discovered: items, undiscoveredCount: 0 };
    }
    const discovered = [];
    let undiscoveredCount = 0;
    for (const item of items) {
        const state = resolvePresenceState(presenceMap, item.id);
        if (isEntityDiscovered(state, false)) {
            discovered.push(item);
        }
        else {
            undiscoveredCount += 1;
        }
    }
    return { discovered, undiscoveredCount };
}
function projectBrowseSummary(items, presenceMap, isManagerView) {
    const { discovered, undiscoveredCount } = partitionByDiscovery(items, presenceMap, isManagerView);
    return {
        discoveredCount: discovered.length,
        undiscoveredCount,
        visibleChildCount: discovered.length,
    };
}
function filterClaimsForPartyKnowledge(claims, isManagerView) {
    if (isManagerView)
        return claims;
    return claims.filter((claim) => claim.knowledgeState !== loreKnowledge_js_1.KnowledgeStates.UNDISCOVERED &&
        claim.knowledgeState !== null &&
        claim.knowledgeState !== undefined);
}
function primaryKnowledgeGroup(state) {
    if (!state || state === loreKnowledge_js_1.KnowledgeStates.UNDISCOVERED)
        return null;
    if (state === loreKnowledge_js_1.KnowledgeStates.SUSPECTED)
        return 'suspected';
    if (state === loreKnowledge_js_1.KnowledgeStates.DISPROVEN)
        return 'disproven';
    if (state === loreKnowledge_js_1.KnowledgeStates.CONFIRMED || state === loreKnowledge_js_1.KnowledgeStates.KNOWN) {
        return 'confirmed';
    }
    return null;
}
function hasConflictingClaimStates(claims) {
    const states = new Set(claims
        .map((c) => c.knowledgeState)
        .filter((s) => s != null && s !== loreKnowledge_js_1.KnowledgeStates.UNDISCOVERED));
    if (states.has(loreKnowledge_js_1.KnowledgeStates.CONFIRMED) && states.has(loreKnowledge_js_1.KnowledgeStates.DISPROVEN)) {
        return true;
    }
    if (states.has(loreKnowledge_js_1.KnowledgeStates.KNOWN) && states.has(loreKnowledge_js_1.KnowledgeStates.DISPROVEN)) {
        return true;
    }
    if (states.size >= 2 && states.has(loreKnowledge_js_1.KnowledgeStates.SUSPECTED)) {
        const nonSuspected = [...states].filter((s) => s !== loreKnowledge_js_1.KnowledgeStates.SUSPECTED);
        if (nonSuspected.length >= 2)
            return true;
    }
    return false;
}
function hasConflictingInterpretations(accounts) {
    const hasConfirmed = accounts.some((a) => a.confidence === loreKnowledge_js_1.LoreConfidences.VERIFIED);
    const hasContested = accounts.some((a) => a.confidence === loreKnowledge_js_1.LoreConfidences.CONTESTED);
    if (hasConfirmed && hasContested)
        return true;
    const kinds = new Set(accounts.map((a) => a.accountKind));
    return accounts.length >= 2 && kinds.size > 1;
}
function computeIsContested(claims, interpretations = []) {
    if (hasConflictingClaimStates(claims))
        return true;
    if (hasConflictingInterpretations(interpretations))
        return true;
    return false;
}
function computePartyKnowledgeGroups(claims, interpretations = []) {
    const groups = {
        confirmed: [],
        suspected: [],
        disproven: [],
        contested: [],
    };
    const contested = computeIsContested(claims, interpretations);
    for (const claim of claims) {
        const bucket = primaryKnowledgeGroup(claim.knowledgeState);
        if (!bucket)
            continue;
        if (contested) {
            groups.contested.push(claim);
        }
        else {
            groups[bucket].push(claim);
        }
    }
    return groups;
}
function inferRevelationSource(input) {
    const type = input.discoveredViaType?.trim().toUpperCase();
    const sessionId = input.discoveredViaSessionId?.trim();
    const ref = input.discoveredViaRef?.trim();
    const workflowKey = input.workflowKey?.trim().toLowerCase();
    if (type === exports.RevelationSourceTypes.SESSION || sessionId) {
        if (sessionId)
            return { type: 'SESSION', sessionId };
    }
    if (type === exports.RevelationSourceTypes.QUEST || workflowKey === 'quest_unlock') {
        return { type: 'QUEST', questId: ref || undefined };
    }
    if (type === exports.RevelationSourceTypes.SCENE || workflowKey === 'scene_reveal') {
        return { type: 'SCENE', sceneId: ref || undefined };
    }
    if (type === exports.RevelationSourceTypes.RUMOR) {
        return { type: 'RUMOR', circulationId: ref || undefined };
    }
    if (type === exports.RevelationSourceTypes.IMPORT || workflowKey === 'import') {
        return { type: 'IMPORT' };
    }
    if (type === exports.RevelationSourceTypes.MANUAL ||
        workflowKey === 'manual_reveal' ||
        workflowKey === 'session_reveal') {
        if (workflowKey === 'session_reveal' && ref) {
            return { type: 'SESSION', sessionId: ref };
        }
        return { type: 'MANUAL' };
    }
    if (sessionId)
        return { type: 'SESSION', sessionId };
    if (workflowKey)
        return { type: 'MANUAL' };
    return null;
}
function serializeClaimRevelation(claim) {
    const discoveredAt = claim.discoveredAt instanceof Date
        ? claim.discoveredAt.toISOString()
        : typeof claim.discoveredAt === 'string'
            ? claim.discoveredAt
            : null;
    const source = inferRevelationSource(claim);
    if (!discoveredAt && !source)
        return null;
    return { discoveredAt, source };
}
function serializePresenceRevelation(presence) {
    const discoveredAt = presence.revealedAt instanceof Date
        ? presence.revealedAt.toISOString()
        : typeof presence.revealedAt === 'string'
            ? presence.revealedAt
            : null;
    const source = inferRevelationSource({
        workflowKey: presence.workflowKey,
        discoveredViaRef: presence.reason,
    });
    if (!discoveredAt && !source)
        return null;
    return { discoveredAt, source };
}
function emptyPartyKnowledgeGroups() {
    return {
        confirmed: [],
        suspected: [],
        disproven: [],
        contested: [],
    };
}
function normalizeEpochMinute(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    if (typeof value === 'bigint')
        return Number(value);
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    }
    return null;
}
function resolveEpistemicState(claims, interpretations) {
    if (computeIsContested(claims, interpretations)) {
        return exports.DiscoveryStates.CONTESTED;
    }
    const visibleClaims = claims.filter((claim) => claim.knowledgeState != null &&
        claim.knowledgeState !== loreKnowledge_js_1.KnowledgeStates.UNDISCOVERED);
    if (visibleClaims.length === 0) {
        return exports.DiscoveryStates.KNOWN;
    }
    const hasConfirmed = visibleClaims.some((claim) => claim.knowledgeState === loreKnowledge_js_1.KnowledgeStates.KNOWN ||
        claim.knowledgeState === loreKnowledge_js_1.KnowledgeStates.CONFIRMED);
    const allSuspected = visibleClaims.every((claim) => claim.knowledgeState === loreKnowledge_js_1.KnowledgeStates.SUSPECTED);
    if (!hasConfirmed && allSuspected) {
        return exports.DiscoveryStates.RUMOR;
    }
    const hasPartialConfidence = visibleClaims.some((claim) => claim.confidence === loreKnowledge_js_1.LoreConfidences.PARTIAL);
    const hasVerified = visibleClaims.some((claim) => claim.confidence === loreKnowledge_js_1.LoreConfidences.VERIFIED);
    const hasUnverified = visibleClaims.some((claim) => claim.confidence === loreKnowledge_js_1.LoreConfidences.UNVERIFIED ||
        claim.confidence === loreKnowledge_js_1.LoreConfidences.PARTIAL);
    if (hasPartialConfidence ||
        (hasVerified && hasUnverified && !hasConfirmed)) {
        return exports.DiscoveryStates.PARTIAL;
    }
    return exports.DiscoveryStates.KNOWN;
}
function projectDiscoveryState(input) {
    const gateFrom = normalizeEpochMinute(input.availableFromEpochMinute);
    const campaignNow = normalizeEpochMinute(input.campaignNowEpochMinute);
    const interpretations = input.interpretations ?? [];
    if (input.isManagerView) {
        const epistemicState = resolveEpistemicState(input.claims, interpretations);
        return {
            state: epistemicState,
            available: true,
        };
    }
    const hiddenByPresence = input.presenceState === contentPresence_js_1.ContentRevelationStates.HIDDEN ||
        input.presenceState === contentPresence_js_1.ContentRevelationStates.DRAFT;
    const hiddenBySchedule = gateFrom != null &&
        campaignNow != null &&
        campaignNow < gateFrom;
    if (hiddenByPresence || hiddenBySchedule) {
        return {
            state: exports.DiscoveryStates.HIDDEN,
            available: false,
            ...(hiddenBySchedule && !hiddenByPresence && gateFrom != null
                ? { gatedUntil: gateFrom }
                : {}),
        };
    }
    return {
        state: resolveEpistemicState(input.claims, interpretations),
        available: true,
    };
}
function isDiscoveryAvailable(projection) {
    return projection.available;
}
//# sourceMappingURL=discoveryProjection.js.map