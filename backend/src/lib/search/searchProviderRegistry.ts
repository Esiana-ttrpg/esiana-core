import type { GlobalSearchResult } from '../../../../shared/globalSearch.js';
import type { SearchContext } from './searchContext.js';

/**
 * A searchable-content contributor for campaign global search.
 *
 * Providers MUST authorize every candidate before returning it. The candidate
 * retrieval stage uses the derived SearchIndexDocument projection (PostgreSQL
 * tsvector / portable LIKE) and MAY over-select, but MUST NOT under-select
 * content the provider advertises as searchable. Authorization remains an
 * authoritative post-retrieval boundary.
 */
export interface SearchProviderResult {
  results: GlobalSearchResult[];
  /** Unstable diagnostic payload (fuzzy ran/skipped, timings, …). */
  diagnostics?: Record<string, unknown>;
  /** True when the provider stopped at SEARCH_CANDIDATE_CEILING. */
  hitCandidateCeiling?: boolean;
}

export interface SearchProvider {
  id: string;
  /**
   * Type keys this provider owns (used for early type-filter skips).
   * Empty / undefined means "owns all / unknown" — always run.
   */
  typeKeys?: readonly string[];
  search: (ctx: SearchContext) => Promise<SearchProviderResult>;
}

const providers = new Map<string, SearchProvider>();

export function registerSearchProvider(provider: SearchProvider): void {
  providers.set(provider.id, provider);
}

export function listSearchProviders(): SearchProvider[] {
  return [...providers.values()];
}

export function clearSearchProviders(): void {
  providers.clear();
}

/** Test helper — replace the registry contents. */
export function setSearchProvidersForTests(next: SearchProvider[]): void {
  providers.clear();
  for (const provider of next) {
    providers.set(provider.id, provider);
  }
}
