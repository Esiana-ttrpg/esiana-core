import type { CampaignMemberRole } from '../../types/domain.js';

export interface PluginSearchHit {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  href?: string;
  pageId?: string;
  subpath?: string;
  matchedOn?: 'title' | 'alias' | 'metadata' | 'custom_field' | 'body';
  excerpt?: { text: string; field: string };
}

/**
 * Viewer-aware search input for Global Search.
 * Collections that only implement legacy `search()` are never invoked from
 * Global Search.
 */
export interface PluginSearchForViewerInput {
  campaignId: string;
  query: {
    text: string;
    terms: string[];
    phrases: string[];
    excludedTerms: string[];
  };
  viewer: {
    userId: string;
    role: CampaignMemberRole | null;
    isElevated: boolean;
  };
  filters: {
    before: Date | null;
    after: Date | null;
  };
  limit: number;
}

export interface PluginSearchCollectionDefinition {
  id: string;
  label: string;
  /**
   * Legacy viewer-unaware search. Used only by GET /plugins/search.
   * MUST NOT be called from Global Search.
   */
  search: (
    query: string,
    input: { campaignId: string; limit: number },
  ) => Promise<
    Array<{
      id: string;
      title: string;
      subtitle?: string;
      pageId?: string;
      subpath?: string;
    }>
  >;
  /**
   * Opt-in viewer-aware search for Global Search. When absent, the collection
   * is skipped by the global-search adapter.
   */
  searchForViewer?: (
    input: PluginSearchForViewerInput,
  ) => Promise<PluginSearchHit[]>;
}

const searchCollections = new Map<string, PluginSearchCollectionDefinition>();

export function registerSearchCollection(
  pluginId: string,
  definition: PluginSearchCollectionDefinition,
): void {
  searchCollections.set(`${pluginId}:${definition.id}`, definition);
}

export function listSearchCollections(): Array<{
  pluginId: string;
  collectionId: string;
  label: string;
  search: PluginSearchCollectionDefinition['search'];
  searchForViewer?: PluginSearchCollectionDefinition['searchForViewer'];
}> {
  return [...searchCollections.entries()].map(([key, def]) => {
    const [pluginId, collectionId] = key.split(':');
    return {
      pluginId: pluginId!,
      collectionId: collectionId!,
      label: def.label,
      search: def.search,
      searchForViewer: def.searchForViewer,
    };
  });
}

/**
 * Collections that opted into the viewer-aware Global Search contract.
 */
export function listViewerAwareSearchCollections(): Array<{
  pluginId: string;
  collectionId: string;
  label: string;
  searchForViewer: NonNullable<PluginSearchCollectionDefinition['searchForViewer']>;
}> {
  const out: Array<{
    pluginId: string;
    collectionId: string;
    label: string;
    searchForViewer: NonNullable<PluginSearchCollectionDefinition['searchForViewer']>;
  }> = [];
  for (const [key, def] of searchCollections.entries()) {
    if (!def.searchForViewer) continue;
    const [pluginId, collectionId] = key.split(':');
    out.push({
      pluginId: pluginId!,
      collectionId: collectionId!,
      label: def.label,
      searchForViewer: def.searchForViewer,
    });
  }
  return out;
}

export function clearSearchCollectionRegistry(): void {
  searchCollections.clear();
}

export async function searchPluginCollections(
  campaignId: string,
  query: string,
  limit = 20,
): Promise<
  Array<{
    pluginId: string;
    collectionId: string;
    label: string;
    id: string;
    title: string;
    subtitle?: string;
    pageId?: string;
    subpath?: string;
  }>
> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const perCollection = Math.max(5, Math.ceil(limit / Math.max(1, searchCollections.size)));
  const results: Array<{
    pluginId: string;
    collectionId: string;
    label: string;
    id: string;
    title: string;
    subtitle?: string;
    pageId?: string;
    subpath?: string;
  }> = [];

  for (const [key, def] of searchCollections.entries()) {
    const [pluginId, collectionId] = key.split(':');
    const hits = await def.search(normalized, {
      campaignId,
      limit: perCollection,
    });
    for (const hit of hits) {
      results.push({
        pluginId: pluginId!,
        collectionId: collectionId!,
        label: def.label,
        ...hit,
      });
      if (results.length >= limit) return results;
    }
  }
  return results;
}
