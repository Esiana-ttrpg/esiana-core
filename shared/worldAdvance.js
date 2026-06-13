"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldAdvanceProjectionDomains = exports.WORLD_ADVANCE_CATEGORY = exports.WORLD_ADVANCE_VERSION = void 0;
exports.parseWorldAdvanceEffect = parseWorldAdvanceEffect;
exports.parseWorldAdvanceBatchRequest = parseWorldAdvanceBatchRequest;
exports.parseWorldAdvanceBatchPayload = parseWorldAdvanceBatchPayload;
const timeAdvanceUnits_js_1 = require("./timeAdvanceUnits.js");
exports.WORLD_ADVANCE_VERSION = 'world-advance-v1';
exports.WORLD_ADVANCE_CATEGORY = 'World advance';
exports.WorldAdvanceProjectionDomains = {
    FACTION: 'faction',
    TERRITORIAL: 'territorial',
    ECONOMIC: 'economic',
    CONFLICT: 'conflict',
    SEASONAL: 'seasonal',
    NPC_MOBILITY: 'npc_mobility',
};
const DOMAIN_VALUES = new Set(Object.values(exports.WorldAdvanceProjectionDomains));
function isObject(raw) {
    return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}
function parseBase(raw) {
    if (typeof raw.id !== 'string' || !raw.id.trim())
        return null;
    const domain = raw.domain;
    if (typeof domain !== 'string' || !DOMAIN_VALUES.has(domain)) {
        return null;
    }
    return {
        id: raw.id.trim(),
        domain: domain,
        sourceEventIds: Array.isArray(raw.sourceEventIds)
            ? raw.sourceEventIds.filter((x) => typeof x === 'string')
            : undefined,
        sourcePageIds: Array.isArray(raw.sourcePageIds)
            ? raw.sourcePageIds.filter((x) => typeof x === 'string')
            : undefined,
    };
}
function parseWorldAdvanceEffect(raw) {
    if (!isObject(raw))
        return null;
    const base = parseBase(raw);
    if (!base)
        return null;
    const type = raw.type;
    if (typeof type !== 'string')
        return null;
    switch (type) {
        case 'append_org_relation_event':
            if (typeof raw.orgPageId !== 'string' ||
                typeof raw.targetOrgId !== 'string' ||
                typeof raw.relationType !== 'string' ||
                typeof raw.stance !== 'string') {
                return null;
            }
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.FACTION,
                type,
                orgPageId: raw.orgPageId,
                targetOrgId: raw.targetOrgId,
                relationType: raw.relationType,
                stance: raw.stance,
                visibility: typeof raw.visibility === 'string' ? raw.visibility : undefined,
                note: typeof raw.note === 'string' ? raw.note : undefined,
                effectiveDate: raw.effectiveDate,
            };
        case 'territory_pressure':
            if (raw.pressureLevel !== 'low' && raw.pressureLevel !== 'moderate' && raw.pressureLevel !== 'high') {
                return null;
            }
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.TERRITORIAL,
                type,
                orgPageId: typeof raw.orgPageId === 'string' ? raw.orgPageId : undefined,
                regionPageId: typeof raw.regionPageId === 'string' ? raw.regionPageId : undefined,
                pressureLevel: raw.pressureLevel,
                note: typeof raw.note === 'string' ? raw.note : undefined,
            };
        case 'suggest_border_keyframe':
            if (typeof raw.sceneObjectId !== 'string')
                return null;
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.TERRITORIAL,
                type,
                sceneObjectId: raw.sceneObjectId,
                orgPageId: typeof raw.orgPageId === 'string' ? raw.orgPageId : undefined,
                stance: typeof raw.stance === 'string' ? raw.stance : undefined,
                note: typeof raw.note === 'string' ? raw.note : undefined,
            };
        case 'economic_signal':
            if ((raw.targetKind !== 'org' && raw.targetKind !== 'location') ||
                typeof raw.pageId !== 'string' ||
                typeof raw.signal !== 'string') {
                return null;
            }
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.ECONOMIC,
                type,
                targetKind: raw.targetKind,
                pageId: raw.pageId,
                signal: raw.signal,
                note: typeof raw.note === 'string' ? raw.note : undefined,
            };
        case 'conflict_front':
            if (typeof raw.label !== 'string' || typeof raw.phase !== 'string')
                return null;
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.CONFLICT,
                type,
                label: raw.label,
                phase: raw.phase,
                orgPageIds: Array.isArray(raw.orgPageIds)
                    ? raw.orgPageIds.filter((x) => typeof x === 'string')
                    : undefined,
                regionPageIds: Array.isArray(raw.regionPageIds)
                    ? raw.regionPageIds.filter((x) => typeof x === 'string')
                    : undefined,
                displacementNote: typeof raw.displacementNote === 'string' ? raw.displacementNote : undefined,
                casualtyNote: typeof raw.casualtyNote === 'string' ? raw.casualtyNote : undefined,
            };
        case 'record_season_context':
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.SEASONAL,
                type,
                regionPageId: typeof raw.regionPageId === 'string' ? raw.regionPageId : undefined,
                note: typeof raw.note === 'string' ? raw.note : undefined,
            };
        case 'append_location_event':
            if (typeof raw.characterPageId !== 'string' ||
                typeof raw.locationPageId !== 'string' ||
                typeof raw.kind !== 'string') {
                return null;
            }
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.NPC_MOBILITY,
                type,
                characterPageId: raw.characterPageId,
                locationPageId: raw.locationPageId,
                kind: raw.kind,
                note: typeof raw.note === 'string' ? raw.note : undefined,
                effectiveDate: raw.effectiveDate,
            };
        case 'set_current_location':
            if (typeof raw.characterPageId !== 'string')
                return null;
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.NPC_MOBILITY,
                type,
                characterPageId: raw.characterPageId,
                locationPageId: raw.locationPageId === null
                    ? null
                    : typeof raw.locationPageId === 'string'
                        ? raw.locationPageId
                        : null,
            };
        case 'displacement':
            if (typeof raw.characterPageId !== 'string')
                return null;
            return {
                ...base,
                domain: exports.WorldAdvanceProjectionDomains.NPC_MOBILITY,
                type,
                characterPageId: raw.characterPageId,
                fromLocationPageId: typeof raw.fromLocationPageId === 'string' ? raw.fromLocationPageId : undefined,
                toLocationPageId: typeof raw.toLocationPageId === 'string' ? raw.toLocationPageId : undefined,
                note: typeof raw.note === 'string' ? raw.note : undefined,
            };
        case 'consequence_bridge':
            if (!isObject(raw.consequence))
                return null;
            return {
                ...base,
                type,
                domain: base.domain,
                consequence: raw.consequence,
            };
        default:
            return null;
    }
}
function parseWorldAdvanceBatchRequest(raw) {
    if (!isObject(raw))
        return null;
    if (raw.version !== undefined && raw.version !== exports.WORLD_ADVANCE_VERSION)
        return null;
    if (!Array.isArray(raw.effects))
        return null;
    const effects = [];
    for (const entry of raw.effects) {
        const parsed = parseWorldAdvanceEffect(entry);
        if (parsed)
            effects.push(parsed);
    }
    if (effects.length === 0)
        return null;
    let advanceTime;
    if (isObject(raw.advanceTime)) {
        const unit = raw.advanceTime.unit;
        const amount = raw.advanceTime.amount;
        if ((0, timeAdvanceUnits_js_1.isTimeAdvanceUnit)(unit) && typeof amount === 'number' && amount > 0) {
            advanceTime = { amount: Math.trunc(amount), unit };
        }
    }
    return {
        version: exports.WORLD_ADVANCE_VERSION,
        advanceTime,
        effects,
        note: typeof raw.note === 'string' ? raw.note : undefined,
        batchIdempotencyKey: typeof raw.batchIdempotencyKey === 'string' ? raw.batchIdempotencyKey : undefined,
    };
}
function parseWorldAdvanceBatchPayload(raw) {
    if (!isObject(raw))
        return null;
    if (raw.version !== exports.WORLD_ADVANCE_VERSION)
        return null;
    if (typeof raw.batchId !== 'string' || typeof raw.actorUserId !== 'string')
        return null;
    if (!Array.isArray(raw.effects))
        return null;
    const effects = [];
    for (const entry of raw.effects) {
        const parsed = parseWorldAdvanceEffect(entry);
        if (parsed)
            effects.push(parsed);
    }
    return {
        version: exports.WORLD_ADVANCE_VERSION,
        batchId: raw.batchId,
        actorUserId: raw.actorUserId,
        effects,
        note: typeof raw.note === 'string' ? raw.note : undefined,
        advanceTime: raw.advanceTime,
        previousEpochMinute: String(raw.previousEpochMinute ?? '0'),
        nextEpochMinute: String(raw.nextEpochMinute ?? '0'),
        appliedCount: typeof raw.appliedCount === 'number' ? raw.appliedCount : 0,
        skippedCount: typeof raw.skippedCount === 'number' ? raw.skippedCount : 0,
        synthesisProjection: raw.synthesisProjection,
    };
}
//# sourceMappingURL=worldAdvance.js.map