import { prisma } from './prisma.js';
import { normalizeAlias } from './normalizeAlias.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import {
  isElevatedWikiRole,
  wikiLinkPeerVisibilityFilter,
} from './wikiLinkService.js';
import {
  buildPageDiscoveryMap,
  buildPageDiscoveryProjectionMap,
  isPageAvailableFromProjection,
} from './discoveryProjectionService.js';
import { buildPageNarrativeStatusProjectionMap } from './pageNarrativeStatusService.js';
import { buildNarrativeViewerContextFromCampaign } from './narrativeProjectionContext.js';
import { normalizeCampaignMemberRole } from './acl.js';
import { ContentRevelationStates } from '../../../shared/contentPresence.js';
import type { DiscoveryStateProjection } from '../../../shared/discoveryProjection.js';
import type { PageNarrativeStatusProjection } from '../../../shared/pageNarrativeStatus.js';

export interface WikiLinkIndexEntry {
  pageId: string;
  title: string;
  label: string;
  normalizedLabel: string;
  breadcrumbLabel?: string;
  templateType?: string;
  /** Resolved codex kind for display (quests, characters, etc.). */
  codexType?: string;
  presenceState?: import('../../../shared/contentPresence.js').ContentRevelationState;
  discovery?: DiscoveryStateProjection;
  narrativeStatus?: PageNarrativeStatusProjection;
  inboundLinkCount?: number;
}

/** Visibility-filtered autocomplete / ambient dictionary for the current viewer. */
export async function getWikiLinkIndexForViewer(input: {
  campaignId: string;
  role: string | null;
}): Promise<WikiLinkIndexEntry[]> {
  const isElevated = isElevatedWikiRole(input.role);
  const peerFilter = wikiLinkPeerVisibilityFilter(isElevated);

  const pages = await prisma.wikiPage.findMany({
    where: {
      campaignId: input.campaignId,
      deletedAt: null,
      ...(peerFilter ?? {}),
    },
    select: {
      id: true,
      title: true,
      templateType: true,
      metadata: true,
      parentId: true,
      stats: { select: { inboundLinkCount: true } },
    },
    orderBy: { title: 'asc' },
  });

  const pageIds = pages.map((p) => p.id);
  const [presenceMap, discoveryProjectionMap, narrativeStatusMap] =
    await Promise.all([
      buildPageDiscoveryMap(input.campaignId, pageIds),
      buildPageDiscoveryProjectionMap(input.campaignId, pageIds, {
        role: input.role,
      }),
      buildPageNarrativeStatusProjectionMap({
        campaignId: input.campaignId,
        pageIds,
        ctx: await buildNarrativeViewerContextFromCampaign(
          input.campaignId,
          normalizeCampaignMemberRole(input.role),
        ),
        pages: pages.map((p) => ({
          id: p.id,
          templateType: p.templateType,
          metadata: p.metadata,
        })),
      }),
    ]);
  const visiblePages = isElevated
    ? pages
    : pages.filter((page) =>
        isPageAvailableFromProjection(
          discoveryProjectionMap.get(page.id),
          presenceMap,
          page.id,
          input.role,
        ),
      );

  const aliases =
    visiblePages.length > 0
      ? await prisma.wikiPageAlias.findMany({
          where: {
            campaignId: input.campaignId,
            pageId: { in: visiblePages.map((p) => p.id) },
          },
          select: { pageId: true, alias: true },
        })
      : [];

  const aliasesByPage = new Map<string, string[]>();
  for (const row of aliases) {
    const list = aliasesByPage.get(row.pageId) ?? [];
    list.push(row.alias);
    aliasesByPage.set(row.pageId, list);
  }

  const entries: WikiLinkIndexEntry[] = [];
  const seen = new Set<string>();

  for (const page of visiblePages) {
    const presenceState =
      presenceMap.get(page.id) ?? ContentRevelationStates.REVEALED;
    const labels = [page.title, ...(aliasesByPage.get(page.id) ?? [])];
    for (const label of labels) {
      const normalizedLabel = normalizeAlias(label);
      if (!normalizedLabel) continue;
      const key = `${page.id}:${normalizedLabel}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const codexType = resolveWikiCodexType({
        templateType: page.templateType,
        metadata: page.metadata,
      });
      entries.push({
        pageId: page.id,
        title: page.title,
        label,
        normalizedLabel,
        templateType: page.templateType,
        codexType,
        presenceState: isElevated ? presenceState : undefined,
        discovery: discoveryProjectionMap.get(page.id),
        narrativeStatus: narrativeStatusMap.get(page.id),
        inboundLinkCount: page.stats?.inboundLinkCount ?? 0,
      });
    }
  }

  return entries;
}
