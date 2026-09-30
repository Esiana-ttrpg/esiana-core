import {
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  type GlobalSearchResponse,
  type GlobalSearchResult,
  type GlobalSearchTypeCount,
} from '../../../../shared/globalSearch.js';
import type { SearchContext } from './searchContext.js';
import {
  listSearchProviders,
  registerSearchProvider,
} from './searchProviderRegistry.js';
import { compareRankedResults } from './searchRanking.js';
import { wikiPageSearchProvider } from './wikiPageSearchProvider.js';
import { pluginSearchProvider } from './pluginSearchProvider.js';

let providersRegistered = false;

function ensureCoreProvidersRegistered(): void {
  if (providersRegistered) return;
  registerSearchProvider(wikiPageSearchProvider);
  // Only collections that implement searchForViewer participate. Legacy
  // viewer-unaware search() is never adapted into Global Search.
  registerSearchProvider(pluginSearchProvider);
  providersRegistered = true;
}

/** Test helper — allow re-registration after clearSearchProviders(). */
export function resetSearchProviderBootstrapForTests(): void {
  providersRegistered = false;
}

function buildTypeCounts(results: GlobalSearchResult[]): GlobalSearchTypeCount[] {
  const byKey = new Map<string, GlobalSearchTypeCount>();
  for (const result of results) {
    const existing = byKey.get(result.type.key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(result.type.key, {
        key: result.type.key,
        label: result.type.label,
        count: 1,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

/**
 * Campaign global search entry point.
 *
 * Returns an empty response for queries shorter than
 * GLOBAL_SEARCH_MIN_QUERY_LENGTH without hitting the database.
 */
export async function searchCampaign(
  ctx: SearchContext,
): Promise<GlobalSearchResponse> {
  const empty: GlobalSearchResponse = {
    query: ctx.query.raw,
    results: [],
    types: [],
  };

  if (ctx.query.text.length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) {
    return empty;
  }
  if (ctx.query.tokens.length === 0) {
    return empty;
  }

  ensureCoreProvidersRegistered();

  const providers = listSearchProviders();
  const chunks = await Promise.all(providers.map((provider) => provider.search(ctx)));
  const allAuthorized = chunks.flat();
  allAuthorized.sort(compareRankedResults);

  // Type counts are derived only from authorized hits — never from pre-auth
  // candidates — so restricted content cannot leak through tab metadata.
  const types = buildTypeCounts(allAuthorized);

  const filtered =
    ctx.types == null || ctx.types.length === 0
      ? allAuthorized
      : allAuthorized.filter((r) => ctx.types!.includes(r.type.key));

  return {
    query: ctx.query.raw,
    results: filtered.slice(0, ctx.limit),
    types,
  };
}
