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
    synonyms: ['factions', 'guilds', 'organizations', 'sects'],
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
