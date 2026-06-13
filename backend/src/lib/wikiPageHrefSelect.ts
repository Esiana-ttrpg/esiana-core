import { prisma } from './prisma.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import type { PublicPagePath } from '../../../shared/publicPagePath.js';

/** Prisma select fields needed to resolve workspace-first public page paths. */
export const wikiPageHrefSelect = {
  id: true,
  title: true,
  parentId: true,
  templateType: true,
  workspace: true,
  pathKey: true,
  metadata: true,
} as const;

export type WikiPageHrefRow = {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  workspace?: string | null;
  pathKey?: string | null;
  metadata?: unknown;
};

export async function buildWikiPagePathMap(
  campaignId: string,
  campaignHandle: string,
  pageIds: readonly string[],
): Promise<Map<string, PublicPagePath>> {
  const unique = [...new Set(pageIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: unique } },
    select: wikiPageHrefSelect,
  });

  return new Map(
    pages.map((page) => [page.id, buildWikiPageHref(campaignHandle, page)]),
  );
}
