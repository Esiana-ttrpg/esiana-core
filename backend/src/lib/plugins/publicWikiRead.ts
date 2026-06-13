import { prisma } from '../prisma.js';
import {
  wikiPageToMarkdown,
  type WikiPageExportInput,
} from '../campaignExport/wikiPageToMarkdown.js';
import { WikiVisibility } from '../../types/domain.js';
import { buildWikiPageHref } from '../wikiLinkService.js';
import type { PublicPagePath } from '../../../../shared/publicPagePath.js';

const EMPTY_ASSET_LOOKUP = {
  resolveMediaFilename: () => null,
};

const EMPTY_PAGE_LOOKUP = {
  resolveTitle: () => null,
};

export const publicWikiPageSelect = {
  id: true,
  title: true,
  parentId: true,
  templateType: true,
  workspace: true,
  pathKey: true,
  visibility: true,
  blocks: true,
  metadata: true,
  updatedAt: true,
} as const;

export type PublicWikiPageRecord = {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  workspace: string | null;
  pathKey: string | null;
  visibility: string;
  blocks: unknown;
  metadata: unknown;
  updatedAt: Date;
};

/** Read-only campaign lookup for plugins with wiki:read-public (e.g. public feeds). */
export async function resolvePublicCampaignByHandle(campaignHandle: string) {
  return prisma.campaign.findUnique({
    where: { handle: campaignHandle },
    select: {
      id: true,
      handle: true,
      name: true,
      discoverability: true,
      updatedAt: true,
    },
  });
}

export async function listPublicWikiPages(
  campaignId: string,
): Promise<PublicWikiPageRecord[]> {
  return prisma.wikiPage.findMany({
    where: {
      campaignId,
      visibility: WikiVisibility.PUBLIC,
      templateType: { not: 'SESSION_NOTE' },
    },
    select: publicWikiPageSelect,
    orderBy: { title: 'asc' },
  });
}

export async function getPublicWikiPage(
  campaignId: string,
  pageId: string,
): Promise<PublicWikiPageRecord | null> {
  return prisma.wikiPage.findFirst({
    where: {
      id: pageId,
      campaignId,
      visibility: WikiVisibility.PUBLIC,
      templateType: { not: 'SESSION_NOTE' },
    },
    select: publicWikiPageSelect,
  });
}

/** Workspace-first browser path for a public wiki page (not `/wiki/:pageId`). */
export function resolvePublicPagePath(
  campaignHandle: string,
  page: Pick<
    PublicWikiPageRecord,
    'id' | 'title' | 'parentId' | 'templateType' | 'workspace' | 'pathKey' | 'metadata'
  >,
): PublicPagePath {
  return buildWikiPageHref(campaignHandle, page);
}

export function publicWikiPageToMarkdown(page: PublicWikiPageRecord): string {
  const exportInput: WikiPageExportInput = {
    id: page.id,
    title: page.title,
    parentId: page.parentId,
    templateType: page.templateType,
    visibility: page.visibility,
    blocks: page.blocks,
    metadata: page.metadata,
    tagNames: [],
  };

  return wikiPageToMarkdown(
    exportInput,
    `${page.id}.md`,
    page.parentId,
    EMPTY_ASSET_LOOKUP,
    EMPTY_PAGE_LOOKUP,
  ).markdown;
}
