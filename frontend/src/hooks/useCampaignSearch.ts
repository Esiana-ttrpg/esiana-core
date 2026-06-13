import { useMemo } from 'react';
import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';
import {
  parseStatusSearchToken,
  stripStatusSearchToken,
} from '@shared/pageNarrativeStatus';

const DEFAULT_RESULT_LIMIT = 20;

function buildSearchHaystack(entry: WikiLinkIndexEntry): string {
  return [
    entry.title,
    entry.label,
    entry.normalizedLabel,
    entry.breadcrumbLabel,
    entry.narrativeStatus?.label,
    entry.narrativeStatus?.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterCampaignSearchEntries(
  entries: WikiLinkIndexEntry[],
  query: string,
  limit = DEFAULT_RESULT_LIMIT,
): WikiLinkIndexEntry[] {
  const statusToken = parseStatusSearchToken(query);
  const textQuery = stripStatusSearchToken(query).trim().toLowerCase();
  if (!statusToken && !textQuery) return [];

  return entries
    .filter((entry) => {
      if (statusToken && entry.narrativeStatus?.status !== statusToken) {
        return false;
      }
      if (!textQuery) return true;
      return buildSearchHaystack(entry).includes(textQuery);
    })
    .slice(0, limit);
}

export function useCampaignSearch(
  entries: WikiLinkIndexEntry[],
  query: string,
  limit = DEFAULT_RESULT_LIMIT,
) {
  return useMemo(
    () => filterCampaignSearchEntries(entries, query, limit),
    [entries, query, limit],
  );
}

export function formatCampaignSearchResultHint(
  entry: WikiLinkIndexEntry,
): string {
  const typeHint = entry.codexType ?? entry.templateType;
  const statusHint = entry.narrativeStatus?.label;
  if (entry.breadcrumbLabel && typeHint) {
    return statusHint
      ? `${entry.breadcrumbLabel} · ${typeHint} · ${statusHint}`
      : `${entry.breadcrumbLabel} · ${typeHint}`;
  }
  if (statusHint) return statusHint;
  return entry.breadcrumbLabel ?? typeHint ?? '';
}
