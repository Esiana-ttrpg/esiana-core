import type { ImageCredit } from '@shared/imageCredit';
import type {
  AppearanceDetailsFields,
  AppearanceGalleryEntry,
  AppearanceGalleryState,
  PrimaryGalleryEntryContext,
} from '@shared/appearanceMetadata';
import {
  formatAppearanceDetailsSummary,
  hasAppearanceDetailsContent as sharedHasDetailsContent,
  hasAppearanceGalleryContent as sharedHasGalleryContent,
  normalizeAppearanceDetailsFromAppearance,
  normalizeAppearanceGallery,
  resolveGalleryEntriesWithLegacy,
  resolvePrimaryGalleryEntry,
} from '@shared/appearanceMetadata';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import type { AppearanceCapabilities } from '@/lib/entitySurfaceProfile';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';

export type {
  AppearanceDetailsFields,
  AppearanceGalleryEntry,
  AppearanceGalleryState,
  PrimaryGalleryEntryContext,
} from '@shared/appearanceMetadata';

export interface EntityAppearanceViewModel {
  summary: string | null;
  tags: string[];
  portraitUrl: string | null;
  portraitCredit: ImageCredit | null;
  pronouns: string | null;
  gender: string | null;
  presentation: string | null;
}

export interface AppearanceFormsViewModel {
  entries: AppearanceGalleryEntry[];
  primaryEntry: AppearanceGalleryEntry | null;
  hasContent: boolean;
}

export interface AppearanceDetailsViewModel extends AppearanceDetailsFields {
  hasContent: boolean;
  formattedSummary: string;
}

const EMPTY: EntityAppearanceViewModel = {
  summary: null,
  tags: [],
  portraitUrl: null,
  portraitCredit: null,
  pronouns: null,
  gender: null,
  presentation: null,
};

export function resolvePrimaryGalleryPortrait(
  gallery: AppearanceGalleryState,
  legacyPortraitUrl: string | null,
  legacyPortraitCredit: ImageCredit | null,
  context?: PrimaryGalleryEntryContext,
): { portraitUrl: string | null; portraitCredit: ImageCredit | null } {
  const entries = resolveGalleryEntriesWithLegacy(
    gallery,
    legacyPortraitUrl,
    legacyPortraitCredit,
  );
  const primary = resolvePrimaryGalleryEntry(entries, context);
  if (primary?.imageUrl.trim()) {
    return { portraitUrl: primary.imageUrl, portraitCredit: primary.imageCredit };
  }
  return { portraitUrl: legacyPortraitUrl, portraitCredit: legacyPortraitCredit };
}

export function projectAppearanceForms(
  metadata: unknown,
  surfaceProfileKey: SurfaceProfileKey,
  context?: PrimaryGalleryEntryContext,
  legacyPortraitUrl?: string | null,
  legacyPortraitCredit?: ImageCredit | null,
): AppearanceFormsViewModel {
  let gallery: AppearanceGalleryState = { entries: [] };
  let portraitUrl: string | null = legacyPortraitUrl ?? null;
  let portraitCredit: ImageCredit | null = legacyPortraitCredit ?? null;

  if (surfaceProfileKey === 'character') {
    const { appearance } = parseCharacterMetadata(metadata);
    gallery = appearance.gallery;
    portraitUrl = appearance.portraitUrl;
    portraitCredit = appearance.portraitCredit;
  } else if (surfaceProfileKey === 'bestiary') {
    const { appearance } = parseBestiaryMetadata(metadata);
    gallery = appearance.gallery;
    portraitUrl = appearance.portraitUrl;
    portraitCredit = appearance.portraitCredit;
  }

  const entries = resolveGalleryEntriesWithLegacy(gallery, portraitUrl, portraitCredit);
  const primaryEntry = resolvePrimaryGalleryEntry(entries, context);

  return {
    entries,
    primaryEntry,
    hasContent: sharedHasGalleryContent(gallery, portraitUrl),
  };
}

export function projectAppearanceDetails(
  metadata: unknown,
  surfaceProfileKey: SurfaceProfileKey,
): AppearanceDetailsViewModel {
  if (surfaceProfileKey !== 'character') {
    const empty: AppearanceDetailsViewModel = {
      ...normalizeAppearanceDetailsFromAppearance({}),
      hasContent: false,
      formattedSummary: '',
    };
    return empty;
  }

  const { appearance } = parseCharacterMetadata(metadata);
  const details: AppearanceDetailsFields = {
    build: appearance.build,
    voice: appearance.voice,
    distinguishingFeatures: appearance.distinguishingFeatures,
    clothingMotifs: appearance.apparelDescription,
    visibleInjuries: appearance.visibleInjuries,
    vibeImpression: appearance.vibeImpression,
    atAGlance: appearance.atAGlance,
  };

  return {
    ...details,
    hasContent: sharedHasDetailsContent(details),
    formattedSummary: formatAppearanceDetailsSummary(details),
  };
}

export function projectEntityAppearance(
  metadata: unknown,
  surfaceProfileKey: SurfaceProfileKey,
  featuredImageUrl?: string | null,
  context?: PrimaryGalleryEntryContext,
): EntityAppearanceViewModel {
  if (surfaceProfileKey === 'character') {
    const { appearance } = parseCharacterMetadata(metadata);
    const portrait = resolvePrimaryGalleryPortrait(
      appearance.gallery,
      appearance.portraitUrl ?? featuredImageUrl ?? null,
      appearance.portraitCredit,
      context,
    );
    return {
      summary: appearance.summary,
      tags: appearance.appearanceTags,
      portraitUrl: portrait.portraitUrl,
      portraitCredit: portrait.portraitCredit,
      pronouns: appearance.pronouns,
      gender: appearance.gender,
      presentation: appearance.presentation,
    };
  }

  if (surfaceProfileKey === 'bestiary') {
    const { appearance } = parseBestiaryMetadata(metadata);
    const portrait = resolvePrimaryGalleryPortrait(
      appearance.gallery,
      appearance.portraitUrl ?? featuredImageUrl ?? null,
      appearance.portraitCredit,
      context,
    );
    return {
      summary: appearance.summary,
      tags: appearance.tags,
      portraitUrl: portrait.portraitUrl,
      portraitCredit: portrait.portraitCredit,
      pronouns: null,
      gender: null,
      presentation: null,
    };
  }

  return EMPTY;
}

export function hasEntityAppearanceContent(
  model: EntityAppearanceViewModel,
  forms?: AppearanceFormsViewModel,
  details?: AppearanceDetailsViewModel,
): boolean {
  return Boolean(
    model.portraitUrl ||
      model.summary ||
      model.tags.length > 0 ||
      model.pronouns ||
      model.gender ||
      model.presentation ||
      forms?.hasContent ||
      details?.hasContent,
  );
}

export function hasAppearanceFormsContentForMetadata(
  metadata: unknown,
  surfaceProfileKey: SurfaceProfileKey,
): boolean {
  return projectAppearanceForms(metadata, surfaceProfileKey).hasContent;
}

export function hasAppearanceDetailsContentForMetadata(
  metadata: unknown,
  surfaceProfileKey: SurfaceProfileKey,
): boolean {
  return projectAppearanceDetails(metadata, surfaceProfileKey).hasContent;
}

export { normalizeAppearanceGallery, resolvePrimaryGalleryEntry };

export function formsCapabilityEnabled(capabilities: AppearanceCapabilities): boolean {
  return capabilities.forms;
}

export function detailsCapabilityEnabled(capabilities: AppearanceCapabilities): boolean {
  return capabilities.details;
}
