export const APPEARANCE_SUMMARY_PLACEHOLDER =
  'Describe how they appear, move, and are perceived…';

export const APPEARANCE_WRITING_PROMPT_LEAD =
  'You might explore how they move through the world—only what matters for this character.';

export const APPEARANCE_WRITING_PROMPTS = [
  'how history shows in their body or style',
  'movement and body language',
  'gender presentation or expression',
  'clothing and aesthetic style',
  'voice, tone, or mannerisms',
  'emotional or social presence',
  'scars, markings, or distinctive traits',
  'nonhuman or uncanny qualities',
  'the impression they leave on others',
] as const;
export const APPEARANCE_MICRO_PROMPTS = [
  'What do people notice first?',
  'What makes them memorable in a crowd?',
  'How do they carry themselves when nervous?',
  'What contradicts first impressions?',
  'How does their appearance reflect their history?',
  'What changes when they transform?',
  'What detail do friends recognize immediately?',
  'What about them feels inhuman, uncanny, or magical?',
] as const;

export function pickAppearanceMicroPrompt(): string {
  const index = Math.floor(Math.random() * APPEARANCE_MICRO_PROMPTS.length);
  return APPEARANCE_MICRO_PROMPTS[index] ?? APPEARANCE_MICRO_PROMPTS[0];
}
