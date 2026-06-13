import { getCategoryEmptyCatalogMessage } from '@/lib/categoryBrowseRegistry';
import type { CategoryIndexChild } from '@/lib/wiki';

export type CategoryIndexEmptyVariant =
  | 'no_entries'
  | 'refine_miss'
  | 'search_miss'
  | 'search_miss_no_create';

export interface CategoryIndexEmptyStateInput {
  totalCount: number;
  filteredCount: number;
  searchQuery: string;
  hasActiveRefine: boolean;
  canCreate: boolean;
}

export interface CategoryIndexEmptyStateResult {
  variant: CategoryIndexEmptyVariant | null;
  message: string;
  showCreateFromSearch: boolean;
  showResetRefine: boolean;
  showClearSearch: boolean;
  createLabel: string | null;
}

function normalizeSearchQuery(query: string): string {
  return query.trim();
}

function searchMissMessage(categoryTitle: string, query: string): string {
  const quoted = `"${query}"`;
  switch (categoryTitle) {
    case 'Characters':
      return `No characters match ${quoted}.`;
    case 'Organizations':
    case 'Factions':
      return `No known factions match ${quoted}.`;
    case 'Families':
      return `No families match ${quoted}.`;
    case 'Locations':
      return `No locations match ${quoted}.`;
    case 'Adventure':
      return `No quests match ${quoted}.`;
    default:
      return `No ${categoryTitle.toLowerCase()} match ${quoted}.`;
  }
}

function refineMissMessage(categoryTitle: string): string {
  switch (categoryTitle) {
    case 'Characters':
      return 'No characters match the current refine.';
    case 'Organizations':
    case 'Factions':
      return 'No known factions match the current refine.';
    case 'Locations':
      return 'No locations match the current refine.';
    default:
      return `No ${categoryTitle.toLowerCase()} match the current refine.`;
  }
}

export function resolveCategoryIndexEmptyVariant(
  input: CategoryIndexEmptyStateInput,
): CategoryIndexEmptyVariant | null {
  const { totalCount, filteredCount, searchQuery, hasActiveRefine } = input;

  if (totalCount === 0) return 'no_entries';
  if (filteredCount > 0) return null;

  const query = normalizeSearchQuery(searchQuery);
  if (query) {
    return input.canCreate ? 'search_miss' : 'search_miss_no_create';
  }
  if (hasActiveRefine) return 'refine_miss';
  return null;
}

export function getCategoryEmptyState(
  input: CategoryIndexEmptyStateInput & {
    categoryTitle: string;
    itemLabel: string;
  },
): CategoryIndexEmptyStateResult {
  const variant = resolveCategoryIndexEmptyVariant(input);
  const query = normalizeSearchQuery(input.searchQuery);

  if (!variant) {
    return {
      variant: null,
      message: '',
      showCreateFromSearch: false,
      showResetRefine: false,
      showClearSearch: false,
      createLabel: null,
    };
  }

  if (variant === 'no_entries') {
    return {
      variant,
      message: getCategoryEmptyCatalogMessage(input.categoryTitle),
      showCreateFromSearch: false,
      showResetRefine: false,
      showClearSearch: false,
      createLabel: null,
    };
  }

  if (variant === 'refine_miss') {
    return {
      variant,
      message: refineMissMessage(input.categoryTitle),
      showCreateFromSearch: false,
      showResetRefine: true,
      showClearSearch: false,
      createLabel: null,
    };
  }

  const createLabel = `Create ${input.itemLabel.toLowerCase()} "${query}"`;
  return {
    variant,
    message: searchMissMessage(input.categoryTitle, query),
    showCreateFromSearch: variant === 'search_miss',
    showResetRefine: false,
    showClearSearch: true,
    createLabel,
  };
}

export interface SimilarEntryLink {
  id: string;
  title: string;
}

export function mapSimilarEntries(
  entries: CategoryIndexChild[],
): SimilarEntryLink[] {
  return entries.map((child) => ({ id: child.id, title: child.title }));
}
