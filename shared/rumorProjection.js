"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeActiveCirculations = computeActiveCirculations;
exports.filterCirculationsForAudience = filterCirculationsForAudience;
exports.assembleRumorFeed = assembleRumorFeed;
exports.assembleRegionRumorFeed = assembleRegionRumorFeed;
exports.assembleFactionGossipFeed = assembleFactionGossipFeed;
/**
 * Layer 3 — derived rumor feeds from circulation history + lore claims.
 */
const discoveryProjection_js_1 = require("./discoveryProjection.js");
const rumorEngine_js_1 = require("./rumorEngine.js");
function rankToCode(rank) {
    switch (rank) {
        case rumorEngine_js_1.InclusionReasonRanks.SUBJECT_LOCALITY:
            return 'subject_locality';
        case rumorEngine_js_1.InclusionReasonRanks.SOURCE_LOCALITY:
            return 'source_locality';
        case rumorEngine_js_1.InclusionReasonRanks.EXPLICIT_SPREAD:
            return 'explicit_spread';
        case rumorEngine_js_1.InclusionReasonRanks.INTERPRETATION_REGION:
            return 'interpretation_region';
        case rumorEngine_js_1.InclusionReasonRanks.ORG_GRAPH:
            return 'org_graph';
        default:
            return 'explicit_spread';
    }
}
function reason(rank) {
    return { rank: rank, code: rankToCode(rank) };
}
/** Edges at or before asOf; retractions remove superseded circulation ids. */
function computeActiveCirculations(circulations, asOfEpochMinute) {
    const inWindow = circulations.filter((c) => c.edgeKind === rumorEngine_js_1.CirculationEdgeKinds.CIRCULATION &&
        (0, rumorEngine_js_1.isEpochAtOrBefore)(c.circulatedAtEpochMinute, asOfEpochMinute));
    const retractions = circulations.filter((c) => c.edgeKind === rumorEngine_js_1.CirculationEdgeKinds.RETRACTION &&
        (0, rumorEngine_js_1.isEpochAtOrBefore)(c.circulatedAtEpochMinute, asOfEpochMinute));
    const retractedIds = new Set(retractions
        .map((r) => r.supersedesCirculationId)
        .filter((id) => Boolean(id)));
    return inWindow.filter((c) => !retractedIds.has(c.id));
}
/** Party invariant: filter PARTY visibility before dedupe. */
function filterCirculationsForAudience(circulations, isElevated) {
    if (isElevated)
        return circulations;
    return circulations.filter((c) => c.visibility === rumorEngine_js_1.CirculationVisibilities.PARTY);
}
function isRegionScope(scope) {
    return 'anchorLocationPageId' in scope;
}
function circulationMatchesRegionScope(c, scope) {
    if (c.targetKind !== rumorEngine_js_1.CirculationTargetKinds.REGION)
        return false;
    if (c.targetRef === scope.anchorLocationPageId)
        return true;
    return scope.locationPageIds.includes(c.targetRef);
}
function circulationMatchesFactionScope(c, scope) {
    if (c.targetKind !== rumorEngine_js_1.CirculationTargetKinds.FACTION)
        return false;
    if (c.targetRef === scope.orgPageId)
        return true;
    return scope.relatedOrgPageIds.includes(c.targetRef);
}
function evaluateInclusionReasons(claim, sources, scope, scopeMode, activeInScope, interpretations) {
    const reasons = [];
    const claimInterpretations = interpretations.filter((a) => a.pageId === claim.pageId);
    if (scopeMode === 'region' && isRegionScope(scope)) {
        if (scope.locationPageIds.includes(claim.pageId)) {
            reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.SUBJECT_LOCALITY));
        }
        for (const src of sources) {
            if (src.sourceEntityId &&
                (scope.locationPageIds.includes(src.sourceEntityId) ||
                    scope.orgPageIdsInScope.includes(src.sourceEntityId))) {
                reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.SOURCE_LOCALITY));
                break;
            }
        }
        if (activeInScope.some((c) => circulationMatchesRegionScope(c, scope))) {
            reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.EXPLICIT_SPREAD));
        }
        const regionKeys = new Set([scope.regionKey, ...scope.regionLabels].filter(Boolean));
        for (const acc of claimInterpretations) {
            const br = acc.beliefRegion?.trim();
            if (br && regionKeys.has(br)) {
                reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.INTERPRETATION_REGION));
                break;
            }
        }
        if (scope.orgPageIdsInScope.length > 0) {
            reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.ORG_GRAPH));
        }
    }
    else if (scopeMode === 'faction' && !isRegionScope(scope)) {
        const fac = scope;
        if (fac.relatedOrgPageIds.includes(claim.pageId) || claim.pageId === fac.orgPageId) {
            reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.SUBJECT_LOCALITY));
        }
        for (const src of sources) {
            if (src.sourceEntityId === fac.orgPageId) {
                reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.SOURCE_LOCALITY));
                break;
            }
        }
        if (activeInScope.some((c) => circulationMatchesFactionScope(c, fac))) {
            reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.EXPLICIT_SPREAD));
        }
        for (const acc of claimInterpretations) {
            if (acc.sourceOrigin?.trim() === fac.orgPageId) {
                reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.INTERPRETATION_REGION));
                break;
            }
        }
        if (fac.relatedOrgPageIds.length > 0) {
            reasons.push(reason(rumorEngine_js_1.InclusionReasonRanks.ORG_GRAPH));
        }
    }
    return reasons.sort((a, b) => a.rank - b.rank);
}
function claimIncluded(reasons, activeInScope) {
    return reasons.length > 0 || activeInScope.length > 0;
}
function buildPerspectives(circulations, scopeLabels) {
    const byKey = new Map();
    for (const c of circulations) {
        const key = `${c.targetKind}:${c.targetRef}`;
        const list = byKey.get(key) ?? [];
        list.push(c);
        byKey.set(key, list);
    }
    const perspectives = [];
    for (const [key, list] of byKey) {
        const sorted = [...list].sort((a, b) => (0, rumorEngine_js_1.compareEpochMinutes)(b.circulatedAtEpochMinute, a.circulatedAtEpochMinute));
        const latest = sorted[0];
        if (!latest)
            continue;
        const [scopeKind, scopeRef] = key.split(':');
        const label = scopeLabels.get(key) ?? scopeRef;
        perspectives.push({
            scopeKind,
            scopeRef,
            scopeLabel: label,
            stance: latest.stance,
            circulationCount: list.length,
            latestCirculatedAt: latest.circulatedAtEpochMinute,
            summary: `${label} (${scopeKind}) — ${latest.stance}`,
        });
    }
    return perspectives;
}
function buildContradictionBundles(items, interpretations, scopeLabels) {
    const byGroup = new Map();
    for (const item of items) {
        const gid = item.claim.interpretationGroupId ?? `_ungrouped_${item.claim.id}`;
        const list = byGroup.get(gid) ?? [];
        list.push(item);
        byGroup.set(gid, list);
    }
    const bundles = [];
    for (const [groupId, groupItems] of byGroup) {
        if (groupItems.length < 2 && !groupId.startsWith('_ungrouped_')) {
            const single = groupItems[0];
            if (!single)
                continue;
            const accs = interpretations.filter((a) => a.pageId === single.claim.pageId);
            const contested = (0, discoveryProjection_js_1.computeIsContested)([single.claim], accs);
            if (!contested)
                continue;
        }
        const claims = groupItems.map((i) => i.claim);
        const accs = interpretations.filter((a) => claims.some((c) => c.pageId === a.pageId));
        const contested = (0, discoveryProjection_js_1.computeIsContested)(claims, accs);
        if (!contested && groupItems.length < 2)
            continue;
        const allCircs = groupItems.flatMap((i) => i.activeCirculations);
        bundles.push({
            groupId: groupId.startsWith('_ungrouped_') ? null : groupId,
            claims,
            interpretations: accs,
            isContested: contested,
            contestReasons: contested
                ? ['conflicting_claim_states_or_interpretations']
                : [],
            perspectives: buildPerspectives(allCircs, scopeLabels),
        });
    }
    return bundles;
}
function assembleRumorFeed(input) {
    const { ctx, scope, scopeMode, circulations, claims, claimSources } = input;
    const activeAll = computeActiveCirculations(circulations, ctx.asOfEpochMinute);
    const audienceActive = filterCirculationsForAudience(activeAll, ctx.isElevated);
    const scopeActive = audienceActive.filter((c) => {
        if (scopeMode === 'region' && isRegionScope(scope)) {
            return circulationMatchesRegionScope(c, scope);
        }
        if (scopeMode === 'faction' && !isRegionScope(scope)) {
            return circulationMatchesFactionScope(c, scope);
        }
        return false;
    });
    const claimsById = new Map(claims.map((c) => [c.id, c]));
    const sourcesByClaim = new Map();
    for (const src of claimSources) {
        const list = sourcesByClaim.get(src.claimId) ?? [];
        list.push(src);
        sourcesByClaim.set(src.claimId, list);
    }
    const claimIdsFromCirc = new Set(scopeActive.map((c) => c.claimId));
    const candidateClaimIds = new Set([
        ...claimIdsFromCirc,
        ...claims.map((c) => c.id),
    ]);
    const partyClaims = (0, discoveryProjection_js_1.filterClaimsForPartyKnowledge)(claims, ctx.isElevated);
    const partyClaimIds = new Set(partyClaims.map((c) => c.id));
    const items = [];
    for (const claimId of candidateClaimIds) {
        const claim = claimsById.get(claimId);
        if (!claim)
            continue;
        if (!ctx.isElevated && !partyClaimIds.has(claimId))
            continue;
        const activeForClaim = scopeActive.filter((c) => c.claimId === claimId);
        if (!ctx.isElevated && activeForClaim.length === 0)
            continue;
        const sources = sourcesByClaim.get(claimId) ?? [];
        const inclusionReasons = evaluateInclusionReasons(claim, sources, scope, scopeMode, activeForClaim, input.interpretations);
        if (!claimIncluded(inclusionReasons, activeForClaim))
            continue;
        if (!ctx.isElevated && activeForClaim.length === 0)
            continue;
        const sorted = [...activeForClaim].sort((a, b) => (0, rumorEngine_js_1.compareEpochMinutes)(b.circulatedAtEpochMinute, a.circulatedAtEpochMinute));
        const primary = sorted[0] ?? null;
        const epochs = sorted.map((c) => c.circulatedAtEpochMinute);
        const firstCirculatedAt = epochs.length > 0
            ? epochs.reduce((min, e) => ((0, rumorEngine_js_1.compareEpochMinutes)(e, min) < 0 ? e : min))
            : null;
        const lastCirculatedAt = primary?.circulatedAtEpochMinute ?? null;
        items.push({
            claim,
            primaryCirculation: primary,
            activeCirculations: sorted,
            stance: primary?.stance ?? rumorEngine_js_1.RumorStances.ASSERTS,
            awarenessScope: primary?.awarenessScope ?? rumorEngine_js_1.AwarenessScopes.REGIONAL,
            primaryInclusionReason: inclusionReasons[0] ?? reason(rumorEngine_js_1.InclusionReasonRanks.EXPLICIT_SPREAD),
            inclusionReasons,
            firstCirculatedAt,
            lastCirculatedAt,
        });
    }
    items.sort((a, b) => {
        const rankDiff = a.primaryInclusionReason.rank - b.primaryInclusionReason.rank;
        if (rankDiff !== 0)
            return rankDiff;
        const aLast = a.lastCirculatedAt ?? '0';
        const bLast = b.lastCirculatedAt ?? '0';
        return (0, rumorEngine_js_1.compareEpochMinutes)(bLast, aLast);
    });
    const scopeLabels = new Map();
    if (scopeMode === 'region' && isRegionScope(scope)) {
        scopeLabels.set(`${rumorEngine_js_1.CirculationTargetKinds.REGION}:${scope.anchorLocationPageId}`, scope.anchorLocationPageId);
    }
    else if (!isRegionScope(scope)) {
        scopeLabels.set(`${rumorEngine_js_1.CirculationTargetKinds.FACTION}:${scope.orgPageId}`, scope.orgPageId);
    }
    const contradictionBundles = buildContradictionBundles(items, input.interpretations, scopeLabels);
    return {
        version: rumorEngine_js_1.RUMOR_ENGINE_VERSION,
        asOfEpochMinute: ctx.asOfEpochMinute,
        isElevated: ctx.isElevated,
        items,
        contradictionBundles,
    };
}
function assembleRegionRumorFeed(input) {
    return assembleRumorFeed({ ...input, scopeMode: 'region' });
}
function assembleFactionGossipFeed(input) {
    return assembleRumorFeed({ ...input, scopeMode: 'faction' });
}
//# sourceMappingURL=rumorProjection.js.map