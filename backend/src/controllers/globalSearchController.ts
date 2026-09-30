import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  GLOBAL_SEARCH_DEFAULT_LIMIT,
  GLOBAL_SEARCH_MAX_LIMIT,
  GLOBAL_SEARCH_MAX_QUERY_LENGTH,
} from '../../../shared/globalSearch.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';
import {
  buildSearchQueryParts,
  emptyStructuredFilters,
  isoDateOnlyToUtcDate,
} from '../lib/search/searchContext.js';
import { resolveSearchAuthors } from '../lib/search/searchAuthorResolver.js';
import { searchCampaign } from '../lib/search/searchService.js';
import { hasTypeOperators } from '../../../shared/globalSearchQuery.js';

function parseTypeFilter(raw: unknown): string[] | null {
  if (raw == null || raw === '') return null;
  const values = Array.isArray(raw)
    ? raw.map(String)
    : String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (values.length === 0) return null;
  return [...new Set(values)];
}

export async function searchCampaignContent(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const rawQuery = String(req.query.q ?? req.query.query ?? '');
  if (rawQuery.length > GLOBAL_SEARCH_MAX_QUERY_LENGTH) {
    res.status(400).json({
      error: `Query must be at most ${GLOBAL_SEARCH_MAX_QUERY_LENGTH} characters`,
    });
    return;
  }

  const limitRaw = Number.parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), GLOBAL_SEARCH_MAX_LIMIT)
    : GLOBAL_SEARCH_DEFAULT_LIMIT;

  const query = buildSearchQueryParts(rawQuery);
  const urlTypes = parseTypeFilter(req.query.type ?? req.query.types);

  // Structured type:/in: operators win over the URL type param so the client
  // and query text stay a single filtering system.
  const types = hasTypeOperators(query.parsed)
    ? (query.parsed.filters.types ?? null)
    : urlTypes;

  const filters = emptyStructuredFilters();
  const authors = query.parsed.filters.authors;
  if (authors && authors.length > 0) {
    const resolved = await resolveSearchAuthors(ctx.campaignId, authors);
    filters.authorsUnresolved = resolved.unresolved;
    filters.authorUserIds = resolved.unresolved ? [] : resolved.userIds;
  }
  if (query.parsed.filters.after) {
    filters.after = isoDateOnlyToUtcDate(query.parsed.filters.after);
  }
  if (query.parsed.filters.before) {
    filters.before = isoDateOnlyToUtcDate(query.parsed.filters.before);
  }
  filters.hasDateFilter = filters.after != null || filters.before != null;

  const explainRaw = String(req.query.explain ?? '').toLowerCase();
  const explainRequested = explainRaw === '1' || explainRaw === 'true';
  // Diagnostics are elevated-only — party viewers never receive rank/diagnostics.
  const explain = explainRequested && isElevatedWikiRole(ctx.role);

  const result = await searchCampaign({
    campaignId: ctx.campaignId,
    campaignHandle: ctx.campaignHandle ?? '',
    role: ctx.role,
    actor: ctx.actor,
    isElevated: isElevatedWikiRole(ctx.role),
    query,
    limit,
    types,
    filters,
    explain,
  });

  res.json(result);
}
