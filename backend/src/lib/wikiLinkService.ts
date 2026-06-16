import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';
import {
  extractAllWikiTargetsFromBlocks,
  extractWikiLinkTargetIdsFromBlocks,
  rewriteBlocksForPageRename,
} from './wikiLinkExtract.js';
import {
  buildPageDiscoveryMap,
  isPageVisibleToParty,
} from './discoveryProjectionService.js';
import {
  ContentRevelationStates,
  type ContentRevelationState,
} from '../../../shared/contentPresence.js';
import type { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import { resolveCanonicalPagePath } from '../../../shared/campaignWorkspaceRoutes.js';
import type { PublicPagePath } from '../../../shared/publicPagePath.js';

type Tx = Prisma.TransactionClient;

type PageGraphNode = {
  id: string;
  title: string;
  parentId: string | null;
  visibility?: string;
};

export function wikiLinkPeerVisibilityFilter(
  isElevated: boolean,
): Prisma.WikiPageWhereInput | undefined {
  if (isElevated) return undefined;
  return {
    visibility: {
      in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY],
    },
  };
}

export function isElevatedWikiRole(role: string | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

/** Ancestor titles for breadcrumbs; skips DM_ONLY ancestors for non-elevated viewers. */
export function buildVisibleBreadcrumbLabel(
  pageId: string,
  pageTitle: string,
  parentById: Map<string, PageGraphNode>,
  visibilityById: Map<string, string>,
  isElevated: boolean,
): string {
  const titles: string[] = [];
  const visited = new Set<string>();
  let current = parentById.get(pageId)?.parentId ?? null;

  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const node = parentById.get(current);
    if (!node) break;

    const visibility = visibilityById.get(current);
    if (
      !isElevated &&
      visibility === WikiVisibility.DM_ONLY
    ) {
      current = node.parentId;
      continue;
    }

    titles.push(node.title);
    current = node.parentId;
  }

  return [...titles, pageTitle].filter(Boolean).join(' › ');
}

async function loadCampaignPageGraph(campaignId: string): Promise<{
  parentById: Map<string, PageGraphNode>;
  visibilityById: Map<string, string>;
}> {
  const flatPages = await prisma.wikiPage.findMany({
    where: { campaignId },
    select: { id: true, title: true, parentId: true, visibility: true },
  });
  const parentById = new Map(
    flatPages.map((p) => [
      p.id,
      { id: p.id, title: p.title, parentId: p.parentId, visibility: p.visibility },
    ]),
  );
  const visibilityById = new Map(flatPages.map((p) => [p.id, p.visibility]));
  return { parentById, visibilityById };
}

export async function filterValidWikiTargetIds(
  campaignId: string,
  targetPageIds: string[],
): Promise<string[]> {
  if (targetPageIds.length === 0) return [];
  const existing = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: targetPageIds } },
    select: { id: true },
  });
  const valid = new Set(existing.map((row) => row.id));
  return targetPageIds.filter((id) => valid.has(id));
}

export async function syncWikiLinksForSourcePage(
  tx: Tx | typeof prisma,
  input: {
    campaignId: string;
    sourcePageId: string;
    blocks: Array<Record<string, unknown>>;
    actorUserId?: string | null;
    emitEvents?: boolean;
    suppressSocialNotifications?: boolean;
    narrativeSource?: string;
    narrativeAuthority?: import('./temporalProvenance.js').TemporalAuthority;
    eventAt?: Date;
    isInitialCreate?: boolean;
  },
): Promise<void> {
  const { syncWikiPageSubstrate } = await import('./wikiPageSubstrateService.js');
  await syncWikiPageSubstrate(tx, input);
}

export async function rebuildWikiLinksForCampaign(
  campaignId: string,
): Promise<number> {
  const { syncWikiPageSubstrate } = await import('./wikiPageSubstrateService.js');
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, blocks: true },
  });

  await prisma.wikiLink.deleteMany({ where: { campaignId } });

  let edgeCount = 0;
  for (const page of pages) {
    const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as Array<
      Record<string, unknown>
    >;
    await syncWikiPageSubstrate(prisma, {
      campaignId,
      sourcePageId: page.id,
      blocks,
      emitEvents: false,
      suppressSocialNotifications: true,
    });
    edgeCount += extractWikiLinkTargetIdsFromBlocks(blocks).length;
  }
  return edgeCount;
}

export interface WikiBacklinkRow {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  updatedAt: string;
  breadcrumbLabel: string;
  href: string;
  presenceState?: ContentRevelationState;
}

export type WikiPageHrefSource = {
  id: string;
  workspace?: string | null;
  pathKey?: string | null;
  templateType?: string;
  title?: string;
  parentId?: string | null;
  metadata?: unknown;
};

export function buildWikiPageHref(
  campaignHandle: string,
  source: string | WikiPageHrefSource,
  legacyTemplateType?: string,
): PublicPagePath {
  const page: WikiPageHrefSource =
    typeof source === 'string'
      ? { id: source, templateType: legacyTemplateType }
      : source;

  return resolveCanonicalPagePath(
    campaignHandle,
    {
      id: page.id,
      title: page.title ?? '',
      parentId: page.parentId ?? null,
      templateType: page.templateType ?? '',
      workspace: page.workspace as CampaignWorkspace | null | undefined,
      pathKey: page.pathKey,
      metadata: page.metadata,
    },
    [],
  );
}

export interface WikiOutlinkRow {
  id: string;
  title: string;
  type: string;
  parentId: string | null;
  visibility: string;
  updatedAt: string;
  breadcrumbLabel: string;
  href: string;
  presenceState?: ContentRevelationState;
}

export interface WikiBrokenOutlinkRow {
  targetPageId: string;
  label?: string;
}

export interface WikiOutlinksPayload {
  outlinks: WikiOutlinkRow[];
  brokenOutlinks: WikiBrokenOutlinkRow[];
  total: number;
}

export async function getWikiBacklinksForPage(input: {
  campaignId: string;
  campaignHandle: string;
  targetPageId: string;
  role: string | null;
}): Promise<WikiBacklinkRow[]> {
  const isElevated = isElevatedWikiRole(input.role);
  const peerVisibility = wikiLinkPeerVisibilityFilter(isElevated);

  const links = await prisma.wikiLink.findMany({
    where: {
      targetPageId: input.targetPageId,
      campaignId: input.campaignId,
      targetPage: { campaignId: input.campaignId },
      sourcePage: {
        campaignId: input.campaignId,
        ...(peerVisibility ?? {}),
      },
    },
    select: {
      sourcePage: {
        select: {
          id: true,
          title: true,
          parentId: true,
          visibility: true,
          updatedAt: true,
          workspace: true,
          pathKey: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const { parentById, visibilityById } = await loadCampaignPageGraph(
    input.campaignId,
  );

  const sourceIds = links.map((link) => link.sourcePage.id);
  const presenceMap = await buildPageDiscoveryMap(input.campaignId, sourceIds);

  return links
    .filter((link) =>
      isElevated
        ? true
        : isPageVisibleToParty(presenceMap, link.sourcePage.id),
    )
    .map((link) => {
    const source = link.sourcePage;
    const presenceState =
      presenceMap.get(source.id) ?? ContentRevelationStates.REVEALED;
    return {
      id: source.id,
      title: source.title,
      parentId: source.parentId,
      visibility: source.visibility,
      updatedAt: source.updatedAt.toISOString(),
      breadcrumbLabel: buildVisibleBreadcrumbLabel(
        source.id,
        source.title,
        parentById,
        visibilityById,
        isElevated,
      ),
      href: buildWikiPageHref(input.campaignHandle, source),
      presenceState: isElevated ? presenceState : undefined,
    };
  });
}

export async function getWikiOutlinksForPage(input: {
  campaignId: string;
  campaignHandle: string;
  sourcePageId: string;
  role: string | null;
  blocks?: Array<Record<string, unknown>>;
}): Promise<WikiOutlinksPayload> {
  const isElevated = isElevatedWikiRole(input.role);
  const peerVisibility = wikiLinkPeerVisibilityFilter(isElevated);

  const links = await prisma.wikiLink.findMany({
    where: {
      sourcePageId: input.sourcePageId,
      campaignId: input.campaignId,
      sourcePage: { campaignId: input.campaignId },
      targetPage: {
        campaignId: input.campaignId,
        ...(peerVisibility ?? {}),
      },
    },
    select: {
      targetPage: {
        select: {
          id: true,
          title: true,
          templateType: true,
          parentId: true,
          visibility: true,
          updatedAt: true,
          workspace: true,
          pathKey: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const { parentById, visibilityById } = await loadCampaignPageGraph(
    input.campaignId,
  );

  const targetIds = links.map((link) => link.targetPage.id);
  const presenceMap = await buildPageDiscoveryMap(input.campaignId, targetIds);

  const outlinks = links
    .filter((link) =>
      isElevated
        ? true
        : isPageVisibleToParty(presenceMap, link.targetPage.id),
    )
    .map((link) => {
    const target = link.targetPage;
    const presenceState =
      presenceMap.get(target.id) ?? ContentRevelationStates.REVEALED;
    return {
      id: target.id,
      title: target.title,
      type: target.templateType,
      parentId: target.parentId,
      visibility: target.visibility,
      updatedAt: target.updatedAt.toISOString(),
      breadcrumbLabel: buildVisibleBreadcrumbLabel(
        target.id,
        target.title,
        parentById,
        visibilityById,
        isElevated,
      ),
      href: buildWikiPageHref(input.campaignHandle, target),
      presenceState: isElevated ? presenceState : undefined,
    };
  });

  let brokenOutlinks: WikiBrokenOutlinkRow[] = [];
  if (input.blocks) {
    const integrity = await getBrokenLinksForPage({
      campaignId: input.campaignId,
      pageId: input.sourcePageId,
      blocks: input.blocks,
    });
    const resolvedIds = new Set(outlinks.map((row) => row.id));
    brokenOutlinks = integrity.broken.filter(
      (row) => !row.targetPageId || !resolvedIds.has(row.targetPageId),
    );
  }

  return {
    outlinks,
    brokenOutlinks,
    total: outlinks.length + brokenOutlinks.length,
  };
}

export async function getBrokenLinksForPage(input: {
  campaignId: string;
  pageId: string;
  blocks: Array<Record<string, unknown>>;
}): Promise<{
  broken: Array<{ targetPageId: string; label?: string }>;
  outboundCount: number;
}> {
  const extracted = extractAllWikiTargetsFromBlocks(input.blocks);
  const hrefIds = extracted
    .filter((t) => t.targetPageId && !t.isBrokenStub)
    .map((t) => t.targetPageId);
  const stubBroken = extracted
    .filter((t) => t.isBrokenStub || !t.targetPageId)
    .map((t) => ({
      targetPageId: t.targetPageId || '',
      label: t.label,
    }));

  const validIds = new Set(
    await filterValidWikiTargetIds(
      input.campaignId,
      Array.from(new Set(hrefIds)),
    ),
  );

  const brokenFromHrefs: Array<{ targetPageId: string; label?: string }> = hrefIds
    .filter((id) => id && !validIds.has(id))
    .map((targetPageId) => ({ targetPageId }));

  const broken: Array<{ targetPageId: string; label?: string }> = [
    ...stubBroken,
    ...brokenFromHrefs,
  ];
  const uniqueBroken = new Map<string, { targetPageId: string; label?: string }>();
  for (const item of broken) {
    const key = item.targetPageId || `label:${item.label ?? ''}`;
    if (!uniqueBroken.has(key)) uniqueBroken.set(key, item);
  }

  return {
    broken: Array.from(uniqueBroken.values()),
    outboundCount: extracted.filter((t) => t.targetPageId && !t.isBrokenStub)
      .length,
  };
}

export interface AggregatedReferencesPayload {
  backlinks: WikiBacklinkRow[];
  outlinks: WikiOutlinkRow[];
  brokenOutlinks: WikiBrokenOutlinkRow[];
}

/** Merge backlinks/outlinks across multiple session author pages (deduped). */
export async function getAggregatedReferencesForPages(input: {
  campaignId: string;
  campaignHandle: string;
  sourcePageIds: string[];
  role: string | null;
  blocksByPageId: Map<string, Array<Record<string, unknown>>>;
}): Promise<AggregatedReferencesPayload> {
  const pageIds = input.sourcePageIds.filter(Boolean);
  if (pageIds.length === 0) {
    return { backlinks: [], outlinks: [], brokenOutlinks: [] };
  }

  const isElevated = isElevatedWikiRole(input.role);
  const peerVisibility = wikiLinkPeerVisibilityFilter(isElevated);
  const { parentById, visibilityById } = await loadCampaignPageGraph(
    input.campaignId,
  );

  const backlinkLinks = await prisma.wikiLink.findMany({
    where: {
      campaignId: input.campaignId,
      targetPageId: { in: pageIds },
      sourcePage: {
        campaignId: input.campaignId,
        ...(peerVisibility ?? {}),
      },
    },
    select: {
      sourcePage: {
        select: {
          id: true,
          title: true,
          parentId: true,
          visibility: true,
          updatedAt: true,
          workspace: true,
          pathKey: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const backlinkById = new Map<string, WikiBacklinkRow>();
  for (const link of backlinkLinks) {
    const source = link.sourcePage;
    if (backlinkById.has(source.id)) continue;
    backlinkById.set(source.id, {
      id: source.id,
      title: source.title,
      parentId: source.parentId,
      visibility: source.visibility,
      updatedAt: source.updatedAt.toISOString(),
      breadcrumbLabel: buildVisibleBreadcrumbLabel(
        source.id,
        source.title,
        parentById,
        visibilityById,
        isElevated,
      ),
      href: buildWikiPageHref(input.campaignHandle, source),
    });
  }

  const outlinkLinks = await prisma.wikiLink.findMany({
    where: {
      campaignId: input.campaignId,
      sourcePageId: { in: pageIds },
      targetPage: {
        campaignId: input.campaignId,
        ...(peerVisibility ?? {}),
      },
    },
    select: {
      targetPage: {
        select: {
          id: true,
          title: true,
          templateType: true,
          parentId: true,
          visibility: true,
          updatedAt: true,
          workspace: true,
          pathKey: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const outlinkById = new Map<string, WikiOutlinkRow>();
  for (const link of outlinkLinks) {
    const target = link.targetPage;
    if (outlinkById.has(target.id)) continue;
    outlinkById.set(target.id, {
      id: target.id,
      title: target.title,
      type: target.templateType,
      parentId: target.parentId,
      visibility: target.visibility,
      updatedAt: target.updatedAt.toISOString(),
      breadcrumbLabel: buildVisibleBreadcrumbLabel(
        target.id,
        target.title,
        parentById,
        visibilityById,
        isElevated,
      ),
      href: buildWikiPageHref(input.campaignHandle, target),
    });
  }

  const brokenByKey = new Map<string, WikiBrokenOutlinkRow>();
  const resolvedOutlinkIds = new Set(outlinkById.keys());

  for (const sourcePageId of pageIds) {
    const blocks = input.blocksByPageId.get(sourcePageId) ?? [];
    const integrity = await getBrokenLinksForPage({
      campaignId: input.campaignId,
      pageId: sourcePageId,
      blocks,
    });
    for (const row of integrity.broken) {
      if (row.targetPageId && resolvedOutlinkIds.has(row.targetPageId)) continue;
      const key = row.targetPageId || `label:${row.label ?? ''}`;
      if (!brokenByKey.has(key)) {
        brokenByKey.set(key, {
          targetPageId: row.targetPageId,
          label: row.label,
        });
      }
    }
  }

  const backlinks = Array.from(backlinkById.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  const outlinks = Array.from(outlinkById.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  const brokenOutlinks = Array.from(brokenByKey.values());

  return { backlinks, outlinks, brokenOutlinks };
}

export async function propagatePageTitleRename(input: {
  campaignId: string;
  pageId: string;
  oldTitle: string;
  newTitle: string;
}): Promise<number> {
  if (input.oldTitle === input.newTitle) return 0;

  const incoming = await prisma.wikiLink.findMany({
    where: {
      campaignId: input.campaignId,
      targetPageId: input.pageId,
    },
    select: { sourcePageId: true },
  });

  const sourceIds = Array.from(
    new Set(incoming.map((l) => l.sourcePageId)),
  );
  if (sourceIds.length === 0) return 0;

  let updatedCount = 0;
  for (const sourcePageId of sourceIds) {
    const source = await prisma.wikiPage.findFirst({
      where: { id: sourcePageId, campaignId: input.campaignId },
      select: { id: true, blocks: true },
    });
    if (!source) continue;

    const blocks = (Array.isArray(source.blocks) ? source.blocks : []) as Array<
      Record<string, unknown>
    >;
    const nextBlocks = rewriteBlocksForPageRename(
      blocks,
      input.pageId,
      input.oldTitle,
      input.newTitle,
    );
    if (nextBlocks === blocks) continue;

    await prisma.$transaction(async (tx) => {
      await tx.wikiPage.update({
        where: { id: sourcePageId },
        data: { blocks: nextBlocks as any },
      });
      await syncWikiLinksForSourcePage(tx, {
        campaignId: input.campaignId,
        sourcePageId,
        blocks: nextBlocks,
      });
    });
    updatedCount += 1;
  }

  return updatedCount;
}
