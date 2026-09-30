import type { CampaignActor } from '../../../../shared/campaignPolicy/policy.js';
import type { GlobalSearchParsedQuery } from '../../../../shared/globalSearchQuery.js';
import type { CampaignMemberRole } from '../../types/domain.js';
import {
  parseGlobalSearchQuery,
  positiveSearchTokens,
} from '../../../../shared/globalSearchQuery.js';

/**
 * Normalized query parts produced by the structured-query parser.
 * `tokens` is the candidate/ranking token list (terms ∪ phrase words).
 */
export interface SearchQueryParts {
  /** Original request string (trimmed). */
  raw: string;
  /** Free-text portion used for matching (terms + phrases, lowercased). */
  text: string;
  /** Whitespace-split tokens of free text (terms ∪ phrase words). */
  tokens: string[];
  terms: string[];
  phrases: string[];
  excludedTerms: string[];
  /** Full parsed structure (filters, warnings). */
  parsed: GlobalSearchParsedQuery;
}

/**
 * Structured filters resolved for providers.
 * `types` on SearchContext remains the single effective type filter.
 */
export interface SearchStructuredFilters {
  /**
   * Resolved campaign member userIds matching `from:` names.
   * Null = no author filter. Empty array with authorsUnresolved=false
   * should not occur; unresolved names set authorsUnresolved.
   */
  authorUserIds: string[] | null;
  /**
   * True when at least one `from:` name matched zero campaign members.
   * Providers should return no hits (observationally equal to a miss).
   */
  authorsUnresolved: boolean;
  /** Inclusive lower bound (start of day UTC), or null. */
  after: Date | null;
  /** Exclusive upper bound (start of day UTC), or null. */
  before: Date | null;
  /** True when a before/after filter is active (session-note date semantics). */
  hasDateFilter: boolean;
}

export interface SearchContext {
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  actor: CampaignActor;
  isElevated: boolean;
  query: SearchQueryParts;
  limit: number;
  /**
   * Requested type filter keys, or null for "All".
   * Passed into providers early so they can skip irrelevant work.
   * Authorization still runs before any candidate contributes to results or counts.
   * Multi-type providers (wiki-pages) must still authorize all kinds for counts;
   * this filter is applied post-count at the service layer.
   */
  types: string[] | null;
  filters: SearchStructuredFilters;
}

export function tokenizeSearchText(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Parse a raw query into SearchQueryParts via the shared structured parser.
 */
export function buildSearchQueryParts(raw: string): SearchQueryParts {
  const parsed = parseGlobalSearchQuery(raw);
  const tokens = positiveSearchTokens(parsed);
  return {
    raw: parsed.raw,
    text: parsed.text,
    tokens,
    terms: parsed.terms,
    phrases: parsed.phrases,
    excludedTerms: parsed.excludedTerms,
    parsed,
  };
}

/** Convert a validated YYYY-MM-DD string to UTC midnight Date. */
export function isoDateOnlyToUtcDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

export function emptyStructuredFilters(): SearchStructuredFilters {
  return {
    authorUserIds: null,
    authorsUnresolved: false,
    after: null,
    before: null,
    hasDateFilter: false,
  };
}
