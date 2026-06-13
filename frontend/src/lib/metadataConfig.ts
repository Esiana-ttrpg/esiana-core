/**
 * Metadata configuration registry for wiki categories.
 * Defines which columns/fields should be displayed in list view for each category.
 */

import {
  defaultPriorityForColumnIndex,
  type ContentPriority,
  type PriorityColumnDef,
} from './contentPriorityCollapse';

export interface MetadataRegistry {
  [categoryName: string]: string[];
}

export interface CategoryColumnDef extends PriorityColumnDef {
  key: string;
  priority: ContentPriority;
}

/** Explicit priority tiers for entity catalog surfaces (collapse before horizontal scroll). */
const COLUMN_PRIORITY_OVERRIDES: Partial<
  Record<string, Record<string, ContentPriority>>
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
    Motivation: 'tertiary',
  },
  Factions: {
    Type: 'primary',
    'World State': 'primary',
    Region: 'primary',
    Scale: 'secondary',
    Parent: 'secondary',
    Motivation: 'tertiary',
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
    Intelligence: 'tertiary',
  },
  Ancestries: {
    Kind: 'primary',
    Parent: 'primary',
    Homeland: 'secondary',
    Population: 'secondary',
    Type: 'tertiary',
  },
  Objects: {
    Type: 'primary',
    Significance: 'primary',
    Holder: 'secondary',
    'Invested/Magical': 'tertiary',
  },
  Families: {
    Type: 'primary',
    Region: 'primary',
    Parent: 'secondary',
    Status: 'secondary',
  },
};

/**
 * Central configuration for metadata columns per category.
 * The order of fields determines the column order in the table.
 */
export const METADATA_CONFIG: MetadataRegistry = {
  Characters: [
    'Role',
    'Affiliation',
    'Family',
    'Status',
    'Location',
  ],
  Locations: [
    'Region',
    'Type',
    'Ruler',
    'Population',
  ],
  Quests: [
    'Type',
    'Parent',
    'Quest Giver',
    'Location',
    'Progress',
    'Date',
    'Tags',
  ],
  Organizations: [
    'Type',
    'World State',
    'Region',
    'Scale',
    'Parent',
    'Motivation',
  ],
  Factions: [
    'Type',
    'World State',
    'Region',
    'Scale',
    'Parent',
    'Motivation',
  ],
  Objects: [
    'Type',
    'Significance',
    'Holder',
    'Invested/Magical',
  ],
  Bestiary: [
    'Type',
    'Habitat',
    'Threat',
    'Region',
    'Intelligence',
  ],
  Ancestries: [
    'Kind',
    'Parent',
    'Homeland',
    'Population',
    'Type',
  ],
  Families: [
    'Type',
    'Region',
    'Parent',
    'Status',
  ],
  Maps: [
    'Region',
    'Type',
    'Scale',
  ],
  Events: [
    'Type',
    'Date',
    'Location',
    'Status',
  ],
  Journals: [
    'Author',
    'Date',
    'Category',
  ],
  'Rules/Resources': [
    'Type',
    'Scope',
    'Summary',
    'Tags',
  ],
  Timelines: [
    'Type',
    'Era',
    'Status',
  ],
  Calendars: [
    'System',
    'Region',
    'Type',
  ],
};

/**
 * Default metadata columns for any unknown category.
 * Used as fallback when a category is not explicitly defined.
 */
export const DEFAULT_METADATA_COLUMNS = [
  'Type',
  'Parent',
  'Tags',
];

/**
 * Get metadata columns for a specific category.
 * Returns the configured columns or the default fallback.
 */
export function getCategoryColumns(categoryName: string): string[] {
  return METADATA_CONFIG[categoryName] ?? DEFAULT_METADATA_COLUMNS;
}

export function getCategoryColumnDefs(categoryName: string): CategoryColumnDef[] {
  const columns = getCategoryColumns(categoryName);
  const overrides = COLUMN_PRIORITY_OVERRIDES[categoryName];
  return columns.map((key, index) => ({
    key,
    priority: overrides?.[key] ?? defaultPriorityForColumnIndex(index),
  }));
}

/**
 * Check if a category has custom metadata configuration.
 */
export function hasCustomMetadata(categoryName: string): boolean {
  return categoryName in METADATA_CONFIG;
}

/**
 * Get all configured categories.
 */
export function getConfiguredCategories(): string[] {
  return Object.keys(METADATA_CONFIG);
}
