/** Seeded wiki skeleton parent keys for import placement. */
export const IMPORT_SK = {
  characters: 'skeleton:World/Characters',
  party: 'skeleton:World/Party',
  bestiary: 'skeleton:World/Bestiary',
  ancestries: 'skeleton:World/Ancestries',
  organizations: 'skeleton:World/Organizations',
  locations: 'skeleton:World/Locations',
  maps: 'skeleton:World/Maps',
  objects: 'skeleton:World/Objects',
  families: 'skeleton:World/Families',
  rules: 'skeleton:Game/Rules/Resources',
  quests: 'skeleton:Game/Adventure',
  journals: 'skeleton:Game/Journals',
  events: 'skeleton:Game/Events',
  calendars: 'skeleton:Game/Calendars',
  timelines: 'skeleton:Game/Timelines',
  sessionNotes: 'skeleton:Player Session Notes',
} as const;

export type ImportModuleTarget =
  | 'Characters'
  | 'Bestiary'
  | 'Ancestries'
  | 'Organizations'
  | 'Locations'
  | 'Maps'
  | 'Objects'
  | 'Families (tree)'
  | 'Game/Rules & Resources'
  | 'Game/Quests'
  | 'Game/Session Notes'
  | 'Game/Journals'
  | 'Game/Calendars'
  | 'Game/Timelines'
  | 'Game/Events'
  | 'Ignore Folder';

export const IMPORT_MODULE_TO_SKELETON: Record<string, string> = {
  Characters: IMPORT_SK.characters,
  Bestiary: IMPORT_SK.bestiary,
  Ancestries: IMPORT_SK.ancestries,
  Organizations: IMPORT_SK.organizations,
  Locations: IMPORT_SK.locations,
  Maps: IMPORT_SK.maps,
  Objects: IMPORT_SK.objects,
  'Families (tree)': IMPORT_SK.families,
  Families: IMPORT_SK.families,
  'Game/Rules & Resources': IMPORT_SK.rules,
  'Game/Quests': IMPORT_SK.quests,
  'Game/Session Notes': IMPORT_SK.sessionNotes,
  'Game/Journals': IMPORT_SK.journals,
  'Game/Calendars': IMPORT_SK.calendars,
  'Game/Timelines': IMPORT_SK.timelines,
  'Game/Events': IMPORT_SK.events,
};
