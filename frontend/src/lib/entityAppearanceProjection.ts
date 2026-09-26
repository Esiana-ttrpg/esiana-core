import type { ImageCredit } from '@shared/imageCredit';
import type {
  AppearanceDetailsFields,
  AppearanceGalleryEntry,
  AppearanceGalleryState,
  AppearancePresentationType,
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

export interface AppearancePresentationOption {
  id: string;
  label: string;
  presentationType?: AppearancePresentationType;
  imageUrl?: string | null;
}

export const DEFAULT_APPEARANCE_PRESENTATION_ID = '__default__';

export interface AppearancePresentationViewModel {
  selectedEntryId: string | null;
  label: string | null;
  presentationType?: AppearancePresentationType;
  isBaseline: boolean;
  portraitUrl: string | null;
  portraitCredit: ImageCredit | null;
  details: AppearanceDetailsViewModel | null;
  description: string | null;
  tags: string[];
  gender: string | null;
  presentation: string | null;
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

  const entries = gallery.entries;
  const primaryEntry = resolvePrimaryGalleryEntry(entries, context);

  return {
    entries,
    primaryEntry,
    hasContent: sharedHasGalleryContent(gallery, null),
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
    return {
      summary: appearance.summary,
      tags: appearance.appearanceTags,
      portraitUrl: appearance.portraitUrl ?? featuredImageUrl ?? null,
      portraitCredit: appearance.portraitCredit,
      pronouns: appearance.pronouns,
      gender: appearance.gender,
      presentation: appearance.presentation,
    };
  }

  if (surfaceProfileKey === 'bestiary') {
    const { appearance } = parseBestiaryMetadata(metadata);
    return {
      summary: appearance.summary,
      tags: appearance.tags,
      portraitUrl: appearance.portraitUrl ?? featuredImageUrl ?? null,
      portraitCredit: appearance.portraitCredit,
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

/** Gallery entries other than the default (primary) wiki presentation. */
export function resolveAlternateGalleryEntries(
  entries: AppearanceGalleryEntry[],
  primaryEntry: AppearanceGalleryEntry | null,
  filterEntries?: (entry: AppearanceGalleryEntry) => boolean,
): AppearanceGalleryEntry[] {
  let list = filterEntries ? entries.filter(filterEntries) : entries;
  const primaryId = primaryEntry?.id;
  if (!primaryId) {
    return list.length > 1 ? list.slice(1) : [];
  }
  return list.filter((entry) => entry.id !== primaryId);
}

export function detailsCapabilityEnabled(capabilities: AppearanceCapabilities): boolean {
  return capabilities.details;
}

function mergeUniqueTags(base: string[], extra: string[]): string[] {
  const seen = new Set(base);
  const merged = [...base];
  for (const tag of extra) {
    if (!seen.has(tag)) {
      seen.add(tag);
      merged.push(tag);
    }
  }
  return merged;
}

function combineDescription(summary: string | null, notes: string | null): string | null {
  const summaryText = summary?.trim() ?? '';
  const notesText = notes?.trim() ?? '';
  if (summaryText && notesText) {
    return `${summaryText}\n\n${notesText}`;
  }
  if (summaryText) return summaryText;
  if (notesText) return notesText;
  return null;
}

export function resolveSelectedGalleryEntry(
  forms: AppearanceFormsViewModel,
  selectedEntryId: string | null | undefined,
): AppearanceGalleryEntry | null {
  if (selectedEntryId && selectedEntryId !== DEFAULT_APPEARANCE_PRESENTATION_ID) {
    const match = forms.entries.find((entry) => entry.id === selectedEntryId);
    if (match) return match;
  }
  return null;
}

export function isBaselinePresentationSelection(
  selectedEntry: AppearanceGalleryEntry | null,
  primaryEntry: AppearanceGalleryEntry | null,
  presentationCount: number,
): boolean {
  if (presentationCount <= 1) return true;
  if (!selectedEntry || !primaryEntry) return true;
  return selectedEntry.id === primaryEntry.id;
}

export function listAppearancePresentations(
  forms: AppearanceFormsViewModel,
  filterEntries?: (entry: AppearanceGalleryEntry) => boolean,
): AppearancePresentationOption[] {
  const entries = filterEntries ? forms.entries.filter(filterEntries) : forms.entries;
  return [
    { id: DEFAULT_APPEARANCE_PRESENTATION_ID, label: 'Default' },
    ...entries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      presentationType: entry.presentationType,
      imageUrl: entry.imageUrl || null,
    })),
  ];
}

export function shouldShowPresentationSelector(
  forms: AppearanceFormsViewModel,
  formsCapability: boolean,
  filterEntries?: (entry: AppearanceGalleryEntry) => boolean,
): boolean {
  if (!formsCapability) return false;
  return listAppearancePresentations(forms, filterEntries).length > 1;
}

export function projectAppearancePresentation(input: {
  appearance: EntityAppearanceViewModel;
  forms: AppearanceFormsViewModel;
  details?: AppearanceDetailsViewModel;
  selectedEntryId?: string | null;
  detailsCapability?: boolean;
  filterEntries?: (entry: AppearanceGalleryEntry) => boolean;
}): AppearancePresentationViewModel {
  const {
    appearance,
    forms,
    details,
    selectedEntryId,
    detailsCapability = true,
    filterEntries,
  } = input;

  const presentations = listAppearancePresentations(forms, filterEntries);
  const selectedEntry = resolveSelectedGalleryEntry(forms, selectedEntryId);
  const isBaseline = !selectedEntry;

  const emptyPresentation: AppearancePresentationViewModel = {
    selectedEntryId: selectedEntry?.id ?? DEFAULT_APPEARANCE_PRESENTATION_ID,
    label: selectedEntry?.label ?? 'Default',
    presentationType: selectedEntry?.presentationType,
    isBaseline,
    portraitUrl: appearance.portraitUrl?.trim() || null,
    portraitCredit: appearance.portraitCredit,
    details:
      detailsCapability && details?.hasContent ? details : null,
    description: appearance.summary?.trim() || null,
    tags: appearance.tags,
    gender: appearance.gender,
    presentation: appearance.presentation,
  };

  if (!selectedEntry) {
    return emptyPresentation;
  }

  const portraitUrl = selectedEntry.imageUrl.trim() || null;

  return {
    selectedEntryId: selectedEntry.id,
    label: selectedEntry.label,
    presentationType: selectedEntry.presentationType,
    isBaseline: false,
    portraitUrl,
    portraitCredit: portraitUrl ? selectedEntry.imageCredit : null,
    details: null,
    description: selectedEntry.presentationNotes?.trim() || null,
    tags: [...selectedEntry.tags],
    gender: null,
    presentation: null,
  };
}
