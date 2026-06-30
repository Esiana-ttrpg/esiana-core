/**
 * Wiki index metadata column registry (browser-safe).
 * Mirrors frontend metadataConfig.ts for subtitle consistency.
 */

export type WikiIndexColumnPriority = 'primary' | 'secondary' | 'tertiary' | 'operator';

export interface WikiIndexColumnDef {
  key: string;
  priority: WikiIndexColumnPriority;
}

const COLUMN_PRIORITY_OVERRIDES: Partial<
  Record<string, Record<string, WikiIndexColumnPriority>>
> = {
  Characters: {
    Role: 'primary',
    Affiliation: 'primary',
    Status: 'primary',
    Family: 'secondary',
    Location: 'secondary',
  },
  Organizations: {
    Type: 'primary',
    'World State': 'primary',
    Region: 'primary',
    Scale: 'secondary',
    Parent: 'secondary',
  },
  Factions: {
    Type: 'primary',
    'World State': 'primary',
    Region: 'primary',
    Scale: 'secondary',
    Parent: 'secondary',
  },
  Locations: {
    Region: 'primary',
    Type: 'primary',
    Ruler: 'secondary',
    Population: 'tertiary',
  },
  Bestiary: {
    Type: 'primary',
    Threat: 'primary',
    Habitat: 'secondary',
    Region: 'secondary',
  },
  Objects: {
    Type: 'primary',
    Significance: 'primary',
    Holder: 'secondary',
  },
  Maps: {
    Region: 'primary',
    Type: 'primary',
    Scale: 'secondary',
  },
  Events: {
    Type: 'primary',
    Date: 'secondary',
    Location: 'secondary',
    Status: 'secondary',
  },
};

const METADATA_COLUMNS: Record<string, string[]> = {
  Characters: ['Role', 'Affiliation', 'Family', 'Status', 'Location'],
  Organizations: ['Type', 'World State', 'Region', 'Scale', 'Parent', 'Motivation'],
  Factions: ['Type', 'World State', 'Region', 'Scale', 'Parent', 'Motivation'],
  Locations: ['Region', 'Type', 'Ruler', 'Population'],
  Bestiary: ['Type', 'Habitat', 'Threat', 'Region', 'Intelligence'],
  Objects: ['Type', 'Significance', 'Holder', 'Invested/Magical'],
  Maps: ['Region', 'Type', 'Scale'],
  Events: ['Type', 'Date', 'Location', 'Status'],
};

const DEFAULT_COLUMNS = ['Type', 'Parent', 'Tags'];

function defaultPriorityForIndex(index: number): WikiIndexColumnPriority {
  if (index === 0) return 'primary';
  if (index <= 2) return 'secondary';
  if (index <= 4) return 'tertiary';
  return 'operator';
}

export function getWikiIndexCategoryColumns(categoryTitle: string): string[] {
  return METADATA_COLUMNS[categoryTitle] ?? DEFAULT_COLUMNS;
}

export function getWikiIndexColumnDefs(categoryTitle: string): WikiIndexColumnDef[] {
  const columns = getWikiIndexCategoryColumns(categoryTitle);
  const overrides = COLUMN_PRIORITY_OVERRIDES[categoryTitle];
  return columns.map((key, index) => ({
    key,
    priority: overrides?.[key] ?? defaultPriorityForIndex(index),
  }));
}

export function getWikiIndexPrimaryColumnKeys(categoryTitle: string): string[] {
  return getWikiIndexColumnDefs(categoryTitle)
    .filter((col) => col.priority === 'primary')
    .map((col) => col.key)
    .slice(0, 2);
}
