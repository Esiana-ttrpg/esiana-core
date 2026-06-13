/**
 * Layer 5 — authoring context (UI/session, not canonical content).
 * @see docs/plans/authoring-workflow.md
 */
export declare const AUTHORING_CONTEXT_KINDS: readonly ["freeform", "narrative_workspace", "arc", "questline", "scene", "session_prep", "chronicle"];
export type AuthoringContextKind = (typeof AUTHORING_CONTEXT_KINDS)[number];
export declare const AUTHORING_OVERLAY_IDS: readonly ["mystery-structure", "three-act-pacing", "open-threads", "arc-progress"];
export type AuthoringOverlayId = (typeof AUTHORING_OVERLAY_IDS)[number];
export interface AuthoringContext {
    kind: AuthoringContextKind;
    /** Wiki page ids anchoring this session (arc, quest, scene, etc.). */
    anchorEntityIds?: string[];
    /** Active structured overlays — only in workshop / deliberate contexts. */
    overlayIds?: AuthoringOverlayId[];
}
export declare const FREEFORM_AUTHORING_CONTEXT: AuthoringContext;
export declare function parseAuthoringContextFromSearch(search: string): AuthoringContext;
export declare function buildAuthoringWorkshopHref(basePath: string, context: Omit<AuthoringContext, 'kind'> & {
    kind?: AuthoringContextKind;
}): string;
export declare function readWorkshopDraftIdFromSearch(search: string): string | null;
export declare function inferAuthoringKindFromMetadata(metadata: unknown): AuthoringContextKind | null;
//# sourceMappingURL=authoringContext.d.ts.map