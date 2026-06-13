import { parseCharacterMetadata } from '@/lib/characterMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';
import { APPEARANCE_PRESENTATION_TYPE_LABELS } from '@shared/appearanceMetadata';

export const characterAppearanceAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const { appearance } = parseCharacterMetadata(pageMetadata);

  const galleryParts = appearance.gallery.entries.flatMap((entry) => [
    entry.label,
    entry.presentationType
      ? APPEARANCE_PRESENTATION_TYPE_LABELS[entry.presentationType]
      : null,
    ...entry.tags,
    entry.presentationNotes,
  ]);

  return {
    semanticIndexText: joinIndexParts([
      appearance.pronouns,
      appearance.gender,
      appearance.presentation,
      appearance.summary,
      appearance.build,
      appearance.voice,
      appearance.vibeImpression,
      appearance.atAGlance,
      appearance.apparelDescription,
      ...appearance.appearanceTags,
      ...appearance.distinguishingFeatures,
      ...appearance.visibleInjuries,
      ...galleryParts,
    ]),
    semanticKeywords: [
      appearance.pronouns,
      appearance.gender,
      appearance.presentation,
      appearance.build,
      appearance.voice,
      appearance.vibeImpression,
      ...appearance.appearanceTags,
      ...appearance.distinguishingFeatures,
      ...appearance.gallery.entries.map((e) => e.label),
      ...appearance.gallery.entries.flatMap((e) => e.tags),
    ].filter((k): k is string => Boolean(k?.trim())),
  };
};
