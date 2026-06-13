"use strict";
/**
 * Map presence resolver — shared between backend and frontend.
 * Single pipeline for layers, revelation, temporal windows, and wiki inheritance.
 *
 * PRESENCE INPUTS: layerId, visibility, revelation, temporal bounds, wiki inheritance only.
 * groupId and UI filters must NEVER be read here — see docs/plans/map-presence-visibility.md.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineStringGeometry = exports.polygonGeometry = exports.parsePointGeometry = exports.WikiVisibilityTier = exports.MapRevelationStates = void 0;
exports.resolveMapObjectPresenceDetailed = resolveMapObjectPresenceDetailed;
exports.resolveMapObjectPresence = resolveMapObjectPresence;
exports.clampViewEpochMinuteForParty = clampViewEpochMinuteForParty;
exports.normalizedPointToDisplay = normalizedPointToDisplay;
exports.displayToNormalizedPoint = displayToNormalizedPoint;
exports.pointGeometry = pointGeometry;
exports.MapRevelationStates = {
    REVEALED: 'REVEALED',
    HIDDEN: 'HIDDEN',
    DRAFT: 'DRAFT',
};
exports.WikiVisibilityTier = {
    PUBLIC: 'Public',
    PARTY: 'Party',
    DM_ONLY: 'DM_Only',
};
function toBigInt(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'bigint')
        return value;
    const trimmed = String(value).trim();
    if (!trimmed)
        return null;
    try {
        return BigInt(trimmed);
    }
    catch {
        return null;
    }
}
function isDmOnlyVisibility(visibility) {
    return visibility === exports.WikiVisibilityTier.DM_ONLY;
}
function evaluateTemporal(object, ctx) {
    const view = ctx.viewEpochMinute;
    if (view === null)
        return null;
    const from = toBigInt(object.visibleFromEpochMinute);
    const until = toBigInt(object.visibleUntilEpochMinute);
    const temporalMeta = {
        viewEpochMinute: view.toString(),
        visibleFromEpochMinute: from?.toString() ?? null,
        visibleUntilEpochMinute: until?.toString() ?? null,
    };
    if (from !== null && view < from) {
        return {
            visible: false,
            reason: 'before_visible_from',
            temporal: temporalMeta,
        };
    }
    if (until !== null && view > until) {
        return {
            visible: false,
            reason: 'after_visible_until',
            temporal: temporalMeta,
        };
    }
    return null;
}
/**
 * Full presence pipeline. When editorGhostMode is on (elevated only), temporal/revelation
 * do not deny visibility but reasons are still computed for badges.
 */
function resolveMapObjectPresenceDetailed(object, ctx) {
    const ghost = Boolean(ctx.editorGhostMode && ctx.isElevated);
    if (object.layerId && !ctx.enabledLayerIds.has(object.layerId)) {
        const resolution = {
            visible: false,
            reason: 'layer_disabled',
        };
        if (ghost)
            return { ...resolution, visible: true };
        return resolution;
    }
    const objectVisibility = object.visibility ?? exports.WikiVisibilityTier.PUBLIC;
    if (!ctx.isElevated &&
        isDmOnlyVisibility(objectVisibility) &&
        !ctx.canViewWiki(objectVisibility)) {
        const resolution = {
            visible: false,
            reason: 'role_dm_only',
        };
        if (ghost)
            return { ...resolution, visible: true };
        return resolution;
    }
    if (!ctx.isElevated) {
        const revelation = object.revelation ?? exports.MapRevelationStates.REVEALED;
        if (revelation === exports.MapRevelationStates.HIDDEN) {
            const resolution = {
                visible: false,
                reason: 'unrevealed',
            };
            if (ghost)
                return { ...resolution, visible: true };
            return resolution;
        }
        if (revelation === exports.MapRevelationStates.DRAFT) {
            const resolution = {
                visible: false,
                reason: 'draft',
            };
            if (ghost)
                return { ...resolution, visible: true };
            return resolution;
        }
    }
    const temporal = evaluateTemporal(object, ctx);
    if (temporal) {
        if (ghost)
            return { ...temporal, visible: true };
        return temporal;
    }
    if (object.targetPageVisibility && !ctx.canViewWiki(object.targetPageVisibility)) {
        const resolution = {
            visible: false,
            reason: 'inherited_wiki_hidden',
        };
        if (ghost)
            return { ...resolution, visible: true };
        return resolution;
    }
    if (object.targetAssetVisibility &&
        !ctx.canViewWiki(object.targetAssetVisibility)) {
        const resolution = {
            visible: false,
            reason: 'inherited_map_hidden',
        };
        if (ghost)
            return { ...resolution, visible: true };
        return resolution;
    }
    if (object.nestedMapHostVisibility &&
        !ctx.canViewWiki(object.nestedMapHostVisibility)) {
        const resolution = {
            visible: false,
            reason: 'inherited_map_hidden',
        };
        if (ghost)
            return { ...resolution, visible: true };
        return resolution;
    }
    if (object.requiresTarget &&
        !object.targetPageId &&
        !object.targetAssetId) {
        const resolution = {
            visible: false,
            reason: 'missing_target',
        };
        if (ghost)
            return { ...resolution, visible: true };
        return resolution;
    }
    return { visible: true, reason: 'visible' };
}
function resolveMapObjectPresence(object, ctx) {
    const detailed = resolveMapObjectPresenceDetailed(object, ctx);
    if (detailed.visible)
        return 'visible';
    if (ctx.isElevated) {
        const partyCtx = {
            ...ctx,
            isElevated: false,
            editorGhostMode: false,
        };
        const partyView = resolveMapObjectPresenceDetailed(object, partyCtx);
        if (!partyView.visible)
            return 'gm-only-hint';
    }
    return 'hidden';
}
/** Clamp party temporal queries to campaign now. */
function clampViewEpochMinuteForParty(requested, campaignNow, isElevated) {
    if (isElevated && requested !== null && requested !== undefined) {
        const parsed = toBigInt(requested);
        if (parsed !== null)
            return parsed;
    }
    return campaignNow;
}
/** Normalized [0,1] point to display pixel space. */
function normalizedPointToDisplay(coordinates, width, height) {
    return {
        x: coordinates[0] * width,
        y: coordinates[1] * height,
    };
}
/** Display pixel space to normalized [0,1]. */
function displayToNormalizedPoint(x, y, width, height) {
    if (width <= 0 || height <= 0)
        return [0, 0];
    return [x / width, y / height];
}
var mapGeometry_1 = require("./mapGeometry");
Object.defineProperty(exports, "parsePointGeometry", { enumerable: true, get: function () { return mapGeometry_1.parsePointGeometry; } });
Object.defineProperty(exports, "polygonGeometry", { enumerable: true, get: function () { return mapGeometry_1.polygonGeometry; } });
Object.defineProperty(exports, "lineStringGeometry", { enumerable: true, get: function () { return mapGeometry_1.lineStringGeometry; } });
function pointGeometry(coordinates) {
    return { type: 'Point', coordinates };
}
//# sourceMappingURL=mapPresence.js.map