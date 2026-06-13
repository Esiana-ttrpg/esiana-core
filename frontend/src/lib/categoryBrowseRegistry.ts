import { DEFAULT_METADATA_COLUMNS, getCategoryColumns } from '@/lib/metadataConfig';

export type CodexBrowseViewMode = 'card' | 'table' | 'hierarchy';

/** Entity categories that default to spatial catalog browse (not table-first). */
export const ENTITY_CATALOG_CATEGORIES = new Set([
  'Characters',
  'Bestiary',
  'Ancestries',
  'Organizations',
  'Factions',
  'Objects',
  'Locations',
  'Families',
]);

export function isEntityCatalogCategory(categoryTitle: string): boolean {
  return ENTITY_CATALOG_CATEGORIES.has(categoryTitle);
}

/** Global refine facet for GM editorial page narrative status (all categories). */
export const NARRATIVE_STATUS_FACET_ID = '__narrativeStatus';

export interface CategoryBrowseProfile {
  searchPlaceholder?: string;
  refineFacetOrder?: string[];
  views?: CodexBrowseViewMode[];
  defaultView?: CodexBrowseViewMode;
  emptyCatalogMessage?: string;
}

const PROFILES: Record<string, CategoryBrowseProfile> = {
  Characters: {
    defaultView: 'card',
    views: ['card', 'table'],
    refineFacetOrder: ['Affiliation', 'Status', 'Family', 'Location'],
  },
  Organizations: {
    defaultView: 'card',
    searchPlaceholder: 'Search factions…',
    refineFacetOrder: ['Type', 'World State', 'Scale', 'Region', 'Parent'],
  },
  Factions: {
    defaultView: 'card',
    searchPlaceholder: 'Search factions…',
    refineFacetOrder: ['Type', 'World State', 'Scale', 'Region', 'Parent'],
  },
  Families: {
    defaultView: 'card',
    refineFacetOrder: ['Type', 'Region', 'Parent', 'Status'],
  },
  Locations: {
    defaultView: 'hierarchy',
    refineFacetOrder: ['Region', 'Type', 'Ruler', 'Population'],
  },
  Bestiary: {
    defaultView: 'card',
    views: ['card', 'table'],
    searchPlaceholder: 'Track creatures…',
    emptyCatalogMessage: 'No creatures catalogued yet.',
    refineFacetOrder: ['Region', 'Threat', 'Habitat', 'Type', 'Intelligence'],
  },
  Ancestries: {
    defaultView: 'card',
    views: ['card', 'table'],
    searchPlaceholder: 'Search peoples and lineages…',
    refineFacetOrder: ['Kind', 'Parent', 'Homeland', 'Population', 'Type'],
  },
  Languages: {
    refineFacetOrder: ['Language Family', 'Script', 'Region', 'Typical Speakers', 'Status'],
  },
  Objects: {
    defaultView: 'card',
    refineFacetOrder: ['Type', 'Significance', 'Holder', 'Invested/Magical'],
  },
  Journals: {
    refineFacetOrder: ['Author', 'Date', 'Category'],
  },
  'Rules/Resources': {
    refineFacetOrder: ['Type', 'Scope', 'Summary', 'Tags'],
  },
  Maps: {
    refineFacetOrder: ['Region', 'Type', 'Scale'],
  },
  Events: {
    refineFacetOrder: ['Type', 'Date', 'Location', 'Status'],
  },
  Quests: {
    searchPlaceholder: 'Search quests…',
  },
  'Narrative Threads': {
    searchPlaceholder: 'Search threads…',
  },
  Threads: {
    searchPlaceholder: 'Search threads…',
  },
  'Quick Access': {
    emptyCatalogMessage: 'No quick access entries yet.',
    refineFacetOrder: [...DEFAULT_METADATA_COLUMNS],
  },
  Bookmarks: {
    emptyCatalogMessage: 'No quick access entries yet.',
    refineFacetOrder: [...DEFAULT_METADATA_COLUMNS],
  },
  Relations: {
    emptyCatalogMessage: 'No recorded relations.',
    refineFacetOrder: [...DEFAULT_METADATA_COLUMNS],
  },
  'Recent Changes': {
    emptyCatalogMessage: 'No recent changes recorded.',
    refineFacetOrder: [...DEFAULT_METADATA_COLUMNS],
  },
  'Recent changes': {
    emptyCatalogMessage: 'No recent changes recorded.',
    refineFacetOrder: [...DEFAULT_METADATA_COLUMNS],
  },
};

export function getCategoryBrowseProfile(
  categoryTitle: string,
): CategoryBrowseProfile {
  return PROFILES[categoryTitle] ?? {};
}

export function getCategoryRefineFacetOrder(categoryTitle: string): string[] {
  const profile = getCategoryBrowseProfile(categoryTitle);
  const base = profile.refineFacetOrder?.length
    ? profile.refineFacetOrder
    : getCategoryColumns(categoryTitle).slice(0, 4);
  return [...base, NARRATIVE_STATUS_FACET_ID];
}

export function getCategorySearchPlaceholder(categoryTitle: string): string {
  const profile = getCategoryBrowseProfile(categoryTitle);
  if (profile.searchPlaceholder) return profile.searchPlaceholder;
  if (categoryTitle === 'Organizations' || categoryTitle === 'Factions') {
    return 'Search factions…';
  }
  return `Search ${categoryTitle.toLowerCase()}…`;
}

export function getCategoryEmptyCatalogMessage(categoryTitle: string): string {
  const profile = getCategoryBrowseProfile(categoryTitle);
  if (profile.emptyCatalogMessage) return profile.emptyCatalogMessage;
  return `No entries in ${categoryTitle} yet.`;
}

export function getCategoryDefaultView(
  categoryTitle: string,
): CodexBrowseViewMode {
  const profile = getCategoryBrowseProfile(categoryTitle);
  if (profile.defaultView) return profile.defaultView;
  if (isEntityCatalogCategory(categoryTitle)) return 'card';
  return 'table';
}

export function getCategoryAllowedViews(
  categoryTitle: string,
): CodexBrowseViewMode[] {
  const profile = getCategoryBrowseProfile(categoryTitle);
  if (profile.views?.length) return profile.views;
  return ['card', 'table', 'hierarchy'];
}

const BESTIARY_FACET_LABELS: Record<string, string> = {
  Region: 'Track by Region',
  Threat: 'Apex Threats',
  Habitat: 'Biome',
  Type: 'Creature Kind',
  Intelligence: 'Cunning',
};

export function getCategoryFacetLabel(
  categoryTitle: string,
  facetId: string,
  defaultLabel: string,
): string {
  if (categoryTitle === 'Bestiary' && facetId in BESTIARY_FACET_LABELS) {
    return BESTIARY_FACET_LABELS[facetId];
  }
  return defaultLabel;
}
