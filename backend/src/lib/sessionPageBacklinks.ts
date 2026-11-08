import { prisma } from './prisma.js';
import { projectAdventurePages, projectedWikiTargetIds } from './adventurePageProjection.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import {
  buildVisibleBreadcrumbLabel,
  buildWikiPageHref,
  isElevatedWikiRole,
  wikiLinkPeerVisibilityFilter,
} from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import {
  parseSystemCategoryKey,
} from './wikiSystemCategory.js';

export type SessionPageBacklinkRow = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  updatedAt: string;
  templateType: string;
  timelinePointId: string | null;
  breadcrumbLabel?: string;
  href?: string;
};

type SourcePageRow = {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  updatedAt: Date;
  templateType: string;
  metadata: unknown;
};

const SESSION_LOG_CATEGORY_KEYS = new Set(['timelines', 'journals']);
const SESSION_LOG_LEGACY_TITLES = new Set(['Timelines', 'Journals']);

export function isSessionLogSourcePage(
  page: Pick<SourcePageRow, 'templateType' | 'metadata' | 'parentId' | 'id'>,
  parentById: Map<string, { id: string; title: string; parentId: string | null; metadata: unknown }>,
): boolean {
  if (page.templateType === 'SESSION_NOTE') return true;
  const sessionMeta = parseSessionNoteMetadata(page.metadata);
  if (sessionMeta.timelinePointId || sessionMeta.sessionGroupId) return true;

  const visited = new Set<string>();
  let current: string | null = page.parentId;
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const ancestor = parentById.get(current);
    if (!ancestor) break;
    const key = parseSystemCategoryKey(ancestor.metadata);
    if (key && SESSION_LOG_CATEGORY_KEYS.has(key)) return true;
    if (SESSION_LOG_LEGACY_TITLES.has(ancestor.title)) return true;
    current = ancestor.parentId;
  }
  return false;
}

function resolveSessionHref(
  campaignHandle: string,
  source: SourcePageRow,
): string {
  const meta = parseSessionNoteMetadata(source.metadata);
  const timelinePointId = meta.timelinePointId ?? meta.sessionGroupId;
  if (timelinePointId) {
    return `/campaigns/${campaignHandle}/notes/${timelinePointId}`;
  }
  return buildWikiPageHref(campaignHandle, source);
}

function resolveTimelinePointId(source: SourcePageRow): string | null {
  const meta = parseSessionNoteMetadata(source.metadata);
  return meta.timelinePointId ?? meta.sessionGroupId ?? null;
}

export async function batchSessionBacklinksForPages(input: {
  campaignId: string;
  campaignHandle: string;
  targetPageIds: string[];
  role: string | null;
  /** Additional request-scoped restriction, applied before grouping and limits. */
  canViewPage?: (visibility: string) => boolean;
  limitPerTarget?: number;
}): Promise<Map<string, SessionPageBacklinkRow[]>> {
  const limit = input.limitPerTarget ?? 10;
  const result = new Map<string, SessionPageBacklinkRow[]>();
  for (const id of input.targetPageIds) {
    result.set(id, []);
  }
  if (input.targetPageIds.length === 0) return result;

  if (input.canViewPage) {
    const originalPages = await prisma.wikiPage.findMany({ where: { campaignId: input.campaignId, deletedAt: null } });
    const pages = await projectAdventurePages(input.campaignId, originalPages, input.canViewPage);
    const originalById = new Map(originalPages.map(page => [page.id, page]));
    const byId = new Map(pages.map(page => [page.id, page]));
    const sourceParents = new Map(pages.map(page => [page.id,
      { ...page, metadata: originalById.get(page.id)?.metadata ?? page.metadata }]));
    for (const source of pages.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())) {
      if (!isSessionLogSourcePage({ ...source, metadata: originalById.get(source.id)?.metadata ?? source.metadata }, sourceParents)) continue;
      const targets = projectedWikiTargetIds(source.blocks);
      for (const target of targets) {
        const bucket = result.get(target);
        if (!byId.has(target) || !bucket || bucket.length >= limit) continue;
        bucket.push({ id: source.id, title: source.title, parentId: source.parentId,
          visibility: source.visibility, updatedAt: source.updatedAt.toISOString(),
          templateType: source.templateType, timelinePointId: null,
          href: buildWikiPageHref(input.campaignHandle, source) });
      }
    }
    return result;
  }

  const isElevated = isElevatedWikiRole(input.role);
  const peerVisibility = wikiLinkPeerVisibilityFilter(isElevated);

  const allPages = await prisma.wikiPage.findMany({
    where: { campaignId: input.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      metadata: true,
    },
  });
  const parentById = new Map(
    allPages.map((p) => [
      p.id,
      { id: p.id, title: p.title, parentId: p.parentId, metadata: p.metadata },
    ]),
  );
  const visibilityById = new Map(
    (
      await prisma.wikiPage.findMany({
        where: { campaignId: input.campaignId },
        select: { id: true, visibility: true },
      })
    ).map((p) => [p.id, p.visibility]),
  );

  const links = await prisma.wikiLink.findMany({
    where: {
      campaignId: input.campaignId,
      targetPageId: { in: input.targetPageIds },
      sourcePage: {
        campaignId: input.campaignId,
        ...(peerVisibility ?? {}),
      },
    },
    select: {
      targetPageId: true,
      sourcePage: {
        select: {
          ...wikiPageHrefSelect,
          visibility: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const grouped = new Map<string, SourcePageRow[]>();

  for (const link of links) {
    const source = link.sourcePage;
    if (!isSessionLogSourcePage(source, parentById)) continue;

    const bucket = grouped.get(link.targetPageId) ?? [];
    if (bucket.some((row) => row.id === source.id)) continue;
    bucket.push(source);
    grouped.set(link.targetPageId, bucket);
  }

  for (const [targetId, sources] of grouped) {
    const sorted = [...sources].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    const slice = sorted.slice(0, limit);
    result.set(
      targetId,
      slice.map((source) => ({
        id: source.id,
        title: source.title,
        parentId: source.parentId,
        visibility: source.visibility,
        updatedAt: source.updatedAt.toISOString(),
        templateType: source.templateType,
        timelinePointId: resolveTimelinePointId(source),
        breadcrumbLabel: buildVisibleBreadcrumbLabel(
          source.id,
          source.title,
          parentById as Map<string, { id: string; title: string; parentId: string | null }>,
          visibilityById,
          isElevated,
        ),
        href: resolveSessionHref(input.campaignHandle, source),
      })),
    );
  }

  return result;
}
