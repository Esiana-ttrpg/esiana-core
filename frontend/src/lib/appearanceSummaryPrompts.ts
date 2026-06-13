export const APPEARANCE_SUMMARY_PLACEHOLDER =
  'Describe how they appear, move, and are perceived by others…';

export const APPEARANCE_WRITING_PROMPT_LEAD = 'How do they move through the world?';

export const APPEARANCE_WRITING_PROMPTS = [
  'body language and posture',
  'gender presentation or expression',
  'clothing and aesthetic style',
  'voice, tone, or mannerisms',
  'emotional or social presence',
  'scars, markings, or distinctive traits',
  'fantasy or nonhuman qualities',
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
