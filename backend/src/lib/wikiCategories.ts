/** Wiki folder titles that render as index grids (no TipTap body). */
export const CATEGORY_INDEX_TITLES: readonly string[] = [
  'Characters',
  'Bestiary',
  'Ancestries',
  'Organizations',
  'Locations',
  'Maps',
  'Objects',
  'Families',
  'Rules/Resources',
  'Quests',
  'Narrative Threads',
  'Threads',
  'Journals',
  'Calendars',
  'Timelines',
  'Events',
  'Quick Access',
  'Tags',
  'Relations',
  'Recent Changes',
];

export function isCategoryIndexTitle(title: string): boolean {
  return CATEGORY_INDEX_TITLES.includes(title);
}

export interface WikiBlockContent {
  type: string;
  content?: { [key: string]: unknown };
}

export function buildContentSnippet(
  blocks?: WikiBlockContent[] | null,
): string {
  const textParts = (blocks ?? [])
    .filter((block) => block.type === 'text-tiptap')
    .map((block) => {
      const markdown = block.content?.markdown;
      return typeof markdown === 'string' ? markdown : '';
    })
    .filter((text) => text.trim())
    .map((text) => text.replace(/\s+/g, ' ').trim());

  const combined = textParts.join(' ');
  if (!combined) return '';
  return combined.length > 160 ? `${combined.slice(0, 157)}…` : combined;
}
