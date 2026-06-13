import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { isReservedSystemWikiPage } from './wikiSystemPages.js';

export const WIKI_PARENT_CHAIN_DEPTH = 12;

export interface WikiParentChainNode {
  id: string;
  title: string;
  parent?: WikiParentChainNode | null;
}

/** Builds nested Prisma `parent` args for ancestor pages up to `depth` levels. */
export function wikiParentChainArgs(
  depth: number,
): Prisma.WikiPage$parentArgs | undefined {
  if (depth <= 0) return undefined;
  return {
    select: {
      id: true,
      title: true,
      ...(depth > 1
        ? { parent: wikiParentChainArgs(depth - 1) }
        : {}),
    },
  };
}

function serializeParentChain(
  node: WikiParentChainNode | null | undefined,
): WikiParentChainNode | null {
  if (!node) return null;
  const parent =
    node.parent && typeof node.parent === 'object' && 'id' in node.parent
      ? serializeParentChain(node.parent as WikiParentChainNode)
      : null;
  return {
    id: node.id,
    title: node.title,
    ...(parent ? { parent } : {}),
  };
}

export function formatWikiParentChainForApi(
  node: WikiParentChainNode | null | undefined,
): WikiParentChainNode | null {
  return serializeParentChain(node);
}

/**
 * Returns true when `proposedParentId` would create a cycle or is otherwise invalid.
 * `null` clears the parent and is always valid.
 */
export async function isInvalidWikiParent(
  campaignId: string,
  pageId: string,
  proposedParentId: string | null | undefined,
): Promise<boolean> {
  if (proposedParentId === undefined) return false;
  if (proposedParentId === null) return false;
  if (proposedParentId === pageId) return true;

  const parentPage = await prisma.wikiPage.findFirst({
    where: { id: proposedParentId, campaignId },
    select: { id: true, title: true, templateType: true, parentId: true },
  });
  if (!parentPage) return true;

  if (isReservedSystemWikiPage(parentPage)) return true;

  const parentById = new Map<string, string | null>();
  const rows = await prisma.wikiPage.findMany({
    where: { campaignId },
    select: { id: true, parentId: true },
  });
  for (const row of rows) {
    parentById.set(row.id, row.parentId);
  }

  let current: string | null = proposedParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === pageId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    current = parentById.get(current) ?? null;
  }

  return false;
}
