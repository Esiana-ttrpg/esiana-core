"use strict";
/**
 * Layer 1 — campaign era + faction trajectory contracts (browser-safe).
 * Advisory pressure layer; does not mutate canon (events, relations, territory).
 * @see docs/platform/faction-momentum.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRESENT_ERA_ID = exports.RISING_TENSION_MOMENTUM_STATES = exports.FACTION_MOMENTUM_STATE_LABELS = exports.FACTION_MOMENTUM_STATES = exports.CAMPAIGN_MOMENTUM_SEMANTICS_VERSION = void 0;
exports.createDefaultPresentEra = createDefaultPresentEra;
exports.createDefaultCampaignMomentumState = createDefaultCampaignMomentumState;
exports.normalizeCampaignEra = normalizeCampaignEra;
exports.parseCampaignMomentumState = parseCampaignMomentumState;
exports.serializeCampaignMomentumState = serializeCampaignMomentumState;
exports.getCurrentCampaignEra = getCurrentCampaignEra;
exports.resolveCampaignEraAtEpoch = resolveCampaignEraAtEpoch;
exports.normalizeFactionEraTrajectory = normalizeFactionEraTrajectory;
exports.normalizeFactionEraTrajectories = normalizeFactionEraTrajectories;
exports.CAMPAIGN_MOMENTUM_SEMANTICS_VERSION = 'campaign-momentum-v1';
exports.FACTION_MOMENTUM_STATES = [
    'rising',
    'stable',
    'fragmenting',
    'declining',
    'dormant',
    'expanding',
    'desperate',
    'resurgent',
];
exports.FACTION_MOMENTUM_STATE_LABELS = {
    rising: 'Rising',
    stable: 'Stable',
    fragmenting: 'Fragmenting',
    declining: 'Declining',
    dormant: 'Dormant',
    expanding: 'Expanding',
    desperate: 'Desperate',
    resurgent: 'Resurgent',
};
/** States that surface as "rising tension" in world pressure projection. */
exports.RISING_TENSION_MOMENTUM_STATES = [
    'rising',
    'expanding',
    'fragmenting',
    'desperate',
    'resurgent',
    'declining',
];
exports.DEFAULT_PRESENT_ERA_ID = 'era-present';
function createDefaultPresentEra() {
    return {
        id: exports.DEFAULT_PRESENT_ERA_ID,
        name: 'Present',
        sortOrder: 0,
        isCurrent: true,
        epochStartMinute: null,
        epochEndMinute: null,
        narrativeNote: null,
    };
}
function createDefaultCampaignMomentumState() {
    return {
        version: exports.CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
        eras: [createDefaultPresentEra()],
        worldPressurePaused: false,
    };
}
function normalizeEpochMinute(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'bigint')
        return raw.toString();
    if (typeof raw === 'number' && Number.isFinite(raw))
        return String(Math.trunc(raw));
    if (typeof raw === 'string' && raw.trim() !== '')
        return raw.trim();
    return null;
}
function normalizeMomentumState(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    return exports.FACTION_MOMENTUM_STATES.includes(lower)
        ? lower
        : null;
}
function normalizePressure(raw) {
    if (raw === null || raw === undefined)
        return null;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n))
        return null;
    return Math.max(0, Math.min(100, Math.round(n)));
}
function normalizeEraId(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeEraName(raw, fallback) {
    if (typeof raw !== 'string')
        return fallback;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 120) : fallback;
}
function normalizeNarrativeNote(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}
function normalizeCampaignEra(raw, index) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const id = normalizeEraId(obj.id);
    if (!id)
        return null;
    return {
        id,
        name: normalizeEraName(obj.name, `Era ${index + 1}`),
        sortOrder: typeof obj.sortOrder === 'number' && Number.isFinite(obj.sortOrder)
            ? Math.trunc(obj.sortOrder)
            : index,
        isCurrent: obj.isCurrent === true,
        epochStartMinute: normalizeEpochMinute(obj.epochStartMinute),
        epochEndMinute: normalizeEpochMinute(obj.epochEndMinute),
        narrativeNote: normalizeNarrativeNote(obj.narrativeNote),
    };
}
function parseCampaignMomentumState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return createDefaultCampaignMomentumState();
    }
    const obj = raw;
    const erasRaw = Array.isArray(obj.eras) ? obj.eras : [];
    const eras = erasRaw
        .map((era, index) => normalizeCampaignEra(era, index))
        .filter((era) => era !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    if (eras.length === 0) {
        return createDefaultCampaignMomentumState();
    }
    const currentCount = eras.filter((e) => e.isCurrent).length;
    const normalizedEras = currentCount === 1
        ? eras
        : eras.map((era, index) => ({
            ...era,
            isCurrent: index === 0,
        }));
    return {
        version: exports.CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
        eras: normalizedEras,
        worldPressurePaused: obj.worldPressurePaused === true,
    };
}
function serializeCampaignMomentumState(state) {
    return {
        version: exports.CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
        eras: state.eras.map((era) => ({
            id: era.id,
            name: era.name,
            sortOrder: era.sortOrder,
            isCurrent: era.isCurrent,
            epochStartMinute: era.epochStartMinute,
            epochEndMinute: era.epochEndMinute,
            narrativeNote: era.narrativeNote,
        })),
        worldPressurePaused: state.worldPressurePaused === true,
    };
}
function getCurrentCampaignEra(state) {
    return state.eras.find((e) => e.isCurrent) ?? state.eras[0] ?? createDefaultPresentEra();
}
function eraContainsEpochMinute(era, target) {
    const startRaw = era.epochStartMinute;
    const endRaw = era.epochEndMinute;
    if (startRaw == null && endRaw == null)
        return false;
    const start = startRaw != null ? BigInt(startRaw) : null;
    const end = endRaw != null ? BigInt(endRaw) : null;
    if (start != null && target < start)
        return false;
    if (end != null && target > end)
        return false;
    return true;
}
function eraSpanWidth(era) {
    const startRaw = era.epochStartMinute;
    const endRaw = era.epochEndMinute;
    if (startRaw == null || endRaw == null)
        return null;
    const width = BigInt(endRaw) - BigInt(startRaw);
    return width >= 0n ? width : null;
}
/** Resolve which authored era applies at a target epoch (bounds-based; falls back to current). */
function resolveCampaignEraAtEpoch(state, targetEpochMinute) {
    let target;
    try {
        target = BigInt(targetEpochMinute);
        if (target < 0n)
            return getCurrentCampaignEra(state);
    }
    catch {
        return getCurrentCampaignEra(state);
    }
    const matches = state.eras.filter((era) => eraContainsEpochMinute(era, target));
    if (matches.length === 0) {
        return getCurrentCampaignEra(state);
    }
    matches.sort((a, b) => {
        const widthA = eraSpanWidth(a);
        const widthB = eraSpanWidth(b);
        if (widthA != null && widthB != null && widthA !== widthB) {
            return widthA < widthB ? -1 : 1;
        }
        if (widthA != null && widthB == null)
            return -1;
        if (widthA == null && widthB != null)
            return 1;
        return a.sortOrder - b.sortOrder;
    });
    return matches[0] ?? getCurrentCampaignEra(state);
}
function normalizeFactionEraTrajectory(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const eraId = normalizeEraId(obj.eraId);
    const momentumState = normalizeMomentumState(obj.momentumState);
    if (!eraId || !momentumState)
        return null;
    return {
        eraId,
        momentumState,
        pressure: normalizePressure(obj.pressure),
        gmNote: normalizeNarrativeNote(obj.gmNote),
    };
}
function normalizeFactionEraTrajectories(raw) {
    if (!Array.isArray(raw))
        return [];
    const seen = new Set();
    const result = [];
    for (const item of raw) {
        const trajectory = normalizeFactionEraTrajectory(item);
        if (!trajectory || seen.has(trajectory.eraId))
            continue;
        seen.add(trajectory.eraId);
        result.push(trajectory);
    }
    return result;
}
//# sourceMappingURL=factionMomentumMetadata.js.map