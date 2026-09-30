import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  GLOBAL_SEARCH_DEFAULT_LIMIT,
  GLOBAL_SEARCH_MAX_LIMIT,
  GLOBAL_SEARCH_MAX_QUERY_LENGTH,
} from '../../../shared/globalSearch.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';
import { buildSearchQueryParts } from '../lib/search/searchContext.js';
import { searchCampaign } from '../lib/search/searchService.js';

function parseTypeFilter(raw: unknown): string[] | null {
  if (raw == null || raw === '') return null;
  const values = Array.isArray(raw)
    ? raw.map(String)
    : String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (values.length === 0) return null;
  // Deduplicate while preserving order.
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

  const types = parseTypeFilter(req.query.type ?? req.query.types);

  const result = await searchCampaign({
    campaignId: ctx.campaignId,
    campaignHandle: ctx.campaignHandle ?? '',
    role: ctx.role,
    actor: ctx.actor,
    isElevated: isElevatedWikiRole(ctx.role),
    query: buildSearchQueryParts(rawQuery),
    limit,
    types,
  });

  res.json(result);
}
