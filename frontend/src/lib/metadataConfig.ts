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
  optional?: boolean;
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
    'Parent/Region': 'primary',
    Type: 'primary',
    Status: 'secondary',
    'Key Connections': 'secondary',
    Population: 'tertiary',
    Ruler: 'tertiary',
    Climate: 'tertiary',
    Threats: 'tertiary',
    Map: 'tertiary',
    'Known for': 'tertiary',
    'Related locations': 'tertiary',
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
    'Parent/Region',
    'Type',
    'Status',
    'Key Connections',
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

/** Optional atlas columns (Locations first consumer). */
export const OPTIONAL_METADATA_CONFIG: MetadataRegistry = {
  Locations: [
    'Population',
    'Ruler',
    'Climate',
    'Threats',
    'Map',
    'Known for',
    'Related locations',
  ],
};

const LOCATIONS_METADATA_FIELD_KEYS = [
  'Type',
  'Status',
  'Region',
  'Ruler',
  'Population',
];

const COLUMN_HEADER_LABELS: Partial<Record<string, string>> = {
  Ruler: 'Ruler / Government',
};

/** Table columns derived from browse projection — not inline-editable metadata fields. */
export const LOCATION_DERIVED_READONLY_COLUMNS = new Set([
  'Parent/Region',
  'Key Connections',
  'Map',
  'Related locations',
  'Climate',
  'Threats',
  'Known for',
]);

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
export function getCategoryDefaultColumns(categoryName: string): string[] {
  return METADATA_CONFIG[categoryName] ?? DEFAULT_METADATA_COLUMNS;
}

export function getCategoryOptionalColumns(categoryName: string): string[] {
  return OPTIONAL_METADATA_CONFIG[categoryName] ?? [];
}

export function hasCategoryOptionalColumns(categoryName: string): boolean {
  return getCategoryOptionalColumns(categoryName).length > 0;
}

/** Wiki metadata.fields keys shown in editors and display filters. */
export function getCategoryMetadataFieldKeys(categoryName: string): string[] {
  if (categoryName === 'Locations') {
    return [...LOCATIONS_METADATA_FIELD_KEYS];
  }
  return getCategoryDefaultColumns(categoryName);
}

export function getCategoryColumnHeaderLabel(columnKey: string): string {
  return COLUMN_HEADER_LABELS[columnKey] ?? columnKey;
}

export function normalizeSelectedOptionalColumnKeys(
  categoryName: string,
  raw: unknown,
): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(getCategoryOptionalColumns(categoryName));
  return raw.filter(
    (key): key is string => typeof key === 'string' && allowed.has(key),
  );
}

export function getCategoryColumns(categoryName: string): string[] {
  return getCategoryDefaultColumns(categoryName);
}

export function getCategoryColumnDefs(
  categoryName: string,
  selectedOptionalKeys?: string[],
): CategoryColumnDef[] {
  const defaults = getCategoryDefaultColumns(categoryName);
  const optionalAll = getCategoryOptionalColumns(categoryName);
  const optionalSelected =
    optionalAll.length > 0 && selectedOptionalKeys
      ? optionalAll.filter((key) => selectedOptionalKeys.includes(key))
      : [];
  const columns =
    optionalAll.length > 0
      ? [...defaults, ...optionalSelected]
      : defaults;
  const overrides = COLUMN_PRIORITY_OVERRIDES[categoryName];
  const optionalSet = new Set(optionalAll);
  return columns.map((key, index) => ({
    key,
    priority: overrides?.[key] ?? defaultPriorityForColumnIndex(index),
    optional: optionalSet.has(key),
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
