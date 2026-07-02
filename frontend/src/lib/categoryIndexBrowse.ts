import type { CategoryIndexChild } from '@/lib/wiki';
import {
  getCategoryFacetLabel,
  getCategoryRefineFacetOrder,
  getCategorySearchPlaceholder,
  NARRATIVE_STATUS_FACET_ID,
} from '@/lib/categoryBrowseRegistry';
import {
  getDisplayMetadata,
  readCategoryMetadataField,
} from '@/lib/wikiMetadata';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import { parseObjectMetadata } from '@/lib/objectMetadata';
import {
  formatWorkspaceCountLabel,
  resolveCategoryCountNouns,
} from '@/lib/workspaceHeaderPolicy';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import { parseRuleResourceMetadata } from '@/lib/ruleResourceMetadata';
import {
  formatPageNarrativeStatusLabel,
  normalizePageNarrativeStatus,
  parseStatusSearchToken,
  stripStatusSearchToken,
} from '@shared/pageNarrativeStatus';

/** Future: curated per-category search domains in metadataConfig. */
export type CategoryIndexFacetId = string;

export interface CategoryIndexFacetDef {
  id: CategoryIndexFacetId;
  label: string;
  readValue: (child: CategoryIndexChild, categoryTitle: string) => string | null;
}

/** facetId → option value → selected (true = show entries with this value). */
export type CategoryIndexRefineState = Record<
  CategoryIndexFacetId,
  Record<string, boolean>
>;

const TITLE_MATCH_BONUS = 100;
const TITLE_STARTS_BONUS = 50;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function normalizeHaystackPart(value: string): string {
  return value.trim().toLowerCase();
}

export function getCategoryIndexSearchPlaceholder(categoryTitle: string): string {
  return getCategorySearchPlaceholder(categoryTitle);
}

export function buildCategoryIndexSearchHaystack(
  child: CategoryIndexChild,
  categoryTitle: string,
): string {
  const parts: string[] = [child.title];

  if (categoryTitle === 'Characters') {
    const identity = parseCharacterMetadata(child.metadata);
    if (identity.knownFor) parts.push(identity.knownFor);
    const display = getDisplayMetadata(child.metadata, categoryTitle);
    for (const field of display) {
      if (field.value) parts.push(field.value);
    }
  } else if (categoryTitle === 'Bestiary') {
    const bestiary = parseBestiaryMetadata(child.metadata);
    if (bestiary.knownFor) parts.push(bestiary.knownFor);
    if (bestiary.behaviorSummary) parts.push(bestiary.behaviorSummary);
    const display = getDisplayMetadata(child.metadata, categoryTitle);
    for (const field of display) {
      if (field.value) parts.push(field.value);
    }
  } else if (categoryTitle === 'Ancestries') {
    const ancestry = parseAncestryMetadata(child.metadata);
    if (ancestry.knownFor) parts.push(ancestry.knownFor);
    if (ancestry.traditions) parts.push(ancestry.traditions);
    if (ancestry.values) parts.push(ancestry.values);
    const display = getDisplayMetadata(child.metadata, categoryTitle);
    for (const field of display) {
      if (field.value) parts.push(field.value);
    }
  } else if (categoryTitle === 'Objects') {
    const object = parseObjectMetadata(child.metadata);
    if (object.knownFor) parts.push(object.knownFor);
    if (object.powersSummary) parts.push(object.powersSummary);
    if (object.provenance) parts.push(object.provenance);
    const display = getDisplayMetadata(child.metadata, categoryTitle);
    for (const field of display) {
      if (field.value) parts.push(field.value);
    }
  } else if (categoryTitle === 'Locations') {
    const location = parseLocationMetadata(child.metadata);
    if (location.knownFor) parts.push(location.knownFor);
    if (location.climate) parts.push(location.climate);
    const display = getDisplayMetadata(child.metadata, categoryTitle);
    for (const field of display) {
      if (field.value) parts.push(field.value);
    }
  } else if (categoryTitle === 'Rules/Resources') {
    const resource = parseRuleResourceMetadata(child.metadata);
    if (resource.summary) parts.push(resource.summary);
    if (resource.topicTags.length > 0) parts.push(resource.topicTags.join(' '));
    const display = getDisplayMetadata(child.metadata, categoryTitle);
    for (const field of display) {
      if (field.value) parts.push(field.value);
    }
  } else {
    const display = getDisplayMetadata(child.metadata, categoryTitle);
    for (const field of display) {
      if (field.value) parts.push(field.value);
    }
  }

  if (child.snippet) parts.push(child.snippet);

  if (child.narrativeStatus?.label) {
    parts.push(child.narrativeStatus.label);
    parts.push(child.narrativeStatus.status);
  }

  const tags = readCategoryMetadataField(child.metadata, 'Tags');
  if (tags) parts.push(tags);

  return parts.map(normalizeHaystackPart).filter(Boolean).join(' ');
}

export function matchesCategoryIndexSearch(
  child: CategoryIndexChild,
  query: string,
  categoryTitle: string,
): boolean {
  const statusToken = parseStatusSearchToken(query);
  const textQuery = stripStatusSearchToken(query);
  if (statusToken) {
    const childStatus =
      child.narrativeStatus?.status ??
      normalizePageNarrativeStatus(
        readCategoryMetadataField(child.metadata, 'Status') ?? '',
      );
    if (childStatus !== statusToken) return false;
  }
  const normalized = normalizeQuery(textQuery);
  if (!normalized) return true;
  const haystack = buildCategoryIndexSearchHaystack(child, categoryTitle);
  return haystack.includes(normalized);
}

export function categoryIndexSearchRank(
  child: CategoryIndexChild,
  query: string,
): number {
  const normalized = normalizeQuery(query);
  if (!normalized) return 0;
  const title = normalizeHaystackPart(child.title);
  let score = 0;
  if (title.includes(normalized)) score += TITLE_MATCH_BONUS;
  if (title.startsWith(normalized)) score += TITLE_STARTS_BONUS;
  return score;
}

export function compareCategoryIndexSearchRank(
  a: CategoryIndexChild,
  b: CategoryIndexChild,
  query: string,
): number {
  const rankDiff =
    categoryIndexSearchRank(b, query) - categoryIndexSearchRank(a, query);
  if (rankDiff !== 0) return rankDiff;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

function readMetadataColumnValue(
  child: CategoryIndexChild,
  column: string,
): string | null {
  const value = readCategoryMetadataField(child.metadata, column);
  return value?.trim() ? value.trim() : null;
}

function narrativeStatusFacetDef(): CategoryIndexFacetDef {
  return {
    id: '__narrativeStatus',
    label: 'Narrative status',
    readValue: (child) =>
      child.narrativeStatus?.label ??
      formatPageNarrativeStatusLabel(
        child.narrativeStatus?.status ?? 'ACTIVE',
      ),
  };
}

function visibilityFacetDef(): CategoryIndexFacetDef {
  return {
    id: '__visibility',
    label: 'Visibility',
    readValue: (child) => child.visibility?.trim() || null,
  };
}

function characterColumnFacet(column: string): CategoryIndexFacetDef {
  return {
    id: column,
    label: column,
    readValue: (child, categoryTitle) => {
      const display = getDisplayMetadata(child.metadata, categoryTitle);
      const match = display.find((field) => field.key === column);
      return match?.value?.trim() ? match.value.trim() : null;
    },
  };
}

function columnFacet(column: string, categoryTitle: string): CategoryIndexFacetDef {
  return {
    id: column,
    label: getCategoryFacetLabel(categoryTitle, column, column),
    readValue: (child) => readMetadataColumnValue(child, column),
  };
}

function facetDefForId(
  facetId: string,
  categoryTitle: string,
): CategoryIndexFacetDef {
  if (facetId === NARRATIVE_STATUS_FACET_ID) return narrativeStatusFacetDef();
  if (categoryTitle === 'Characters') return characterColumnFacet(facetId);
  return columnFacet(facetId, categoryTitle);
}

/** Facet definitions for a category index (order = UI order). */
export function getCategoryIndexFacetDefs(
  categoryTitle: string,
  isDMUser: boolean,
): CategoryIndexFacetDef[] {
  const facets = getCategoryRefineFacetOrder(categoryTitle).map((facetId) =>
    facetDefForId(facetId, categoryTitle),
  );

  if (
    isDMUser &&
    (categoryTitle === 'Organizations' ||
      categoryTitle === 'Factions' ||
      categoryTitle === 'Families')
  ) {
    facets.push(visibilityFacetDef());
  }

  return facets;
}

export function deriveFacetOptions(
  children: CategoryIndexChild[],
  facet: CategoryIndexFacetDef,
  categoryTitle: string,
): string[] {
  const values = new Set<string>();
  let hasUnset = false;
  for (const child of children) {
    const value = facet.readValue(child, categoryTitle);
    if (value) values.add(value);
    else hasUnset = true;
  }
  const sorted = [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  if (hasUnset) sorted.push('(unset)');
  return sorted;
}

export function createDefaultRefineState(
  facetDefs: CategoryIndexFacetDef[],
  children: CategoryIndexChild[],
  categoryTitle: string,
): CategoryIndexRefineState {
  const state: CategoryIndexRefineState = {};
  for (const facet of facetDefs) {
    const options = deriveFacetOptions(children, facet, categoryTitle);
    state[facet.id] = Object.fromEntries(options.map((option) => [option, true]));
  }
  return state;
}

export function mergeRefineStateWithNewOptions(
  current: CategoryIndexRefineState,
  facetDefs: CategoryIndexFacetDef[],
  children: CategoryIndexChild[],
  categoryTitle: string,
): CategoryIndexRefineState {
  const next: CategoryIndexRefineState = { ...current };
  for (const facet of facetDefs) {
    const options = deriveFacetOptions(children, facet, categoryTitle);
    const prevFacet = current[facet.id] ?? {};
    next[facet.id] = Object.fromEntries(
      options.map((option) => [option, prevFacet[option] ?? true]),
    );
  }
  return next;
}

export function matchesCategoryIndexRefine(
  child: CategoryIndexChild,
  refineState: CategoryIndexRefineState,
  facetDefs: CategoryIndexFacetDef[],
  categoryTitle: string,
  allChildren: CategoryIndexChild[],
): boolean {
  for (const facet of facetDefs) {
    const options = deriveFacetOptions(allChildren, facet, categoryTitle);
    const facetState = refineState[facet.id] ?? {};
    const value = facet.readValue(child, categoryTitle);

    const selectedKeys = Object.entries(facetState)
      .filter(([, selected]) => selected)
      .map(([key]) => key);

    if (options.length === 0) continue;
    if (selectedKeys.length === 0) return false;

    if (!value) {
      if (!selectedKeys.includes('(unset)')) return false;
      continue;
    }
    if (!selectedKeys.includes(value)) return false;
  }
  return true;
}

export function hasActiveCategoryIndexRefine(
  refineState: CategoryIndexRefineState,
  facetDefs: CategoryIndexFacetDef[],
  children: CategoryIndexChild[],
  categoryTitle: string,
): boolean {
  for (const facet of facetDefs) {
    const options = deriveFacetOptions(children, facet, categoryTitle);
    const facetState = refineState[facet.id] ?? {};
    for (const option of options) {
      if (facetState[option] === false) return true;
    }
    if (options.length > 0 && facetState['(unset)'] === false) return true;
  }
  return false;
}

export function resetCategoryIndexRefine(
  facetDefs: CategoryIndexFacetDef[],
  children: CategoryIndexChild[],
  categoryTitle: string,
): CategoryIndexRefineState {
  return createDefaultRefineState(facetDefs, children, categoryTitle);
}

export interface ActiveRefineChip {
  facetId: string;
  facetLabel: string;
  optionValue: string;
}

export function listActiveRefineChips(
  refineState: CategoryIndexRefineState,
  facetDefs: CategoryIndexFacetDef[],
  children: CategoryIndexChild[],
  categoryTitle: string,
): ActiveRefineChip[] {
  const chips: ActiveRefineChip[] = [];
  for (const facet of facetDefs) {
    const options = deriveFacetOptions(children, facet, categoryTitle);
    if (options.length === 0) continue;
    const facetState = refineState[facet.id] ?? {};
    const selected = options.filter((option) => facetState[option] !== false);
    if (selected.length === 0 || selected.length === options.length) continue;
    for (const option of selected) {
      chips.push({
        facetId: facet.id,
        facetLabel: facet.label,
        optionValue: option,
      });
    }
  }
  return chips;
}

export function clearRefineChip(
  refineState: CategoryIndexRefineState,
  facetId: string,
  optionValue: string,
): CategoryIndexRefineState {
  return {
    ...refineState,
    [facetId]: {
      ...(refineState[facetId] ?? {}),
      [optionValue]: true,
    },
  };
}

export function findSimilarCategoryIndexEntries(
  children: CategoryIndexChild[],
  query: string,
  limit = 5,
): CategoryIndexChild[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const scored: Array<{ child: CategoryIndexChild; score: number }> = [];

  for (const child of children) {
    const title = normalizeHaystackPart(child.title);
    if (title === normalized) continue;

    let score = 0;
    if (title.startsWith(normalized)) score += 3;
    else if (title.includes(normalized)) score += 2;
    else if (normalized.length >= 3 && title.includes(normalized.slice(0, 3))) {
      score += 1;
    }

    if (score > 0) scored.push({ child, score });
  }

  scored.sort((a, b) => b.score - a.score || a.child.title.localeCompare(b.child.title));
  return scored.slice(0, limit).map((entry) => entry.child);
}

export type CategoryIndexBrowseProjectionOptions = {
  searchQuery: string;
  refineState: CategoryIndexRefineState;
  facetDefs: CategoryIndexFacetDef[];
  categoryTitle: string;
};

/**
 * Single search/refine projection for EntityBrowserView.
 * Card, table, and hierarchy modes must consume this result only — do not
 * re-filter in IndexGridView, CodexHierarchyView, or IndexCardView.
 * Facet order and placeholders come from categoryBrowseRegistry via
 * getCategoryIndexFacetDefs / getCategoryIndexSearchPlaceholder.
 */
export function projectCategoryIndexBrowseChildren(
  children: CategoryIndexChild[],
  options: CategoryIndexBrowseProjectionOptions,
): CategoryIndexChild[] {
  return filterAndSortCategoryIndexChildren(children, options);
}

export function filterAndSortCategoryIndexChildren(
  children: CategoryIndexChild[],
  options: CategoryIndexBrowseProjectionOptions,
): CategoryIndexChild[] {
  const { searchQuery, refineState, facetDefs, categoryTitle } = options;
  const normalizedSearch = normalizeQuery(searchQuery);

  let result = children.filter((child) =>
    matchesCategoryIndexSearch(child, searchQuery, categoryTitle),
  );

  if (facetDefs.length > 0) {
    result = result.filter((child) =>
      matchesCategoryIndexRefine(
        child,
        refineState,
        facetDefs,
        categoryTitle,
        children,
      ),
    );
  }

  if (normalizedSearch) {
    result = [...result].sort((a, b) =>
      compareCategoryIndexSearchRank(a, b, searchQuery),
    );
  }

  return result;
}

export function formatCategoryIndexResultCount(
  total: number,
  matching: number,
  categoryTitle: string,
  searchQuery: string,
  hasActiveRefine: boolean,
): string | null {
  const hasSearch = normalizeQuery(searchQuery).length > 0;
  if (!hasSearch && !hasActiveRefine && matching === total) return null;
  const { singular, plural } = resolveCategoryCountNouns(categoryTitle);
  if (matching === total) return formatWorkspaceCountLabel(total, singular, plural);
  return `Showing ${matching} of ${total}`;
}

export function isBrowseActive(
  searchQuery: string,
  hasActiveRefine: boolean,
): boolean {
  return normalizeQuery(searchQuery).length > 0 || hasActiveRefine;
}
