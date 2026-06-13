/** Label for "Create New …" buttons on category index views. */
export function createItemLabel(folderTitle: string): string {
  const map: Record<string, string> = {
    Characters: 'Character',
    Locations: 'Location',
    Organizations: 'Organization',
    Families: 'Family',
    Objects: 'Object',
    Maps: 'Map',
    Quests: 'Quest',
    Events: 'Event',
    Journals: 'Journal',
    Timelines: 'Timeline',
    Calendars: 'Calendar',
    Bestiary: 'Creature',
    Ancestries: 'Ancestry',
    'Rules/Resources': 'Resource',
  };
  if (map[folderTitle]) return map[folderTitle];
  if (folderTitle.endsWith('ies')) {
    return folderTitle.slice(0, -3) + 'y';
  }
  if (folderTitle.endsWith('s') && folderTitle.length > 3) {
    return folderTitle.slice(0, -1);
  }
  return 'Page';
}
