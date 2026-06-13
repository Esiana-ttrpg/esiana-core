"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePresenceState = exports.projectPageDiscovery = exports.isEntityDiscovered = exports.TEMPORAL_PROJECTION_POLICIES = exports.TemporalHistoricalMode = exports.TemporalProjectionSurface = exports.NarrativeVisibilityTier = void 0;
exports.isElevatedRole = isElevatedRole;
exports.derivePerspective = derivePerspective;
exports.buildNarrativeViewerCapabilities = buildNarrativeViewerCapabilities;
exports.buildNarrativeViewerContext = buildNarrativeViewerContext;
exports.isManagerView = isManagerView;
exports.fromChronologyVisibility = fromChronologyVisibility;
exports.fromWikiMapVisibility = fromWikiMapVisibility;
exports.fromRelationVisibility = fromRelationVisibility;
exports.projectRoleVisibility = projectRoleVisibility;
exports.projectRevelation = projectRevelation;
exports.projectRevelationFromMap = projectRevelationFromMap;
exports.resolveMapObjectRevelationState = resolveMapObjectRevelationState;
exports.normalizeChronologyDateInput = normalizeChronologyDateInput;
exports.resolveTemporalView = resolveTemporalView;
exports.projectWikiPageVisibility = projectWikiPageVisibility;
exports.projectTimelineEventVisibility = projectTimelineEventVisibility;
exports.isTimelineEventVisible = isTimelineEventVisible;
exports.projectLoreAtDate = projectLoreAtDate;
exports.projectEntityRelation = projectEntityRelation;
exports.isEntityRelationVisible = isEntityRelationVisible;
exports.projectMapSceneContext = projectMapSceneContext;
exports.isPresenceVisibleToContext = isPresenceVisibleToContext;
exports.buildRevelationViewerContext = buildRevelationViewerContext;
exports.projectPublishedNarrative = projectPublishedNarrative;
/**
 * Layer 1 — unified narrative projection semantics.
 * Centralizes viewer context, revelation, role visibility, and temporal policy.
 * @see docs/platform/narrative-projection-semantics.md
 */
const contentPresence_js_1 = require("./contentPresence.js");
const discoveryProjection_js_1 = require("./discoveryProjection.js");
Object.defineProperty(exports, "isEntityDiscovered", { enumerable: true, get: function () { return discoveryProjection_js_1.isEntityDiscovered; } });
Object.defineProperty(exports, "projectPageDiscovery", { enumerable: true, get: function () { return discoveryProjection_js_1.projectPageDiscovery; } });
Object.defineProperty(exports, "resolvePresenceState", { enumerable: true, get: function () { return discoveryProjection_js_1.resolvePresenceState; } });
const mapPresence_js_1 = require("./mapPresence.js");
const narrativeLifecycle_js_1 = require("./narrativeLifecycle.js");
const chronologyTypes_js_1 = require("./chronologyTypes.js");
const membershipRoles_js_1 = require("./campaignPolicy/membershipRoles.js");
exports.NarrativeVisibilityTier = {
    PUBLIC: 'PUBLIC',
    PARTY: 'PARTY',
    ELEVATED_ONLY: 'ELEVATED_ONLY',
    SECRET: 'SECRET',
};
exports.TemporalProjectionSurface = {
    MAP_SCENE: 'map_scene',
    LORE_SUMMARY: 'lore_summary',
    CHRONOLOGY_TIMELINE: 'chronology_timeline',
    ENTITY_GRAPH: 'entity_graph',
    SESSION_CHRONICLE: 'session_chronicle',
};
exports.TemporalHistoricalMode = {
    EPOCH_VIEW: 'epoch_view',
    DATE_PARTS_VIEW: 'date_parts_view',
    PRESENT_ONLY: 'present_only',
};
exports.TEMPORAL_PROJECTION_POLICIES = {
    [exports.TemporalProjectionSurface.MAP_SCENE]: {
        surface: exports.TemporalProjectionSurface.MAP_SCENE,
        historicalMode: exports.TemporalHistoricalMode.EPOCH_VIEW,
        partyClampsToCampaignPresent: true,
        elevatedAcceptsHistoricalInput: true,
    },
    [exports.TemporalProjectionSurface.LORE_SUMMARY]: {
        surface: exports.TemporalProjectionSurface.LORE_SUMMARY,
        historicalMode: exports.TemporalHistoricalMode.DATE_PARTS_VIEW,
        partyClampsToCampaignPresent: false,
        elevatedAcceptsHistoricalInput: true,
    },
    [exports.TemporalProjectionSurface.CHRONOLOGY_TIMELINE]: {
        surface: exports.TemporalProjectionSurface.CHRONOLOGY_TIMELINE,
        historicalMode: exports.TemporalHistoricalMode.PRESENT_ONLY,
        partyClampsToCampaignPresent: true,
        elevatedAcceptsHistoricalInput: false,
    },
    [exports.TemporalProjectionSurface.ENTITY_GRAPH]: {
        surface: exports.TemporalProjectionSurface.ENTITY_GRAPH,
        historicalMode: exports.TemporalHistoricalMode.PRESENT_ONLY,
        partyClampsToCampaignPresent: true,
        elevatedAcceptsHistoricalInput: false,
    },
    [exports.TemporalProjectionSurface.SESSION_CHRONICLE]: {
        surface: exports.TemporalProjectionSurface.SESSION_CHRONICLE,
        historicalMode: exports.TemporalHistoricalMode.PRESENT_ONLY,
        partyClampsToCampaignPresent: true,
        elevatedAcceptsHistoricalInput: false,
    },
};
function isElevatedRole(role) {
    if (role && (0, membershipRoles_js_1.isElevatedMembershipRole)(role))
        return true;
    return role === 'DM' || role === 'Co-DM';
}
function derivePerspective(isElevated) {
    return isElevated ? 'elevated' : 'party';
}
function buildNarrativeViewerCapabilities(role, allowPlayerChronologyManagement = false) {
    const elevated = isElevatedRole(role);
    const canManageChronology = elevated ||
        (role === 'PARTICIPANT' && allowPlayerChronologyManagement) ||
        (role === 'Player' && allowPlayerChronologyManagement);
    return {
        canManageChronology,
        canRevealContent: elevated,
        canUseGhostMode: elevated,
        isElevatedWiki: elevated,
        isElevatedMap: elevated,
    };
}
function buildNarrativeViewerContext(input) {
    const elevated = isElevatedRole(input.role);
    return {
        perspective: derivePerspective(elevated),
        role: input.role,
        capabilities: buildNarrativeViewerCapabilities(input.role, input.allowPlayerChronologyManagement),
        campaignNow: input.campaignNow,
    };
}
function isManagerView(ctx) {
    return ctx.perspective === 'elevated';
}
function fromChronologyVisibility(visibility) {
    const normalized = String(visibility ?? 'PUBLIC').trim().toUpperCase();
    if (normalized === 'DM_ONLY')
        return exports.NarrativeVisibilityTier.ELEVATED_ONLY;
    if (normalized === 'PARTY')
        return exports.NarrativeVisibilityTier.PARTY;
    return exports.NarrativeVisibilityTier.PUBLIC;
}
function fromWikiMapVisibility(visibility) {
    const normalized = String(visibility ?? mapPresence_js_1.WikiVisibilityTier.PUBLIC).trim();
    if (normalized === mapPresence_js_1.WikiVisibilityTier.DM_ONLY ||
        normalized.toUpperCase() === 'DM_ONLY') {
        return exports.NarrativeVisibilityTier.ELEVATED_ONLY;
    }
    if (normalized === mapPresence_js_1.WikiVisibilityTier.PARTY) {
        return exports.NarrativeVisibilityTier.PARTY;
    }
    return exports.NarrativeVisibilityTier.PUBLIC;
}
function fromRelationVisibility(visibility) {
    const normalized = String(visibility ?? 'GM_ONLY').trim().toUpperCase();
    if (normalized === 'SECRET')
        return exports.NarrativeVisibilityTier.SECRET;
    if (normalized === 'GM_ONLY')
        return exports.NarrativeVisibilityTier.ELEVATED_ONLY;
    if (normalized === 'PARTY')
        return exports.NarrativeVisibilityTier.PARTY;
    return exports.NarrativeVisibilityTier.PUBLIC;
}
function projectRoleVisibility(tier, ctx) {
    if (ctx.perspective === 'elevated') {
        return { visible: true, tier, denyReason: 'visible' };
    }
    if (tier === exports.NarrativeVisibilityTier.ELEVATED_ONLY ||
        tier === exports.NarrativeVisibilityTier.SECRET) {
        return {
            visible: false,
            tier,
            denyReason: tier === exports.NarrativeVisibilityTier.SECRET
                ? 'role_secret'
                : 'role_elevated_only',
        };
    }
    return { visible: true, tier, denyReason: 'visible' };
}
function projectRevelation(presenceState, ctx, revelation) {
    const manager = isManagerView(ctx);
    const visible = (0, discoveryProjection_js_1.isEntityDiscovered)(presenceState, manager);
    let denyReason;
    if (!visible) {
        denyReason =
            presenceState === contentPresence_js_1.ContentRevelationStates.DRAFT ? 'draft' : 'unrevealed';
    }
    return {
        visible,
        presenceState,
        denyReason: visible ? 'visible' : denyReason,
        revelation,
    };
}
function projectRevelationFromMap(presenceState, ctx) {
    return projectRevelation(presenceState, ctx);
}
/**
 * Merge order: ContentPresenceState override → keyframe revelation → column revelation.
 */
function resolveMapObjectRevelationState(input) {
    if (input.presenceOverride)
        return input.presenceOverride;
    const keyframe = input.keyframeRevelation;
    if (keyframe === mapPresence_js_1.MapRevelationStates.REVEALED ||
        keyframe === mapPresence_js_1.MapRevelationStates.HIDDEN ||
        keyframe === mapPresence_js_1.MapRevelationStates.DRAFT) {
        return keyframe;
    }
    const column = input.columnRevelation;
    if (column === mapPresence_js_1.MapRevelationStates.REVEALED ||
        column === mapPresence_js_1.MapRevelationStates.HIDDEN ||
        column === mapPresence_js_1.MapRevelationStates.DRAFT) {
        return column;
    }
    return contentPresence_js_1.ContentRevelationStates.REVEALED;
}
function normalizeChronologyDateInput(raw) {
    return (0, chronologyTypes_js_1.normalizeChronologyDateParts)(raw);
}
function epochMinutesEqual(a, b) {
    return a === b;
}
function resolveTemporalView(input) {
    const policy = exports.TEMPORAL_PROJECTION_POLICIES[input.surface];
    const campaignEpoch = input.ctx.campaignNow.epochMinute;
    const campaignDate = input.ctx.campaignNow.dateParts;
    const elevated = input.ctx.perspective === 'elevated';
    let effectiveEpoch = campaignEpoch;
    let requestedEpochIgnored = true;
    let requestedDateIgnored = true;
    if (policy.historicalMode === exports.TemporalHistoricalMode.EPOCH_VIEW) {
        const requested = toBigIntSafe(input.requestedEpochMinute);
        effectiveEpoch = (0, mapPresence_js_1.clampViewEpochMinuteForParty)(input.requestedEpochMinute ?? null, campaignEpoch, elevated);
        requestedEpochIgnored =
            requested !== null && requested !== effectiveEpoch;
    }
    let effectiveDate = campaignDate;
    if (policy.historicalMode === exports.TemporalHistoricalMode.DATE_PARTS_VIEW) {
        if (input.requestedDateParts) {
            effectiveDate = input.requestedDateParts;
            requestedDateIgnored = false;
        }
    }
    const isCampaignPresent = policy.historicalMode === exports.TemporalHistoricalMode.EPOCH_VIEW
        ? epochMinutesEqual(effectiveEpoch, campaignEpoch)
        : datesEqual(effectiveDate, campaignDate);
    return {
        policy,
        effectiveEpochMinute: effectiveEpoch,
        effectiveDateParts: effectiveDate,
        isCampaignPresent,
        requestedEpochIgnored,
        requestedDateIgnored,
    };
}
function toBigIntSafe(value) {
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
function datesEqual(a, b) {
    return ((a.year ?? null) === (b.year ?? null) &&
        (a.month ?? null) === (b.month ?? null) &&
        (a.day ?? null) === (b.day ?? null));
}
function projectWikiPageVisibility(pageId, presenceMap, ctx, revelation) {
    const presenceState = (0, discoveryProjection_js_1.resolvePresenceState)(presenceMap, pageId);
    const revelationProjection = projectRevelation(presenceState, ctx, revelation);
    const discovery = (0, discoveryProjection_js_1.projectPageDiscovery)(pageId, presenceMap, isManagerView(ctx), revelation);
    return {
        visible: revelationProjection.visible,
        revelation: revelationProjection,
        discovery,
    };
}
function projectTimelineEventVisibility(eventId, eventVisibility, presenceMap, ctx, revelation) {
    const presenceState = (0, discoveryProjection_js_1.resolvePresenceState)(presenceMap, eventId);
    const revelationProjection = projectRevelation(presenceState, ctx, revelation);
    const role = projectRoleVisibility(fromChronologyVisibility(eventVisibility), ctx);
    return {
        visible: revelationProjection.visible && role.visible,
        revelation: revelationProjection,
        role,
    };
}
function isTimelineEventVisible(projection) {
    return projection.visible;
}
function projectLoreAtDate(ctx, requestedViewDate) {
    return resolveTemporalView({
        surface: exports.TemporalProjectionSurface.LORE_SUMMARY,
        ctx,
        requestedDateParts: requestedViewDate ?? null,
    });
}
function projectEntityRelation(visibility, ctx) {
    const role = projectRoleVisibility(fromRelationVisibility(visibility), ctx);
    const temporal = resolveTemporalView({
        surface: exports.TemporalProjectionSurface.ENTITY_GRAPH,
        ctx,
    });
    return {
        visible: role.visible,
        role,
        temporal,
    };
}
function isEntityRelationVisible(projection) {
    return projection.visible;
}
function projectMapSceneContext(ctx, options) {
    const temporal = resolveTemporalView({
        surface: exports.TemporalProjectionSurface.MAP_SCENE,
        ctx,
        requestedEpochMinute: options.requestedViewEpochMinute ?? null,
    });
    const isElevated = ctx.perspective === 'elevated';
    const presenceContext = {
        isElevated,
        enabledLayerIds: options.enabledLayerIds,
        viewEpochMinute: temporal.effectiveEpochMinute,
        editorGhostMode: Boolean(options.editorGhostMode && ctx.capabilities.canUseGhostMode),
        debugPresence: Boolean(options.debugPresence && ctx.capabilities.canUseGhostMode),
        canViewWiki: options.canViewWiki,
    };
    return { presenceContext, temporal };
}
function isPresenceVisibleToContext(presenceState, ctx) {
    return projectRevelation(presenceState, ctx).visible;
}
function buildRevelationViewerContext(input) {
    const ctx = buildNarrativeViewerContext({
        role: input.role,
        campaignNow: input.campaignNow ?? {
            epochMinute: 0n,
            dateParts: { year: 1, month: 0, day: 1 },
        },
    });
    const elevated = input.isManagerView === true ||
        input.canManage === true ||
        ctx.perspective === 'elevated';
    if (elevated && ctx.perspective === 'party') {
        return { ...ctx, perspective: 'elevated' };
    }
    return ctx;
}
const DM_ONLY_BLOCK_TYPES = new Set(['dmSecret', 'dmOnly', 'dm_note']);
function stripDmOnlyBlocks(blocks) {
    if (!Array.isArray(blocks))
        return [];
    return blocks.filter((block) => {
        if (!block || typeof block !== 'object')
            return false;
        const type = block.type;
        return typeof type !== 'string' || !DM_ONLY_BLOCK_TYPES.has(type);
    });
}
/**
 * Layer 2 — controlled export from orchestration data to player-visible surfaces.
 */
function projectPublishedNarrative(input) {
    const meta = input.metadata && typeof input.metadata === 'object'
        ? { ...input.metadata }
        : null;
    if (meta?.orchestrationOnly === true) {
        return {
            included: false,
            blocks: [],
            metadata: meta,
            lifecycleState: input.lifecycleState,
            denyReason: 'orchestration_only',
        };
    }
    const lifecycleProjection = (0, narrativeLifecycle_js_1.projectNarrativeLifecycle)(input.lifecycleState, input.viewerContext);
    if (!lifecycleProjection.partyVisible) {
        return {
            included: false,
            blocks: [],
            metadata: meta,
            lifecycleState: input.lifecycleState,
            denyReason: 'locked',
        };
    }
    if (input.viewerContext.perspective === 'party' &&
        !(0, narrativeLifecycle_js_1.isLifecyclePartyVisible)(input.lifecycleState)) {
        return {
            included: false,
            blocks: [],
            metadata: meta,
            lifecycleState: input.lifecycleState,
            denyReason: 'locked',
        };
    }
    const roleProjection = projectRoleVisibility(fromWikiMapVisibility(input.visibility), input.viewerContext);
    if (!roleProjection.visible) {
        return {
            included: false,
            blocks: [],
            metadata: meta,
            lifecycleState: lifecycleProjection.visible,
            denyReason: 'role_hidden',
        };
    }
    return {
        included: true,
        blocks: stripDmOnlyBlocks(input.blocks),
        metadata: meta,
        lifecycleState: lifecycleProjection.visible,
    };
}
//# sourceMappingURL=narrativeProjection.js.map