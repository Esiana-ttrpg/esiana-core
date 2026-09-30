/**
 * Global Search adapter for plugin collections that opt into searchForViewer.
 *
 * Legacy search()-only collections are never invoked here.
 * Authorization: plugins receive viewer context and must project only
 * accessible hits; Core also gates on isCampaignPluginEnabled and applies
 * defensive exclusion checks against returned title/subtitle.
 */

import type { GlobalSearchResult } from '../../../../shared/globalSearch.js';
import { GLOBAL_SEARCH_PLUGIN_TYPE_PREFIX } from '../../../../shared/globalSearchTypes.js';
import { isCampaignPluginEnabled } from '../campaignPlugins.js';
import { listViewerAwareSearchCollections } from '../plugins/pluginSearchRegistry.js';
import type { SearchContext } from './searchContext.js';
import type { SearchProvider } from './searchProviderRegistry.js';
import { providerOwnsRequestedTypes } from './searchTypes.js';

function pluginTypeKey(pluginId: string, collectionId: string): string {
  return `${GLOBAL_SEARCH_PLUGIN_TYPE_PREFIX}${pluginId}:${collectionId}`;
}

function hitSurvivesExclusions(
  hit: { title: string; subtitle?: string },
  excludedTerms: string[],
): boolean {
  if (excludedTerms.length === 0) return true;
  const haystack = `${hit.title} ${hit.subtitle ?? ''}`.toLowerCase();
  return !excludedTerms.some((term) => haystack.includes(term.toLowerCase()));
}

export const pluginSearchProvider: SearchProvider = {
  id: 'plugin-collections',
  // Unknown / dynamic type keys — always run unless types filter is set and
  // contains no plugin: keys (handled per-collection below).

  async search(ctx: SearchContext) {
    // Plugins have no attribution contract — skip when from: is active.
    if (ctx.filters.authorUserIds != null || ctx.filters.authorsUnresolved) {
      return { results: [] };
    }
    // Date filters only have session-note semantics in Pass 2.
    if (ctx.filters.hasDateFilter) {
      return { results: [] };
    }

    const collections = listViewerAwareSearchCollections();
    if (collections.length === 0) return { results: [] };

    const viewerUserId =
      ctx.actor.kind === 'member' ? ctx.actor.userId : null;
    if (!viewerUserId) return { results: [] };

    const results: GlobalSearchResult[] = [];

    for (const collection of collections) {
      const typeKey = pluginTypeKey(collection.pluginId, collection.collectionId);
      if (!providerOwnsRequestedTypes([typeKey], ctx.types)) {
        continue;
      }

      const enabled = await isCampaignPluginEnabled(
        ctx.campaignId,
        collection.pluginId,
      );
      if (!enabled) continue;

      const hits = await collection.searchForViewer({
        campaignId: ctx.campaignId,
        query: {
          text: ctx.query.text,
          terms: ctx.query.terms,
          phrases: ctx.query.phrases,
          excludedTerms: ctx.query.excludedTerms,
        },
        viewer: {
          userId: viewerUserId,
          role: ctx.role,
          isElevated: ctx.isElevated,
        },
        filters: {
          before: ctx.filters.before,
          after: ctx.filters.after,
        },
        limit: ctx.limit,
      });

      for (const hit of hits) {
        if (!hitSurvivesExclusions(hit, ctx.query.excludedTerms)) continue;

        const href =
          hit.href ??
          (hit.pageId
            ? `/campaigns/${ctx.campaignHandle}/pages/${hit.pageId}${hit.subpath ?? ''}`
            : `/campaigns/${ctx.campaignHandle}`);

        results.push({
          id: `${typeKey}:${hit.id}`,
          entityId: hit.id,
          campaignId: ctx.campaignId,
          type: { key: typeKey, label: collection.label },
          title: hit.title,
          ...(hit.subtitle ? { subtitle: hit.subtitle } : {}),
          ...(hit.imageUrl ? { image: { url: hit.imageUrl } } : {}),
          fallbackIcon: 'puzzle',
          ...(hit.excerpt ? { excerpt: hit.excerpt } : {}),
          href,
          matchedOn: hit.matchedOn ?? 'title',
          score: hit.matchedOn === 'title' ? 700_000 : 100_000,
        });
      }
    }

    return { results };
  },
};
