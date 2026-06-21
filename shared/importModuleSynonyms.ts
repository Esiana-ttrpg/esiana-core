import type { ImportModuleTarget } from './importSkeletonKeys.js';

export type MappableImportModule = Exclude<ImportModuleTarget, 'Ignore Folder'>;

const MODULE_SYNONYMS: Array<{
  target: MappableImportModule;
  synonyms: string[];
}> = [
  { target: 'Characters', synonyms: ['npcs', 'characters', 'people', 'pc'] },
  { target: 'Bestiary', synonyms: ['monsters', 'bestiary', 'creatures', 'enemies'] },
  { target: 'Ancestries', synonyms: ['races', 'ancestries', 'lineages', 'species'] },
  {
    target: 'Organizations',
    synonyms: ['factions', 'guilds', 'organizations', 'organisations', 'sects'],
  },
  { target: 'Locations', synonyms: ['locations', 'settlements', 'cities', 'world'] },
  { target: 'Maps', synonyms: ['maps', 'cartography', 'scenes'] },
  { target: 'Objects', synonyms: ['items', 'artifacts', 'loot', 'objects'] },
  { target: 'Families (tree)', synonyms: ['houses', 'families', 'dynasties'] },
  {
    target: 'Game/Rules & Resources',
    synonyms: ['rules', 'mechanics', 'handouts', 'homebrew', 'homerules'],
  },
  { target: 'Game/Quests', synonyms: ['quests', 'missions', 'plots'] },
  {
    target: 'Game/Session Notes',
    synonyms: ['session notes', 'sessions', 'recaps', 'logs'],
  },
  { target: 'Game/Journals', synonyms: ['journals', 'personal logs', 'diaries'] },
  { target: 'Game/Calendars', synonyms: ['calendar', 'calendars'] },
  { target: 'Game/Timelines', synonyms: ['timeline', 'timelines'] },
  { target: 'Game/Events', synonyms: ['events'] },
];

export function sanitizeFolderForSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
}

export function fuzzyMatchImportModule(sourceFolderName: string): MappableImportModule | '' {
  const source = sanitizeFolderForSearch(sourceFolderName);
  for (const entry of MODULE_SYNONYMS) {
    const found = entry.synonyms.some((synonym) => {
      const candidate = sanitizeFolderForSearch(synonym);
      return source.includes(candidate) || candidate.includes(source);
    });
    if (found) return entry.target;
  }
  return '';
}

export function isCanonicalFolderName(folderName: string): boolean {
  return Boolean(fuzzyMatchImportModule(folderName));
}

/** Match any path segment against canonical folder synonyms. */
export function matchCanonicalFolderSegment(
  segments: readonly string[],
): { segment: string; module: MappableImportModule } | null {
  for (const segment of segments) {
    const module = fuzzyMatchImportModule(segment);
    if (module) return { segment, module };
  }
  if (segments.some((segment) => sanitizeFolderForSearch(segment) === 'party')) {
    return { segment: 'party', module: 'Characters' };
  }
  return null;
}

const KANKA_FOLDER_ENTITY_TYPE: Record<string, string> = {
  characters: 'characters',
  locations: 'locations',
  organisations: 'organizations',
  organizations: 'organizations',
  creatures: 'bestiary',
  races: 'ancestries',
  families: 'families',
  quests: 'quests',
  journals: 'journals',
  events: 'events',
  timelines: 'timelines',
  calendars: 'calendars',
  notes: 'characters',
};

const KANKA_TYPE_ENTITY_TYPE: Record<string, string> = {
  npc: 'characters',
  pc: 'characters',
  'player character': 'characters',
  character: 'characters',
  location: 'locations',
  world: 'locations',
  settlement: 'locations',
  city: 'locations',
  organisation: 'organizations',
  organization: 'organizations',
  cult: 'organizations',
  guild: 'organizations',
  journal: 'journals',
  quest: 'quests',
  main: 'quests',
  'character arc': 'quests',
  event: 'events',
  era: 'timelines',
  timeline: 'timelines',
  'session notes': 'session-notes',
  'session note': 'session-notes',
  class: 'rules-resources',
  handout: 'rules-resources',
  creature: 'bestiary',
  monster: 'bestiary',
  race: 'ancestries',
  ancestry: 'ancestries',
  family: 'families',
  house: 'families',
};

export function normalizeKankaEntityType(
  folder: string,
  kankaType: string | null | undefined,
): string {
  const normalizedType = sanitizeFolderForSearch(kankaType ?? '');
  if (normalizedType && KANKA_TYPE_ENTITY_TYPE[normalizedType]) {
    return KANKA_TYPE_ENTITY_TYPE[normalizedType]!;
  }
  const normalizedFolder = folder.trim().toLowerCase();
  if (KANKA_FOLDER_ENTITY_TYPE[normalizedFolder]) {
    return KANKA_FOLDER_ENTITY_TYPE[normalizedFolder]!;
  }
  return 'characters';
}

export function isKankaPlayerCharacterType(kankaType: string | null | undefined): boolean {
  const normalized = sanitizeFolderForSearch(kankaType ?? '');
  return normalized === 'player character' || normalized === 'pc';
}
