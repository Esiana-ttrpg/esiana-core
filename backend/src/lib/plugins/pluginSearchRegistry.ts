import type { IRouter } from 'express';

export interface PluginSearchCollectionDefinition {
  id: string;
  label: string;
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
}> {
  return [...searchCollections.entries()].map(([key, def]) => {
    const [pluginId, collectionId] = key.split(':');
    return { pluginId, collectionId, label: def.label, search: def.search };
  });
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
        pluginId,
        collectionId,
        label: def.label,
        ...hit,
      });
      if (results.length >= limit) return results;
    }
  }
  return results;
}
