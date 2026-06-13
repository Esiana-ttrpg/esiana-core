export const DEFAULT_SIDEBAR_LUCIDE_ICONS: Record<string, string> = {
  dashboard: 'compass',
  party: 'users',
  quickAccess: 'zap',
  characters: 'user',
  bestiary: 'bug',
  ancestries: 'users',
  organizations: 'building',
  locations: 'map-pin',
  maps: 'map',
  objects: 'package',
  families: 'users',
  'rules-resources': 'book-open',
  quests: 'scroll-text',
  downtime: 'hourglass',
  narrativeThreads: 'git-branch',
  creativeDrift: 'moon',
  journals: 'notebook-pen',
  timeTracking: 'calendar',
  sessionNotes: 'notebook-pen',
  tags: 'tags',
  visualAtlas: 'images',
  relations: 'git-branch',
  'recent-changes': 'clock',
  settings: 'key',
};

export const SIDEBAR_FIXED_SECTION_IDS = [
  'dashboard',
  'party',
  'quickAccess',
  'tags',
  'visualAtlas',
  'recent-changes',
  'settings',
] as const;

export const SIDEBAR_ALL_SECTION_IDS = [
  ...SIDEBAR_FIXED_SECTION_IDS,
  'characters',
  'bestiary',
  'ancestries',
  'organizations',
  'locations',
  'maps',
  'objects',
  'families',
  'rules-resources',
  'quests',
  'downtime',
  'narrativeThreads',
  'creativeDrift',
  'journals',
  'sessionNotes',
  'timeTracking',
] as const;

export function defaultSidebarIconValue(sectionId: string): string {
  const name = DEFAULT_SIDEBAR_LUCIDE_ICONS[sectionId] ?? 'file-text';
  return `lucide:${name}`;
}

export function isSidebarSectionId(id: string): boolean {
  return SIDEBAR_ALL_SECTION_IDS.includes(id as (typeof SIDEBAR_ALL_SECTION_IDS)[number]);
}

export function isSidebarFixedSectionId(id: string): boolean {
  return SIDEBAR_FIXED_SECTION_IDS.includes(
    id as (typeof SIDEBAR_FIXED_SECTION_IDS)[number],
  );
}
