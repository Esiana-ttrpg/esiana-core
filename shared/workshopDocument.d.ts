/**
 * Workshop draft documents — draft state, not draft category.
 * @see docs/plans/authoring-workflow.md
 */
import type { AuthoringContextKind } from './authoringContext.js';
export declare const WORKSHOP_DRAFTS_ROOT_TITLE = "_Workshop Drafts";
export declare const WORKSHOP_DRAFT_STATUSES: readonly ["active", "formalized", "discarded"];
export type WorkshopDraftStatus = (typeof WORKSHOP_DRAFT_STATUSES)[number];
export declare const WORKSHOP_FORMALIZE_TARGETS: readonly ["character", "quest", "thread", "scene", "lore_note"];
export type WorkshopFormalizeTarget = (typeof WORKSHOP_FORMALIZE_TARGETS)[number];
export interface FormalizeWorkshopDraftInput {
    target: WorkshopFormalizeTarget;
    title: string;
    summary?: string | null;
    /** lore_note only — World child folder page id */
    loreParentId?: string | null;
    /** scene only */
    linkedQuestPageId?: string | null;
}
export interface WorkshopDraftMetadata {
    isDraft: true;
    draftOrigin: 'workshop';
    draftStatus: WorkshopDraftStatus;
    draftOriginSurface: 'progression';
    authorUserId: string;
    anchorEntityIds?: string[];
    sourceKind?: AuthoringContextKind;
    formalizedAt?: string | null;
    formalizedPageId?: string | null;
    hidden: true;
}
export interface WorkshopDocument {
    id: string;
    campaignId: string;
    authorUserId: string;
    title: string;
    bodyMarkdown: string;
    anchorEntityIds?: string[];
    sourceKind?: AuthoringContextKind;
    createdAt: string;
    updatedAt: string;
    lastTouchedAt: string;
    formalizedPageId?: string | null;
    formalizedAt?: string | null;
    draftStatus: WorkshopDraftStatus;
}
export declare function isWorkshopDraftMetadata(metadata: unknown): metadata is WorkshopDraftMetadata;
export declare function isWorkshopDraftsRootMetadata(metadata: unknown): boolean;
export declare function buildWorkshopDraftMetadata(input: {
    authorUserId: string;
    anchorEntityIds?: string[];
    sourceKind?: AuthoringContextKind;
}): WorkshopDraftMetadata;
export declare function buildWorkshopDraftsRootMetadata(): Record<string, unknown>;
//# sourceMappingURL=workshopDocument.d.ts.map