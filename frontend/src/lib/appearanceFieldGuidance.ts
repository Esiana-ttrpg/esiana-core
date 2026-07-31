import {
  APPEARANCE_MICRO_PROMPTS,
  APPEARANCE_WRITING_PROMPT_LEAD,
  APPEARANCE_WRITING_PROMPTS,
} from '@/lib/appearanceSummaryPrompts';

/** Centralized optional writing guidance for Appearance editor fields (edit-only). */
export const APPEARANCE_FIELD_GUIDANCE = {
  description: '', // use formatAppearanceDescriptionGuidance()
  voice:
    'If relevant, consider tone, cadence, accent, or mannerisms—anything memorable about how they sound when they speak.',
  presence:
    'You might describe how they occupy space: the impression they give at a glance, in a crowd, or when they enter a room.',
  clothingMotifs:
    'Consider aesthetic, cultural dress, symbols, materials, or recurring style motifs—not a full outfit inventory.',
  distinguishingFeatures:
    'If relevant, note markings, scars, prosthetics, unusual traits, scents, or other details people remember.',
  gender:
    'Optional freeform self-identity. Use whatever language fits this character; nothing here is required.',
  presentation:
    'Optional—how they outwardly present or express themselves. Freeform; not a fixed set of labels.',
  atAGlance:
    'A short snapshot of how they read visually—one or two lines a stranger might notice first.',
  build:
    'If relevant, a brief note on stature or build—any wording that fits this character.',
  visibleInjuries:
    'Comma-separated visible injuries or mobility cues, if you want them on the page.',
  presentationDescription:
    'For this presentation state only: how it differs visually and emotionally, and what someone encountering this version would notice. Does not replace entity-level Description.',
  presentationDistinguishingFeatures:
    'Physical or body changes in this state—transformed anatomy, markings, magical traits, unusual details. Not a rewrite of baseline distinguishing features.',
  presentationVoice:
    'How voice, speech, accent, tone, or mannerisms read in this state only.',
  presentationPresence:
    'How this presentation occupies space and how others perceive it—in this state only.',
  presentationClothingMotifs:
    'Costume, outfit, armor, ceremonial wear, disguise, or style for this state—not an inventory. Examples: transformation outfits, disguises, cultural dress, armor, casual wear, nonhuman presentation.',
  presentationAuthorNotes:
    'Optional author context for this entry—plot hooks, table notes, or reminders. Not shown as in-world description.',
  presentationEntryGender:
    'Optional for this presentation state only. Does not modify entity-level gender.',
  presentationEntryPresentation:
    'Optional for this presentation state only. Does not modify entity-level presentation.',
} as const;

export function formatAppearanceDescriptionGuidance(): string {
  const promptLines = APPEARANCE_WRITING_PROMPTS.map((p) => `• ${p}`).join('\n');
  const sampleIdeas = APPEARANCE_MICRO_PROMPTS.slice(0, 4)
    .map((p) => `• ${p}`)
    .join('\n');
  return [
    APPEARANCE_WRITING_PROMPT_LEAD,
    'Consider any of these, if they matter for this character—not a checklist:',
    promptLines,
    '',
    'You might also ask:',
    sampleIdeas,
  ].join('\n');
}

export function getAppearanceFieldGuidance(
  key: keyof typeof APPEARANCE_FIELD_GUIDANCE,
): string {
  if (key === 'description') {
    return formatAppearanceDescriptionGuidance();
  }
  return APPEARANCE_FIELD_GUIDANCE[key];
}
