/** Preserves seeded VTT-agnostic folder order in the wiki tree API. */

export const WIKI_ROOT_ORDER: readonly string[] = [
  'Quick Access',
  'World',
  'Game',
  'Player Session Notes',
  'Tags',
  'Relations',
  'Recent Changes',
  'Settings',
];

export const WIKI_CHILD_ORDER: Readonly<Record<string, readonly string[]>> = {
  World: [
    'Characters',
    'Bestiary',
    'Ancestries',
    'Organizations',
    'Locations',
    'Maps',
    'Objects',
    'Families',
  ],
  Game: [
    'Rules/Resources',
    'Quests',
    'Journals',
    'Calendars',
    'Timelines',
    'Events',
  ],
};

export function compareWikiTitles(
  a: string,
  b: string,
  parentTitle: string | null,
): number {
  const order =
    parentTitle === null
      ? WIKI_ROOT_ORDER
      : (WIKI_CHILD_ORDER[parentTitle] ?? null);

  if (!order) {
    return a.localeCompare(b);
  }

  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}
