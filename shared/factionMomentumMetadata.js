"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRESENT_ERA_ID = exports.DEFAULT_TRAJECTORY_MOMENTUM_STATE = exports.RISING_TENSION_MOMENTUM_STATES = exports.FACTION_MOMENTUM_STATE_LABELS = exports.FACTION_MOMENTUM_STATES = exports.CAMPAIGN_MOMENTUM_SEMANTICS_VERSION = void 0;
exports.organizationWorldStateToMomentum = organizationWorldStateToMomentum;
exports.resolveExplicitTrajectoryForEra = resolveExplicitTrajectoryForEra;
exports.resolveFactionTrajectoryForEra = resolveFactionTrajectoryForEra;
exports.createEraTrajectory = createEraTrajectory;
exports.createFactionEraTrajectory = createFactionEraTrajectory;
exports.createDefaultPresentEra = createDefaultPresentEra;
exports.createDefaultCampaignMomentumState = createDefaultCampaignMomentumState;
exports.normalizeCampaignEra = normalizeCampaignEra;
exports.parseCampaignMomentumState = parseCampaignMomentumState;
exports.serializeCampaignMomentumState = serializeCampaignMomentumState;
exports.getCurrentCampaignEra = getCurrentCampaignEra;
exports.resolveCampaignEraAtEpoch = resolveCampaignEraAtEpoch;
exports.normalizeEraTrajectory = normalizeEraTrajectory;
exports.normalizeEraTrajectories = normalizeEraTrajectories;
exports.normalizeFactionEraTrajectory = normalizeFactionEraTrajectory;
exports.normalizeFactionEraTrajectories = normalizeFactionEraTrajectories;
const worldDevelopmentMetadata_js_1 = require("./worldDevelopmentMetadata.js");
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
/** Legacy organization world-state labels → era trajectory momentum (advisory fallback). */
const ORGANIZATION_WORLD_STATE_TO_MOMENTUM = {
    rising: 'rising',
    fragmented: 'fragmenting',
    dormant: 'dormant',
    expanding: 'expanding',
    schismatic: 'fragmenting',
    occupied: 'declining',
    exiled: 'declining',
    corrupt: 'desperate',
    reforming: 'resurgent',
    declining: 'declining',
};
function organizationWorldStateToMomentum(worldState) {
    if (!worldState || typeof worldState !== 'string')
        return null;
    const key = worldState.trim().toLowerCase();
    return Object.hasOwn(ORGANIZATION_WORLD_STATE_TO_MOMENTUM, key)
        ? ORGANIZATION_WORLD_STATE_TO_MOMENTUM[key] ?? null
        : null;
}
/**
 * Engine default for new trajectories — least directional existing state.
 * Not inferred from GM-authored `direction` text.
 */
exports.DEFAULT_TRAJECTORY_MOMENTUM_STATE = 'stable';
function trajectoryAppliesToEra(trajectory, currentEra, eras) {
    const fromEra = eras.find((era) => era.id === trajectory.eraId);
    if (!fromEra) {
        return trajectory.eraId === currentEra.id;
    }
    if (currentEra.sortOrder < fromEra.sortOrder)
        return false;
    if (trajectory.byEraId == null)
        return true;
    const byEra = eras.find((era) => era.id === trajectory.byEraId);
    if (!byEra)
        return true;
    return currentEra.sortOrder <= byEra.sortOrder;
}
function pickExplicitTrajectoryMatch(eraTrajectories, eraId, eras) {
    const currentEra = eras.find((era) => era.id === eraId);
    if (eras.length > 0 && currentEra) {
        const matches = eraTrajectories.filter((trajectory) => trajectoryAppliesToEra(trajectory, currentEra, eras));
        if (matches.length === 0)
            return null;
        matches.sort((a, b) => {
            const aExact = a.eraId === eraId ? 1 : 0;
            const bExact = b.eraId === eraId ? 1 : 0;
            if (aExact !== bExact)
                return bExact - aExact;
            const aFrom = eras.find((era) => era.id === a.eraId)?.sortOrder ?? -1;
            const bFrom = eras.find((era) => era.id === b.eraId)?.sortOrder ?? -1;
            return bFrom - aFrom;
        });
        return matches[0] ?? null;
    }
    return eraTrajectories.find((t) => t.eraId === eraId) ?? null;
}
/**
 * Explicit From/By resolution for any subject — no world-state fallback.
 * Characters and Locations use this path only.
 */
function resolveExplicitTrajectoryForEra(input) {
    return pickExplicitTrajectoryMatch(input.eraTrajectories, input.eraId, input.eras ?? []);
}
/**
 * Prefer explicit era trajectory (From/By range when eras provided);
 * fall back to organization world state for the target era.
 * Organization-only compatibility path — do not use for Characters/Locations.
 */
function resolveFactionTrajectoryForEra(input) {
    const explicit = resolveExplicitTrajectoryForEra({
        eraTrajectories: input.eraTrajectories,
        eraId: input.eraId,
        eras: input.eras,
    });
    if (explicit)
        return explicit;
    const momentumState = organizationWorldStateToMomentum(input.worldState);
    if (!momentumState)
        return null;
    return {
        eraId: input.eraId,
        byEraId: null,
        direction: null,
        outcome: null,
        momentumState,
        pressure: null,
        gmNote: null,
    };
}
/** Create a planning-only trajectory (Characters / Locations). */
function createEraTrajectory(patch) {
    return {
        eraId: patch.eraId,
        byEraId: patch.byEraId ?? null,
        direction: patch.direction ?? null,
        outcome: patch.outcome ?? null,
        gmNote: patch.gmNote ?? null,
    };
}
function createFactionEraTrajectory(patch) {
    return {
        ...createEraTrajectory(patch),
        momentumState: patch.momentumState ?? exports.DEFAULT_TRAJECTORY_MOMENTUM_STATE,
        pressure: patch.pressure ?? null,
    };
}
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
function normalizeShortText(raw, maxLen) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed.slice(0, maxLen) : null;
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
    const worldDevelopment = obj.worldDevelopment != null ? (0, worldDevelopmentMetadata_js_1.parseWorldDevelopmentSettings)(obj.worldDevelopment) : undefined;
    return {
        version: exports.CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
        eras: normalizedEras,
        worldPressurePaused: obj.worldPressurePaused === true,
        worldDevelopment,
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
        ...(state.worldDevelopment ? { worldDevelopment: state.worldDevelopment } : {}),
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
/** Normalize shared planning fields (Characters / Locations). Requires eraId only. */
function normalizeEraTrajectory(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const eraId = normalizeEraId(obj.eraId);
    if (!eraId)
        return null;
    return {
        eraId,
        byEraId: normalizeEraId(obj.byEraId),
        direction: normalizeShortText(obj.direction, 120),
        outcome: normalizeShortText(obj.outcome, 200),
        gmNote: normalizeNarrativeNote(obj.gmNote),
    };
}
function normalizeEraTrajectories(raw) {
    if (!Array.isArray(raw))
        return [];
    const seen = new Set();
    const result = [];
    for (const item of raw) {
        const trajectory = normalizeEraTrajectory(item);
        if (!trajectory || seen.has(trajectory.eraId))
            continue;
        seen.add(trajectory.eraId);
        result.push(trajectory);
    }
    return result;
}
function normalizeFactionEraTrajectory(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const base = normalizeEraTrajectory(raw);
    const momentumState = normalizeMomentumState(obj.momentumState);
    if (!base || !momentumState)
        return null;
    return {
        ...base,
        momentumState,
        pressure: normalizePressure(obj.pressure),
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