/**
 * Hard-coded campaign sidebar navigation (VTT-agnostic).
 * Page links resolve to wiki page IDs from the API tree by title.
 */

export interface SidebarNavChild {
  title: string;
}

export interface SidebarNavGroup {
  title: string;
  children: SidebarNavChild[];
}

export type SidebarNavEntry =
  | {
      type: 'link';
      title: string;
      route: 'dashboard' | 'wiki' | 'settings' | 'templates';
    }
  | { type: 'group'; group: SidebarNavGroup };

export const SIDEBAR_NAV_STRUCTURE: SidebarNavEntry[] = [
  { type: 'link', title: 'Campaign home', route: 'dashboard' },
  { type: 'link', title: 'Quick Access', route: 'wiki' },
  {
    type: 'group',
    group: {
      title: 'World',
      children: [
        { title: 'Characters' },
        { title: 'Bestiary' },
        { title: 'Ancestries' },
        { title: 'Organizations' },
        { title: 'Locations' },
        { title: 'Maps' },
        { title: 'Objects' },
        { title: 'Families' },
      ],
    },
  },
  {
    type: 'group',
    group: {
      title: 'Game',
      children: [
        { title: 'Rules/Resources' },
        { title: 'Quests' },
        { title: 'Narrative Threads' },
        { title: 'Journals' },
        { title: 'Calendars' },
        { title: 'Timelines' },
        { title: 'Events' },
      ],
    },
  },
];

export const SIDEBAR_AFTER_SESSION_DIVIDER: SidebarNavEntry[] = [
  { type: 'link', title: 'Tags', route: 'wiki' },
  { type: 'link', title: 'Relations', route: 'wiki' },
  { type: 'link', title: 'Recent Changes', route: 'wiki' },
];

export const SIDEBAR_SETTINGS: SidebarNavEntry = {
  type: 'link',
  title: 'Settings',
  route: 'settings',
};

/** Alternate titles from legacy seeded campaigns */
const TITLE_ALIASES: Record<string, string> = {
  'Recent changes': 'Recent Changes',
  Bookmarks: 'Quick Access',
  Threads: 'Narrative Threads',
};

export function normalizeNavTitle(title: string): string {
  return TITLE_ALIASES[title] ?? title;
}

export function buildPageIdByTitle(
  flat: { id: string; title: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const page of flat) {
    map.set(page.title, page.id);
    const normalized = normalizeNavTitle(page.title);
    if (normalized !== page.title) {
      map.set(normalized, page.id);
    }
  }
  return map;
}
