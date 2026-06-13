import { apiFetch } from './api';
import type {
  GlobalContinuityPayload,
  PageContinuityPayload,
} from '@shared/continuityIssue';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';

export interface WikiLinkIndexEntry {
  pageId: string;
  title: string;
  label: string;
  normalizedLabel: string;
  breadcrumbLabel?: string;
  templateType?: string;
  codexType?: string;
  presenceState?: string;
  discovery?: DiscoveryStateProjection;
  narrativeStatus?: PageNarrativeStatusProjection;
  inboundLinkCount?: number;
}

export interface WikiPagePreview {
  id: string;
  title: string;
  templateType: string;
  codexType?: string;
  visibility: string;
  updatedAt: string;
  aliases: string[];
  summary: string | null;
  inboundLinkCount: number;
  wordCount: number;
}

export interface UnresolvedWikilinkRow {
  id: string;
  sourcePageId: string;
  sourcePageTitle: string;
  rawText: string;
  normalizedText: string;
  occurrenceCount: number;
  status: string;
  lastSeenAt: string;
}

export interface MentionTarget {
  mentionType: 'USER' | 'CHARACTER';
  label: string;
  targetUserId?: string;
  identityPageId?: string;
}

export async function fetchMentionTargets(
  campaignHandle: string,
): Promise<MentionTarget[]> {
  const data = await apiFetch<{ targets: MentionTarget[] }>(
    `/campaigns/${campaignHandle}/wiki/mention-targets`,
  );
  return data.targets ?? [];
}

export async function createWikiPageAlias(
  campaignHandle: string,
  pageId: string,
  alias: string,
): Promise<{ id: string; alias: string }> {
  const data = await apiFetch<{ alias: { id: string; alias: string } }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/aliases`,
    {
      method: 'POST',
      body: JSON.stringify({ alias }),
    },
  );
  return data.alias;
}

export async function deleteWikiPageAlias(
  campaignHandle: string,
  aliasId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/aliases/${aliasId}`, {
    method: 'DELETE',
  });
}

export async function listWikiPageAliases(
  campaignHandle: string,
  pageId: string,
): Promise<Array<{ id: string; alias: string }>> {
  const data = await apiFetch<{ aliases: Array<{ id: string; alias: string }> }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/aliases`,
  );
  return data.aliases ?? [];
}

export async function fetchWikiLinkIndex(
  campaignHandle: string,
): Promise<WikiLinkIndexEntry[]> {
  const data = await apiFetch<{ entries: WikiLinkIndexEntry[] }>(
    `/campaigns/${campaignHandle}/wiki/link-index`,
  );
  return data.entries ?? [];
}

export async function fetchWikiPagePreview(
  campaignHandle: string,
  pageId: string,
): Promise<WikiPagePreview> {
  const data = await apiFetch<{ preview: WikiPagePreview }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/preview`,
  );
  return data.preview;
}

export async function fetchMentionSnippet(
  campaignHandle: string,
  sourcePageId: string,
  targetPageId: string,
): Promise<string | null> {
  const params = new URLSearchParams({ targetPageId });
  const data = await apiFetch<{ snippet: string | null }>(
    `/campaigns/${campaignHandle}/wiki/${sourcePageId}/mention-snippet?${params}`,
  );
  return data.snippet ?? null;
}

export async function fetchUnresolvedWikilinks(
  campaignHandle: string,
  options?: { sourcePageId?: string; scope?: 'campaign' },
): Promise<UnresolvedWikilinkRow[]> {
  const params = new URLSearchParams();
  if (options?.sourcePageId) {
    params.set('sourcePageId', options.sourcePageId);
  }
  if (options?.scope === 'campaign') {
    params.set('scope', 'campaign');
  }
  const qs = params.toString();
  const data = await apiFetch<{ unresolved: UnresolvedWikilinkRow[] }>(
    `/campaigns/${campaignHandle}/wiki/unresolved-wikilinks${qs ? `?${qs}` : ''}`,
  );
  return data.unresolved ?? [];
}

export async function ignoreUnresolvedWikilink(
  campaignHandle: string,
  id: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/unresolved-wikilinks/${id}/ignore`, {
    method: 'POST',
  });
}

export async function mergeUnresolvedWikilinks(
  campaignHandle: string,
  normalizedTexts: string[],
  targetPageId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/unresolved-wikilinks/merge`, {
    method: 'POST',
    body: JSON.stringify({ normalizedTexts, targetPageId }),
  });
}

export async function fetchPageContinuity(
  campaignHandle: string,
  pageId: string,
): Promise<PageContinuityPayload> {
  return apiFetch<PageContinuityPayload>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/continuity`,
  );
}

export async function fetchGlobalContinuity(
  campaignHandle: string,
): Promise<GlobalContinuityPayload> {
  return apiFetch<GlobalContinuityPayload>(
    `/campaigns/${campaignHandle}/wiki/continuity-summary`,
  );
}

export async function fetchWorldActivity(
  campaignHandle: string,
  days = 30,
): Promise<{
  periodDays: number;
  pagesEdited: number;
  linksCreated: number;
  stubsResolved: number;
  message: string;
}> {
  return apiFetch(
    `/campaigns/${campaignHandle}/wiki/world-activity?days=${days}`,
  );
}

export async function fetchWritingPulse(
  campaignHandle: string,
  days = 30,
): Promise<{
  periodDays: number;
  pagesEdited: number;
  totalWordsInTouchedPages: number;
  recentlyTouched: Array<{
    pageId: string;
    title: string;
    wordCount: number;
    lastEditedAt: string;
  }>;
}> {
  return apiFetch(
    `/campaigns/${campaignHandle}/wiki/writing-pulse?days=${days}`,
  );
}
