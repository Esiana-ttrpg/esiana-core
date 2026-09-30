import {
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  type GlobalSearchResponse,
} from '../../../../shared/globalSearch.js';
import type { SearchContext } from './searchContext.js';
import {
  listSearchProviders,
  registerSearchProvider,
} from './searchProviderRegistry.js';
import {
  compareRankedResults,
  stripInternalSearchMetadata,
  type InternalSearchResult,
} from './searchRanking.js';
import { wikiPageSearchProvider } from './wikiPageSearchProvider.js';
import { pluginSearchProvider } from './pluginSearchProvider.js';
import {
  buildTypeCounts,
  shapeSearchResults,
} from './searchResultShaping.js';

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

  const allAuthorized: InternalSearchResult[] = [];
  const diagnostics: Record<string, unknown> = {};
  let hitCandidateCeiling = false;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]!;
    const chunk = chunks[i]!;
    allAuthorized.push(...(chunk.results as InternalSearchResult[]));
    if (chunk.hitCandidateCeiling) hitCandidateCeiling = true;
    if (chunk.diagnostics) {
      diagnostics[provider.id] = chunk.diagnostics;
      // Flatten wiki fuzzy status to the top level for quick explain reads.
      if (provider.id === 'wiki-pages') {
        Object.assign(diagnostics, chunk.diagnostics);
      }
    }
  }

  allAuthorized.sort(compareRankedResults);

  // Type counts are derived only from authorized hits — never from pre-auth
  // candidates — so restricted content cannot leak through tab metadata.
  // Counts use the full authorized set before shaping/slicing.
  const types = buildTypeCounts(allAuthorized);

  const shaped = shapeSearchResults({
    results: allAuthorized,
    limit: ctx.limit,
    types: ctx.types,
    hitCandidateCeiling,
  });

  const response: GlobalSearchResponse = {
    query: ctx.query.raw,
    results: stripInternalSearchMetadata(shaped.results),
    types,
    ...(shaped.sections && shaped.sections.length > 0
      ? { sections: shaped.sections }
      : {}),
  };

  if (ctx.explain) {
    response.diagnostics = diagnostics;
  }

  return response;
}
