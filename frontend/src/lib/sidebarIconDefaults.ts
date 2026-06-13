import type { SidebarSectionId } from './sidebarConfig';

export const DEFAULT_SIDEBAR_LUCIDE_ICONS: Record<SidebarSectionId, string> = {
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
  progression: 'trending-up',
  settings: 'key',
};

export function defaultSidebarLucideName(sectionId: SidebarSectionId): string {
  return DEFAULT_SIDEBAR_LUCIDE_ICONS[sectionId];
}

export function defaultSidebarIconValue(sectionId: SidebarSectionId): string {
  return `lucide:${DEFAULT_SIDEBAR_LUCIDE_ICONS[sectionId]}`;
}
