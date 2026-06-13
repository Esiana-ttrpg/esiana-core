"use strict";
/**
 * Workshop draft documents — draft state, not draft category.
 * @see docs/plans/authoring-workflow.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKSHOP_FORMALIZE_TARGETS = exports.WORKSHOP_DRAFT_STATUSES = exports.WORKSHOP_DRAFTS_ROOT_TITLE = void 0;
exports.isWorkshopDraftMetadata = isWorkshopDraftMetadata;
exports.isWorkshopDraftsRootMetadata = isWorkshopDraftsRootMetadata;
exports.buildWorkshopDraftMetadata = buildWorkshopDraftMetadata;
exports.buildWorkshopDraftsRootMetadata = buildWorkshopDraftsRootMetadata;
exports.WORKSHOP_DRAFTS_ROOT_TITLE = '_Workshop Drafts';
exports.WORKSHOP_DRAFT_STATUSES = ['active', 'formalized', 'discarded'];
exports.WORKSHOP_FORMALIZE_TARGETS = [
    'character',
    'quest',
    'thread',
    'scene',
    'lore_note',
];
function isWorkshopDraftMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return false;
    const raw = metadata;
    return raw.isDraft === true && raw.draftOrigin === 'workshop';
}
function isWorkshopDraftsRootMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object')
        return false;
    const raw = metadata;
    return raw.workshopDraftsRoot === true;
}
function buildWorkshopDraftMetadata(input) {
    return {
        isDraft: true,
        draftOrigin: 'workshop',
        draftStatus: 'active',
        draftOriginSurface: 'progression',
        authorUserId: input.authorUserId,
        anchorEntityIds: input.anchorEntityIds?.length ? input.anchorEntityIds : undefined,
        sourceKind: input.sourceKind,
        formalizedAt: null,
        formalizedPageId: null,
        hidden: true,
    };
}
function buildWorkshopDraftsRootMetadata() {
    return {
        workshopDraftsRoot: true,
        hidden: true,
    };
}
//# sourceMappingURL=workshopDocument.js.map