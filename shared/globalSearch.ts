/** Shared contract for campaign global search results. */

export type GlobalSearchMatchedOn =
  | 'title'
  | 'alias'
  | 'metadata'
  | 'custom_field'
  | 'body';

export interface GlobalSearchTypeInfo {
  key: string;
  label: string;
}

export interface GlobalSearchImage {
  url: string;
  thumbUrl?: string;
}

export interface GlobalSearchExcerpt {
  /** Short plain-text snippet around the match. */
  text: string;
  /** User-facing field label, e.g. "Biography" or "Custom field · Homeland". */
  field: string;
}

export interface GlobalSearchResult {
  /** Stable result id (usually `${type.key}:${entityId}`). */
  id: string;
  entityId: string;
  campaignId: string;
  type: GlobalSearchTypeInfo;
  title: string;
  subtitle?: string;
  image?: GlobalSearchImage;
  /** Lucide icon name used when no image is available. */
  fallbackIcon?: string;
  /** Present only when the match came from non-title content. */
  excerpt?: GlobalSearchExcerpt;
  href: string;
  matchedOn: GlobalSearchMatchedOn;
  score: number;
}

export interface GlobalSearchTypeCount extends GlobalSearchTypeInfo {
  count: number;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  types: GlobalSearchTypeCount[];
}

/** Minimum query length before the search service hits the database. */
export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;

/** Maximum characters accepted for `q`. */
export const GLOBAL_SEARCH_MAX_QUERY_LENGTH = 256;

/** Default / max result page size returned to the client. */
export const GLOBAL_SEARCH_DEFAULT_LIMIT = 20;
export const GLOBAL_SEARCH_MAX_LIMIT = 50;
