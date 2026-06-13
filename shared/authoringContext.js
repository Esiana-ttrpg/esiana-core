"use strict";
/**
 * Layer 5 — authoring context (UI/session, not canonical content).
 * @see docs/plans/authoring-workflow.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FREEFORM_AUTHORING_CONTEXT = exports.AUTHORING_OVERLAY_IDS = exports.AUTHORING_CONTEXT_KINDS = void 0;
exports.parseAuthoringContextFromSearch = parseAuthoringContextFromSearch;
exports.buildAuthoringWorkshopHref = buildAuthoringWorkshopHref;
exports.readWorkshopDraftIdFromSearch = readWorkshopDraftIdFromSearch;
exports.inferAuthoringKindFromMetadata = inferAuthoringKindFromMetadata;
exports.AUTHORING_CONTEXT_KINDS = [
    'freeform',
    'narrative_workspace',
    'arc',
    'questline',
    'scene',
    'session_prep',
    'chronicle',
];
exports.AUTHORING_OVERLAY_IDS = [
    'mystery-structure',
    'three-act-pacing',
    'open-threads',
    'arc-progress',
];
exports.FREEFORM_AUTHORING_CONTEXT = {
    kind: 'freeform',
};
function parseAuthoringContextFromSearch(search) {
    const params = new URLSearchParams(search);
    const kind = params.get('authoringKind');
    const anchors = params.get('anchors');
    const overlays = params.get('overlays');
    const parsedKind = kind && exports.AUTHORING_CONTEXT_KINDS.includes(kind)
        ? kind
        : 'narrative_workspace';
    const anchorEntityIds = anchors
        ? anchors
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined;
    const overlayIds = overlays
        ? overlays
            .split(',')
            .map((id) => id.trim())
            .filter((id) => exports.AUTHORING_OVERLAY_IDS.includes(id))
        : undefined;
    return {
        kind: parsedKind,
        anchorEntityIds: anchorEntityIds?.length ? anchorEntityIds : undefined,
        overlayIds: overlayIds?.length ? overlayIds : undefined,
    };
}
function buildAuthoringWorkshopHref(basePath, context) {
    const kind = context.kind ?? 'narrative_workspace';
    const params = new URLSearchParams();
    if (kind === 'scene') {
        params.set('section', 'scenes');
        if (context.anchorEntityIds?.length) {
            params.set('anchors', context.anchorEntityIds.join(','));
        }
    }
    else {
        params.set('section', 'workshop');
        if (kind !== 'freeform') {
            params.set('authoringKind', kind);
        }
        if (context.anchorEntityIds?.length) {
            params.set('anchors', context.anchorEntityIds.join(','));
        }
        if (context.overlayIds?.length) {
            params.set('overlays', context.overlayIds.join(','));
        }
    }
    return `${basePath}?${params.toString()}`;
}
function readWorkshopDraftIdFromSearch(search) {
    const params = new URLSearchParams(search);
    const draft = params.get('draft')?.trim();
    return draft || null;
}
function inferAuthoringKindFromMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return null;
    const raw = metadata;
    if (raw.arcKind !== undefined || raw.arcMetadataVersion !== undefined)
        return 'arc';
    if (raw.sceneStatus !== undefined || raw.beatType !== undefined)
        return 'scene';
    if (raw.questStatus !== undefined || raw.questType !== undefined)
        return 'questline';
    if (raw.threadKind !== undefined)
        return 'chronicle';
    return null;
}
//# sourceMappingURL=authoringContext.js.map