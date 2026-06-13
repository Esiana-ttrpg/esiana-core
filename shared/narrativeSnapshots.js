"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProjectionContextHash = exports.SUMMARY_TEMPLATES = exports.SNAPSHOT_SCOPE_CAPS = exports.SNAPSHOT_COLLECTOR_VERSIONS = exports.SnapshotFacetKey = exports.SnapshotKind = exports.SnapshotPayloadTier = exports.PROJECTION_SEMANTICS_VERSION = exports.SNAPSHOT_PAYLOAD_VERSION = void 0;
exports.renderSummaryLine = renderSummaryLine;
exports.stableJsonHash = stableJsonHash;
exports.hashNpcPresence = hashNpcPresence;
exports.hashOrgStance = hashOrgStance;
exports.hashMapPresence = hashMapPresence;
exports.hashPartyKnowledge = hashPartyKnowledge;
exports.hashDanger = hashDanger;
exports.buildFacetHashes = buildFacetHashes;
exports.buildRegionSnapshotMeta = buildRegionSnapshotMeta;
exports.compressPayloadToCold = compressPayloadToCold;
exports.resolveFacetCompatibility = resolveFacetCompatibility;
exports.diffNpcPresence = diffNpcPresence;
exports.diffOrgStance = diffOrgStance;
exports.diffMapPresence = diffMapPresence;
exports.diffPartyKnowledge = diffPartyKnowledge;
exports.diffDanger = diffDanger;
exports.buildRegionDiff = buildRegionDiff;
/**
 * Layer 1 — temporal snapshot primitives (region capture + diff).
 * @see docs/platform/temporal-snapshots.md
 */
const chronologyConvergence_js_1 = require("./chronologyConvergence.js");
Object.defineProperty(exports, "buildProjectionContextHash", { enumerable: true, get: function () { return chronologyConvergence_js_1.buildProjectionContextHash; } });
exports.SNAPSHOT_PAYLOAD_VERSION = 'region-v1';
exports.PROJECTION_SEMANTICS_VERSION = 'narrative-projection-v1';
exports.SnapshotPayloadTier = {
    HOT: 'hot',
    COLD: 'cold',
    COMPRESSING: 'compressing',
};
exports.SnapshotKind = {
    PARTY_VISIT: 'party_visit',
    MILESTONE: 'milestone',
    MANUAL: 'manual',
};
exports.SnapshotFacetKey = {
    NPC_PRESENCE: 'npcPresence',
    ORG_STANCE: 'orgStance',
    MAP_PRESENCE: 'mapPresence',
    PARTY_KNOWLEDGE: 'partyKnowledge',
    DANGER: 'danger',
};
exports.SNAPSHOT_COLLECTOR_VERSIONS = {
    [exports.SnapshotFacetKey.NPC_PRESENCE]: '1',
    [exports.SnapshotFacetKey.ORG_STANCE]: '1',
    [exports.SnapshotFacetKey.MAP_PRESENCE]: '1',
    [exports.SnapshotFacetKey.PARTY_KNOWLEDGE]: '2',
    [exports.SnapshotFacetKey.DANGER]: '1',
};
exports.SNAPSHOT_SCOPE_CAPS = {
    maxLocationPages: 50,
    maxNpcs: 100,
    maxOrgStances: 80,
    maxMapObjects: 200,
    maxKnowledgeClaims: 40,
};
exports.SUMMARY_TEMPLATES = {
    npc_move: (p) => `${p.title} is now at ${p.locationLabel}.`,
    npc_departed: (p) => `${p.title} is no longer present.`,
    org_stance: (p) => `${p.orgTitle} is now ${p.stance} toward ${p.targetTitle}.`,
    rumor_one: () => '1 new rumor(s) circulating.',
    rumor_many: (p) => `${p.count} new rumor(s) circulating.`,
    danger_change: (p) => `Danger level is now ${p.level}.`,
};
function renderSummaryLine(candidate) {
    const fn = exports.SUMMARY_TEMPLATES[candidate.templateId];
    if (!fn)
        return null;
    return fn(candidate.params);
}
function stableJsonHash(value) {
    const str = JSON.stringify(value, (_k, v) => typeof v === 'bigint' ? v.toString() : v);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}
function hashNpcPresence(facet) {
    const sorted = [...facet].sort((a, b) => a.pageId.localeCompare(b.pageId));
    return stableJsonHash(sorted);
}
function hashOrgStance(facet) {
    const sorted = [...facet].sort((a, b) => `${a.orgPageId}:${a.targetOrgPageId}`.localeCompare(`${b.orgPageId}:${b.targetOrgPageId}`));
    return stableJsonHash(sorted);
}
function hashMapPresence(facet) {
    return stableJsonHash({
        ids: [...facet.visibleObjectIds].sort(),
        rev: facet.revelationByObjectId,
    });
}
function hashPartyKnowledge(facet) {
    const sorted = [...facet].sort((a, b) => a.claimId.localeCompare(b.claimId));
    return stableJsonHash(sorted);
}
function hashDanger(facet) {
    const sorted = [...facet].sort((a, b) => a.locationPageId.localeCompare(b.locationPageId));
    return stableJsonHash(sorted);
}
function buildFacetHashes(facets) {
    return {
        entityPresenceHash: hashNpcPresence(facets.npcPresence),
        orgRelationHash: hashOrgStance(facets.orgStance),
        mapPresenceHash: hashMapPresence(facets.mapPresence),
        knowledgeHash: hashPartyKnowledge(facets.partyKnowledge),
        dangerHash: hashDanger(facets.danger),
    };
}
function buildRegionSnapshotMeta(ctx, anchorLocationPageId, regionKey, capturedAtEpochMinute) {
    return {
        snapshotVersion: exports.SNAPSHOT_PAYLOAD_VERSION,
        projectionSemanticsVersion: exports.PROJECTION_SEMANTICS_VERSION,
        projectionContextHash: (0, chronologyConvergence_js_1.buildProjectionContextHash)(ctx),
        collectorVersions: { ...exports.SNAPSHOT_COLLECTOR_VERSIONS },
        regionKey,
        anchorLocationPageId,
        capturedAtEpochMinute: capturedAtEpochMinute.toString(),
    };
}
function compressPayloadToCold(payload) {
    return {
        meta: payload.meta,
        facetHashes: payload.facetHashes,
        facets: {
            npcPresence: [],
            orgStance: [],
            mapPresence: { visibleObjectIds: [], revelationByObjectId: {} },
            partyKnowledge: [],
            danger: [],
        },
        summaryLinesAtCapture: payload.summaryLinesAtCapture ?? [],
    };
}
function resolveFacetCompatibility(baselineMeta, facet) {
    if (baselineMeta.projectionSemanticsVersion !== exports.PROJECTION_SEMANTICS_VERSION) {
        return 'stale_semantics';
    }
    const baseVer = baselineMeta.collectorVersions[facet];
    const currentVer = exports.SNAPSHOT_COLLECTOR_VERSIONS[facet];
    if (baseVer !== currentVer)
        return 'stale_collector';
    return 'ok';
}
function diffNpcPresence(baseline, live, titleById, locationLabelById) {
    const baseMap = new Map(baseline.map((r) => [r.pageId, r]));
    const liveMap = new Map(live.map((r) => [r.pageId, r]));
    const added = [];
    const removed = [];
    const moved = [];
    const lines = [];
    for (const row of live) {
        const prev = baseMap.get(row.pageId);
        if (!prev) {
            if (row.locationPageId) {
                lines.push({
                    templateId: 'npc_move',
                    params: {
                        title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
                        locationLabel: locationLabelById.get(row.locationPageId) ?? 'another place',
                    },
                });
            }
            continue;
        }
        if (prev.locationPageId !== row.locationPageId) {
            if (row.locationPageId) {
                moved.push({
                    pageId: row.pageId,
                    title: row.title ?? titleById.get(row.pageId) ?? null,
                    from: prev.locationPageId,
                    to: row.locationPageId,
                });
                lines.push({
                    templateId: 'npc_move',
                    params: {
                        title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
                        locationLabel: locationLabelById.get(row.locationPageId) ?? 'another place',
                    },
                });
            }
            else {
                lines.push({
                    templateId: 'npc_departed',
                    params: {
                        title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
                    },
                });
            }
        }
    }
    for (const row of baseline) {
        if (!liveMap.has(row.pageId)) {
            removed.push(row);
            lines.push({
                templateId: 'npc_departed',
                params: {
                    title: row.title ?? titleById.get(row.pageId) ?? 'Someone',
                },
            });
        }
    }
    return { diff: { added, removed, moved }, lines };
}
function diffOrgStance(baseline, live, titleById) {
    const key = (r) => `${r.orgPageId}:${r.targetOrgPageId}:${r.relationType}`;
    const baseMap = new Map(baseline.map((r) => [key(r), r]));
    const changed = [];
    const lines = [];
    for (const row of live) {
        const prev = baseMap.get(key(row));
        if (prev && prev.stance === row.stance)
            continue;
        changed.push({
            orgPageId: row.orgPageId,
            targetOrgPageId: row.targetOrgPageId,
            fromStance: prev?.stance ?? null,
            toStance: row.stance,
            orgTitle: titleById.get(row.orgPageId),
            targetTitle: titleById.get(row.targetOrgPageId),
        });
        lines.push({
            templateId: 'org_stance',
            params: {
                orgTitle: titleById.get(row.orgPageId) ?? 'A faction',
                targetTitle: titleById.get(row.targetOrgPageId) ?? 'another faction',
                stance: row.stance,
            },
        });
    }
    return { diff: { changed }, lines };
}
function diffMapPresence(baseline, live) {
    const baseSet = new Set(baseline.visibleObjectIds);
    const liveSet = new Set(live.visibleObjectIds);
    const revealedIds = live.visibleObjectIds.filter((id) => !baseSet.has(id));
    const hiddenIds = baseline.visibleObjectIds.filter((id) => !liveSet.has(id));
    return { diff: { revealedIds, hiddenIds }, lines: [] };
}
function diffPartyKnowledge(baseline, live) {
    const baseIds = new Set(baseline.map((r) => r.claimId));
    const liveIds = new Set(live.map((r) => r.claimId));
    const addedClaimIds = live.filter((r) => !baseIds.has(r.claimId)).map((r) => r.claimId);
    const removedClaimIds = baseline
        .filter((r) => !liveIds.has(r.claimId))
        .map((r) => r.claimId);
    const lines = [];
    if (addedClaimIds.length === 1) {
        lines.push({ templateId: 'rumor_one', params: {} });
    }
    else if (addedClaimIds.length > 1) {
        lines.push({ templateId: 'rumor_many', params: { count: addedClaimIds.length } });
    }
    return {
        diff: {
            addedClaimIds,
            removedClaimIds,
            addedCount: addedClaimIds.length,
        },
        lines,
    };
}
function diffDanger(baseline, live) {
    const baseMap = new Map(baseline.map((r) => [r.locationPageId, r.level]));
    const changed = [];
    const lines = [];
    for (const row of live) {
        const prev = baseMap.get(row.locationPageId);
        if (prev === row.level)
            continue;
        changed.push({
            locationPageId: row.locationPageId,
            from: prev ?? null,
            to: row.level,
        });
        lines.push({ templateId: 'danger_change', params: { level: row.level } });
    }
    return { diff: { changed }, lines };
}
function buildRegionDiff(input) {
    const { audience, baseline, live, titleById, locationLabelById } = input;
    const facetCompatibility = {};
    const versionWarnings = [];
    const structuredDiff = {};
    const lineCandidates = [];
    let semanticsStale = false;
    if (baseline.meta.projectionSemanticsVersion !== exports.PROJECTION_SEMANTICS_VERSION) {
        semanticsStale = true;
        if (audience === 'dm') {
            versionWarnings.push({
                code: 'stale_semantics',
                message: 'Visit snapshot outdated—projection rules changed. Re-mark party visited to refresh.',
            });
        }
    }
    const facets = [
        exports.SnapshotFacetKey.NPC_PRESENCE,
        exports.SnapshotFacetKey.ORG_STANCE,
        exports.SnapshotFacetKey.MAP_PRESENCE,
        exports.SnapshotFacetKey.PARTY_KNOWLEDGE,
        exports.SnapshotFacetKey.DANGER,
    ];
    const hashMatch = (key) => baseline.facetHashes[key] === live.facetHashes[key];
    for (const facetKey of facets) {
        const compat = resolveFacetCompatibility(baseline.meta, facetKey);
        facetCompatibility[facetKey] = compat;
        if (compat === 'stale_semantics' && semanticsStale)
            continue;
        if (compat === 'stale_collector') {
            if (audience === 'dm') {
                versionWarnings.push({
                    code: 'stale_collector',
                    message: `${facetKey} diff uses collector v${exports.SNAPSHOT_COLLECTOR_VERSIONS[facetKey]}; snapshot was v${baseline.meta.collectorVersions[facetKey]}—re-mark visit for full accuracy.`,
                    facet: facetKey,
                });
            }
            continue;
        }
        if (facetKey === exports.SnapshotFacetKey.NPC_PRESENCE) {
            if (!hashMatch('entityPresenceHash')) {
                const r = diffNpcPresence(baseline.facets.npcPresence, live.facets.npcPresence, titleById, locationLabelById);
                structuredDiff.npcPresence = r.diff;
                lineCandidates.push(...r.lines);
            }
        }
        else if (facetKey === exports.SnapshotFacetKey.ORG_STANCE) {
            if (!hashMatch('orgRelationHash')) {
                const r = diffOrgStance(baseline.facets.orgStance, live.facets.orgStance, titleById);
                structuredDiff.orgStance = r.diff;
                lineCandidates.push(...r.lines);
            }
        }
        else if (facetKey === exports.SnapshotFacetKey.MAP_PRESENCE) {
            if (!hashMatch('mapPresenceHash')) {
                const r = diffMapPresence(baseline.facets.mapPresence, live.facets.mapPresence);
                structuredDiff.mapPresence = r.diff;
                lineCandidates.push(...r.lines);
            }
        }
        else if (facetKey === exports.SnapshotFacetKey.PARTY_KNOWLEDGE) {
            if (!hashMatch('knowledgeHash')) {
                const r = diffPartyKnowledge(baseline.facets.partyKnowledge, live.facets.partyKnowledge);
                structuredDiff.partyKnowledge = r.diff;
                lineCandidates.push(...r.lines);
            }
        }
        else if (facetKey === exports.SnapshotFacetKey.DANGER) {
            if (!hashMatch('dangerHash')) {
                const r = diffDanger(baseline.facets.danger, live.facets.danger);
                structuredDiff.danger = r.diff;
                lineCandidates.push(...r.lines);
            }
        }
    }
    let summaryLines = lineCandidates
        .map(renderSummaryLine)
        .filter((s) => Boolean(s));
    let diegeticFallback = false;
    if (semanticsStale &&
        audience === 'party' &&
        summaryLines.length === 0) {
        summaryLines = ['Things feel different since you were last here.'];
        diegeticFallback = true;
    }
    const result = {
        audience,
        summaryLines,
        structuredDiff,
        truncation: baseline.meta.truncation,
    };
    if (diegeticFallback)
        result.diegeticFallback = true;
    if (audience === 'dm') {
        if (versionWarnings.length > 0)
            result.versionWarnings = versionWarnings;
        result.facetCompatibility = facetCompatibility;
    }
    return result;
}
//# sourceMappingURL=narrativeSnapshots.js.map