/** Wiki title aliases for public recruitment resource pages. */
export const RECRUITMENT_DOC_ALIASES = {
  tableExpectations: [
    'table expectations',
    'how we play',
    'table culture',
    'social contract',
    'table-expectations',
  ],
  rules: ['rules', 'expectations', 'houserules', 'house-rules', 'table-rules', 'tablerules'],
  faq: ['faq', 'questions'],
  sessionZero: ['session zero', 'sessionzero', 'session0', 'session-0'],
  homebrew: ['homebrew', 'hb'],
  safetyGuidelines: ['safety guidelines', 'safety', 'content safety'],
  characterCreation: [
    'character creation guide',
    'character creation',
    'chargen',
    'character-creation',
    'playerguide',
    'player-guide',
  ],
} as const;

export function normalizeRecruitmentDocTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
}
