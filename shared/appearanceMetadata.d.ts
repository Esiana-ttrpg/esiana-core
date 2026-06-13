import { type ImageCredit } from './imageCredit.js';
/**
 * Appearance data ownership (entity / forms / details):
 *
 * - **Entity-level** — persistent identity truths: summary, appearanceTags, gender,
 *   presentation, pronouns.
 * - **Forms-level** (stored in appearance.gallery) — contextual presentation overlays:
 *   variant label, portrait, presentationType, tags, presentationNotes, timelinePin.
 *   Localized voice/vibe/demeanor shifts belong in presentationNotes, not nested schemas.
 * - **Details-level** — baseline observable characterization (defaults, not absolutes):
 *   build, voice, distinguishingFeatures, visibleInjuries, clothingMotifs, vibeImpression,
 *   atAGlance.
 *
 * Disguise identity masking is a projection concern — not appearance metadata.
 * Non-goals: per-form descriptor overrides, mini-entity forms, paper dolls, outfit inventory.
 */
export type AppearancePresentationType = 'default' | 'transformation' | 'disguise' | 'historical' | 'ceremonial' | 'public' | 'private' | 'corrupted';
export declare const APPEARANCE_PRESENTATION_TYPES: readonly AppearancePresentationType[];
export declare const APPEARANCE_PRESENTATION_TYPE_LABELS: Record<AppearancePresentationType, string>;
/** Gallery storage: a presentation form (variant state, transformation, disguise, era). */
export interface AppearanceGalleryEntry {
    id: string;
    label: string;
    imageUrl: string;
    imageCredit: ImageCredit | null;
    /** Mood/aesthetic only — formal, battle-worn, winter… */
    tags: string[];
    /** Structured semantics — disguise, transformation, corrupted, public/private, etc. */
    presentationType?: AppearancePresentationType;
    /** Optional; schema allows multiple primaries for future projection contexts. */
    isPrimary?: boolean;
    timelinePin: string | null;
    /** Narrative overlay prose for this form — voice shifts, demeanor, localized traits. */
    presentationNotes: string | null;
}
export interface AppearanceGalleryState {
    entries: AppearanceGalleryEntry[];
}
/** Details-level: baseline observable descriptors. */
export interface AppearanceDetailsFields {
    build: string | null;
    voice: string | null;
    distinguishingFeatures: string[];
    /** Stored as apparelDescription in metadata for backward compat. */
    clothingMotifs: string | null;
    visibleInjuries: string[];
    vibeImpression: string | null;
    atAGlance: string | null;
}
export interface PrimaryGalleryEntryContext {
    presentationType?: AppearancePresentationType;
}
export declare function normalizePresentationType(raw: unknown): AppearancePresentationType | undefined;
export declare function normalizeAppearanceGallery(raw: unknown): AppearanceGalleryState;
export declare const EMPTY_APPEARANCE_DETAILS: AppearanceDetailsFields;
export declare function normalizeAppearanceDetailsFromAppearance(raw: Record<string, unknown>): AppearanceDetailsFields;
export declare function appearanceDetailsToMetadataPatch(details: Partial<AppearanceDetailsFields>): Record<string, unknown>;
/**
 * Resolves the primary gallery entry. Schema allows multiple isPrimary flags;
 * P3 editor enforces radio UX on save. Projection picks deterministically:
 * context.presentationType match → first isPrimary → first entry → null.
 */
export declare function resolvePrimaryGalleryEntry(entries: AppearanceGalleryEntry[], context?: PrimaryGalleryEntryContext): AppearanceGalleryEntry | null;
export declare function synthesizeLegacyGalleryEntry(portraitUrl: string, portraitCredit: ImageCredit | null, label?: string): AppearanceGalleryEntry;
export declare function resolveGalleryEntriesWithLegacy(gallery: AppearanceGalleryState, legacyPortraitUrl: string | null, legacyPortraitCredit: ImageCredit | null): AppearanceGalleryEntry[];
export declare function hasAppearanceDetailsContent(details: AppearanceDetailsFields): boolean;
export declare function hasAppearanceGalleryContent(gallery: AppearanceGalleryState, legacyPortraitUrl?: string | null): boolean;
/** Editor UX: ensure exactly one isPrimary when user selects via radio. */
export declare function enforceSinglePrimaryInEditor(entries: AppearanceGalleryEntry[], selectedId: string): AppearanceGalleryEntry[];
export declare function formatAppearanceDetailsSummary(details: AppearanceDetailsFields): string;
//# sourceMappingURL=appearanceMetadata.d.ts.map