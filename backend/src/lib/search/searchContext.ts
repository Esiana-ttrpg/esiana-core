import type { CampaignActor } from '../../../../shared/campaignPolicy/policy.js';
import type { CampaignMemberRole } from '../../types/domain.js';

export interface SearchQueryParts {
  /** Original request string (trimmed). Reserved for future operator parsing. */
  raw: string;
  /** Free-text portion used for matching (today: same as raw, lowercased). */
  text: string;
  /** Whitespace-split tokens of `text` (length ≥ 1 when text is non-empty). */
  tokens: string[];
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
   */
  types: string[] | null;
}

export function tokenizeSearchText(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function buildSearchQueryParts(raw: string): SearchQueryParts {
  const trimmed = raw.trim();
  const text = trimmed.toLowerCase();
  return {
    raw: trimmed,
    text,
    tokens: tokenizeSearchText(text),
  };
}
