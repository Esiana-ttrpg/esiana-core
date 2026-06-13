import { normalizeImageCredit, type ImageCredit } from './imageCredit.js';
import { coerceAssetReferenceUrl } from './assetReferenceValidation.js';

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

export type AppearancePresentationType =
  | 'default'
  | 'transformation'
  | 'disguise'
  | 'historical'
  | 'ceremonial'
  | 'public'
  | 'private'
  | 'corrupted';

export const APPEARANCE_PRESENTATION_TYPES: readonly AppearancePresentationType[] = [
  'default',
  'transformation',
  'disguise',
  'historical',
  'ceremonial',
  'public',
  'private',
  'corrupted',
] as const;

export const APPEARANCE_PRESENTATION_TYPE_LABELS: Record<AppearancePresentationType, string> = {
  default: 'Default',
  transformation: 'Transformation',
  disguise: 'Disguise',
  historical: 'Historical',
  ceremonial: 'Ceremonial',
  public: 'Public',
  private: 'Private',
  corrupted: 'Corrupted',
};

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

function trimText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

export function normalizePresentationType(raw: unknown): AppearancePresentationType | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim() as AppearancePresentationType;
  return (APPEARANCE_PRESENTATION_TYPES as readonly string[]).includes(value)
    ? value
    : undefined;
}

function normalizeImageUrl(raw: unknown): string {
  return coerceAssetReferenceUrl(raw) ?? '';
}

function normalizeGalleryEntry(raw: unknown): AppearanceGalleryEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = trimText(obj.id);
  const label = trimText(obj.label);
  if (!id || !label) return null;
  return {
    id,
    label,
    imageUrl: normalizeImageUrl(obj.imageUrl),
    imageCredit: normalizeImageCredit(obj.imageCredit),
    tags: normalizeStringArray(obj.tags),
    presentationType: normalizePresentationType(obj.presentationType),
    isPrimary: obj.isPrimary === true ? true : undefined,
    timelinePin: trimText(obj.timelinePin),
    presentationNotes:
      trimText(obj.presentationNotes) ?? trimText(obj.notes),
  };
}

export function normalizeAppearanceGallery(raw: unknown): AppearanceGalleryState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { entries: [] };
  }
  const obj = raw as Record<string, unknown>;
  const entriesRaw = obj.entries;
  if (!Array.isArray(entriesRaw)) return { entries: [] };
  const entries = entriesRaw
    .map(normalizeGalleryEntry)
    .filter((entry): entry is AppearanceGalleryEntry => entry !== null);
  return { entries };
}

export const EMPTY_APPEARANCE_DETAILS: AppearanceDetailsFields = {
  build: null,
  voice: null,
  distinguishingFeatures: [],
  clothingMotifs: null,
  visibleInjuries: [],
  vibeImpression: null,
  atAGlance: null,
};

export function normalizeAppearanceDetailsFromAppearance(
  raw: Record<string, unknown>,
): AppearanceDetailsFields {
  return {
    build: trimText(raw.build),
    voice: trimText(raw.voice),
    distinguishingFeatures: normalizeStringArray(raw.distinguishingFeatures),
    clothingMotifs: trimText(raw.clothingMotifs) ?? trimText(raw.apparelDescription),
    visibleInjuries: normalizeStringArray(raw.visibleInjuries),
    vibeImpression: trimText(raw.vibeImpression),
    atAGlance: trimText(raw.atAGlance),
  };
}

export function appearanceDetailsToMetadataPatch(
  details: Partial<AppearanceDetailsFields>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if ('build' in details) patch.build = details.build;
  if ('voice' in details) patch.voice = details.voice;
  if ('distinguishingFeatures' in details) {
    patch.distinguishingFeatures = details.distinguishingFeatures;
  }
  if ('clothingMotifs' in details) {
    patch.apparelDescription = details.clothingMotifs;
  }
  if ('visibleInjuries' in details) patch.visibleInjuries = details.visibleInjuries;
  if ('vibeImpression' in details) patch.vibeImpression = details.vibeImpression;
  if ('atAGlance' in details) patch.atAGlance = details.atAGlance;
  return patch;
}

/**
 * Resolves the primary gallery entry. Schema allows multiple isPrimary flags;
 * P3 editor enforces radio UX on save. Projection picks deterministically:
 * context.presentationType match → first isPrimary → first entry → null.
 */
export function resolvePrimaryGalleryEntry(
  entries: AppearanceGalleryEntry[],
  context?: PrimaryGalleryEntryContext,
): AppearanceGalleryEntry | null {
  if (entries.length === 0) return null;

  if (context?.presentationType) {
    const typedPrimary = entries.find(
      (e) =>
        e.presentationType === context.presentationType &&
        (e.isPrimary === true || context.presentationType !== 'default'),
    );
    if (typedPrimary) return typedPrimary;
    const typed = entries.find((e) => e.presentationType === context.presentationType);
    if (typed) return typed;
  }

  const primary = entries.find((e) => e.isPrimary === true);
  if (primary) return primary;

  return entries[0] ?? null;
}

export function synthesizeLegacyGalleryEntry(
  portraitUrl: string,
  portraitCredit: ImageCredit | null,
  label = 'Current',
): AppearanceGalleryEntry {
  return {
    id: '__legacy_portrait__',
    label,
    imageUrl: portraitUrl,
    imageCredit: portraitCredit,
    tags: [],
    presentationType: 'default',
    isPrimary: true,
    timelinePin: null,
    presentationNotes: null,
  };
}

export function resolveGalleryEntriesWithLegacy(
  gallery: AppearanceGalleryState,
  legacyPortraitUrl: string | null,
  legacyPortraitCredit: ImageCredit | null,
): AppearanceGalleryEntry[] {
  if (gallery.entries.length > 0) return gallery.entries;
  if (legacyPortraitUrl) {
    return [synthesizeLegacyGalleryEntry(legacyPortraitUrl, legacyPortraitCredit)];
  }
  return [];
}

export function hasAppearanceDetailsContent(details: AppearanceDetailsFields): boolean {
  return Boolean(
    details.build ||
      details.voice ||
      details.clothingMotifs ||
      details.vibeImpression ||
      details.atAGlance ||
      details.distinguishingFeatures.length > 0 ||
      details.visibleInjuries.length > 0,
  );
}

export function hasAppearanceGalleryContent(
  gallery: AppearanceGalleryState,
  legacyPortraitUrl?: string | null,
): boolean {
  if (gallery.entries.length > 0) return true;
  return Boolean(legacyPortraitUrl?.trim());
}

/** Editor UX: ensure exactly one isPrimary when user selects via radio. */
export function enforceSinglePrimaryInEditor(
  entries: AppearanceGalleryEntry[],
  selectedId: string,
): AppearanceGalleryEntry[] {
  return entries.map((entry) => ({
    ...entry,
    isPrimary: entry.id === selectedId ? true : undefined,
  }));
}

export function formatAppearanceDetailsSummary(details: AppearanceDetailsFields): string {
  const parts: string[] = [];
  if (details.atAGlance) parts.push(details.atAGlance);
  if (details.build) parts.push(`Build: ${details.build}`);
  if (details.voice) parts.push(`Voice: ${details.voice}`);
  if (details.vibeImpression) parts.push(`Impression: ${details.vibeImpression}`);
  if (details.clothingMotifs) parts.push(`Clothing: ${details.clothingMotifs}`);
  if (details.distinguishingFeatures.length > 0) {
    parts.push(`Features: ${details.distinguishingFeatures.join('; ')}`);
  }
  if (details.visibleInjuries.length > 0) {
    parts.push(`Injuries: ${details.visibleInjuries.join('; ')}`);
  }
  return parts.join('\n');
}
