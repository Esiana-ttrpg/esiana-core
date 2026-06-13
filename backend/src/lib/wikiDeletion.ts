import { prisma } from './prisma.js';
import {
  resolvePinsAfterTargetPageDelete,
  resolvePinsAfterTargetPageDeletes,
} from './mapPinMaintenance.js';
import { readEntityCategoryFromMetadata } from './wikiCategoryEntityIndex.js';
import {
  isReservedSystemWikiPage,
  isStructuralDividerTitle,
} from './wikiSystemPages.js';

export type WikiDeleteMode = 'orphan' | 'recursive';

export type OrphanRuleApplied =
  | 'geographical'
  | 'contained'
  | 'structural'
  | 'fallback';

export interface WikiPageGraphNode {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  metadata: unknown;
}

export interface ChildReparentPlanEntry {
  childId: string;
  childTitle: string;
  proposedParentId: string | null;
  proposedParentTitle: string | null;
  ruleApplied: OrphanRuleApplied;
  rationale: string;
}

export interface WikiDeletePreview {
  page: WikiPageGraphNode;
  directChildCount: number;
  descendantCount: number;
  descendantTitlesSample: string[];
  hasReservedInSubtree: boolean;
  reservedPageIds: string[];
  childReparentPlan: ChildReparentPlanEntry[];
}

const TAXONOMIC_FOLDER_TITLES = ['Characters', 'Locations', 'Objects'] as const;
const STRUCTURAL_ROOT_TITLES = ['Quests', 'Organizations', 'Journals'] as const;

export type TaxonomicFolderTitle = 'Characters' | 'Objects';

export function buildWikiPageGraph(
  pages: WikiPageGraphNode[],
): Map<string, WikiPageGraphNode> {
  return new Map(pages.map((page) => [page.id, page]));
}

export function collectDescendantIdsFromGraph(
  graph: Map<string, WikiPageGraphNode>,
  rootId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const page of graph.values()) {
    if (!page.parentId) continue;
    const siblings = childrenByParent.get(page.parentId) ?? [];
    siblings.push(page.id);
    childrenByParent.set(page.parentId, siblings);
  }

  const descendants: string[] = [];
  const queue = [...(childrenByParent.get(rootId) ?? [])];
  while (queue.length > 0) {
    const current = queue.pop()!;
    descendants.push(current);
    for (const childId of childrenByParent.get(current) ?? []) {
      queue.push(childId);
    }
  }
  return descendants;
}

export function collectDirectChildIdsFromGraph(
  graph: Map<string, WikiPageGraphNode>,
  parentId: string,
): string[] {
  return [...graph.values()]
    .filter((page) => page.parentId === parentId)
    .map((page) => page.id);
}

export function isLocationPage(page: WikiPageGraphNode): boolean {
  if (page.templateType === 'LOCATION') return true;
  return readEntityCategoryFromMetadata(page.metadata) === 'Locations';
}

export function isCharacterPage(page: WikiPageGraphNode): boolean {
  if (page.templateType === 'CHARACTER') return true;
  return readEntityCategoryFromMetadata(page.metadata) === 'Characters';
}

export function isItemPage(
  page: WikiPageGraphNode,
  graph: Map<string, WikiPageGraphNode>,
): boolean {
  if (readEntityCategoryFromMetadata(page.metadata) === 'Objects') return true;
  return getAncestorTitles(page.id, graph).includes('Objects');
}

function getAncestorTitles(
  pageId: string,
  graph: Map<string, WikiPageGraphNode>,
): string[] {
  const titles: string[] = [];
  let current = graph.get(pageId)?.parentId ?? null;
  while (current) {
    const node = graph.get(current);
    if (!node) break;
    titles.push(node.title);
    current = node.parentId;
  }
  return titles;
}

function isUnderTaxonomicTree(
  pageId: string,
  graph: Map<string, WikiPageGraphNode>,
): boolean {
  return getAncestorTitles(pageId, graph).some((title) =>
    (TAXONOMIC_FOLDER_TITLES as readonly string[]).includes(title),
  );
}

function isUnderStructuralTree(
  pageId: string,
  graph: Map<string, WikiPageGraphNode>,
): boolean {
  return getAncestorTitles(pageId, graph).some((title) =>
    (STRUCTURAL_ROOT_TITLES as readonly string[]).includes(title),
  );
}

export function isStructuralHierarchyPage(
  page: WikiPageGraphNode,
  graph: Map<string, WikiPageGraphNode>,
): boolean {
  if (isLocationPage(page) || isCharacterPage(page) || isItemPage(page, graph)) {
    return false;
  }
  if (isUnderTaxonomicTree(page.id, graph)) return false;
  return isUnderStructuralTree(page.id, graph);
}

export function parentIsLocation(
  parentId: string | null,
  graph: Map<string, WikiPageGraphNode>,
): boolean {
  if (!parentId) return false;
  const parent = graph.get(parentId);
  if (!parent) return false;
  return isLocationPage(parent);
}

export function findTaxonomicFolderInGraph(
  graph: Map<string, WikiPageGraphNode>,
  folderTitle: TaxonomicFolderTitle,
): WikiPageGraphNode | null {
  const worldNode = [...graph.values()].find(
    (page) => page.title === 'World' && page.parentId === null,
  );
  if (worldNode) {
    const underWorld = [...graph.values()].find(
      (page) =>
        page.parentId === worldNode.id && page.title === folderTitle,
    );
    if (underWorld) return underWorld;
  }
  return [...graph.values()].find((page) => page.title === folderTitle) ?? null;
}

function titleForId(
  graph: Map<string, WikiPageGraphNode>,
  pageId: string | null,
): string | null {
  if (!pageId) return null;
  return graph.get(pageId)?.title ?? null;
}

function isInvalidReparentTarget(page: WikiPageGraphNode | undefined): boolean {
  if (!page) return true;
  if (isStructuralDividerTitle(page.title)) return true;
  if (isReservedSystemWikiPage(page)) return true;
  return false;
}

/** Never attach orphans under World/Game dividers or reserved system pages. */
export function sanitizeProposedParentId(
  proposedParentId: string | null,
  graph: Map<string, WikiPageGraphNode>,
): string | null {
  let current = proposedParentId;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current)) return null;
    visited.add(current);
    const node = graph.get(current);
    if (!node || isInvalidReparentTarget(node)) {
      current = node?.parentId ?? null;
      continue;
    }
    return current;
  }
  return null;
}

export function resolveOrphanParentId(
  deletedPage: WikiPageGraphNode,
  childPage: WikiPageGraphNode,
  graph: Map<string, WikiPageGraphNode>,
): { parentId: string | null; ruleApplied: OrphanRuleApplied; rationale: string } {
  // Rule 1 — Geographical entities
  if (isLocationPage(childPage)) {
    const parentId = sanitizeProposedParentId(deletedPage.parentId, graph);
    const parentTitle = titleForId(graph, parentId);
    return {
      parentId,
      ruleApplied: 'geographical',
      rationale: parentTitle
        ? `Location tier-up to ${parentTitle}`
        : 'Location tier-up to campaign root',
    };
  }

  // Rule 2 — Physically contained entities (deleted parent is a location)
  if (isLocationPage(deletedPage) && (isCharacterPage(childPage) || isItemPage(childPage, graph))) {
    if (deletedPage.parentId && parentIsLocation(deletedPage.parentId, graph)) {
      const parentId = sanitizeProposedParentId(deletedPage.parentId, graph);
      const parentTitle = titleForId(graph, parentId);
      return {
        parentId,
        ruleApplied: 'contained',
        rationale: parentTitle
          ? `Contained entity moved to ${parentTitle}`
          : 'Contained entity tier-up',
      };
    }

    const folderTitle: TaxonomicFolderTitle = isCharacterPage(childPage)
      ? 'Characters'
      : 'Objects';
    const folder = findTaxonomicFolderInGraph(graph, folderTitle);
    return {
      parentId: folder?.id ?? null,
      ruleApplied: 'contained',
      rationale: folder
        ? `${folderTitle} taxonomic folder (top-level region deleted)`
        : `${folderTitle} folder not found; campaign root`,
    };
  }

  // Rule 3 — Structural hierarchies
  if (isStructuralHierarchyPage(childPage, graph)) {
    const parentId = sanitizeProposedParentId(deletedPage.parentId, graph);
    const parentTitle = titleForId(graph, parentId);
    return {
      parentId,
      ruleApplied: 'structural',
      rationale: parentTitle
        ? `Structural lineage preserved under ${parentTitle}`
        : 'Structural tier-up to campaign root',
    };
  }

  // Fallback
  const parentId = sanitizeProposedParentId(deletedPage.parentId, graph);
  const parentTitle = titleForId(graph, parentId);
  return {
    parentId,
    ruleApplied: 'fallback',
    rationale: parentTitle
      ? `Default tier-up to ${parentTitle}`
      : 'Default tier-up to campaign root',
  };
}

export function buildChildReparentPlan(
  deletedPage: WikiPageGraphNode,
  graph: Map<string, WikiPageGraphNode>,
): ChildReparentPlanEntry[] {
  const childIds = collectDirectChildIdsFromGraph(graph, deletedPage.id);
  return childIds.map((childId) => {
    const child = graph.get(childId)!;
    const resolved = resolveOrphanParentId(deletedPage, child, graph);
    return {
      childId: child.id,
      childTitle: child.title,
      proposedParentId: resolved.parentId,
      proposedParentTitle: titleForId(graph, resolved.parentId),
      ruleApplied: resolved.ruleApplied,
      rationale: resolved.rationale,
    };
  });
}

export function assertPageDeletable(
  page: WikiPageGraphNode,
): { ok: true } | { ok: false; reason: string } {
  if (isStructuralDividerTitle(page.title)) {
    return { ok: false, reason: 'Structural divider pages cannot be deleted' };
  }
  if (isReservedSystemWikiPage(page)) {
    return { ok: false, reason: 'System pages cannot be deleted' };
  }
  return { ok: true };
}

export function findReservedPagesInIds(
  graph: Map<string, WikiPageGraphNode>,
  pageIds: string[],
): string[] {
  const reserved: string[] = [];
  for (const id of pageIds) {
    const page = graph.get(id);
    if (!page) continue;
    if (isReservedSystemWikiPage(page) || isStructuralDividerTitle(page.title)) {
      reserved.push(id);
    }
  }
  return reserved;
}

export async function loadCampaignWikiGraph(
  campaignId: string,
): Promise<Map<string, WikiPageGraphNode>> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      templateType: true,
      metadata: true,
    },
  });
  return buildWikiPageGraph(pages);
}

export async function getWikiDeletePreview(
  campaignId: string,
  pageId: string,
): Promise<WikiDeletePreview | null> {
  const graph = await loadCampaignWikiGraph(campaignId);
  const page = graph.get(pageId);
  if (!page) return null;

  const descendants = collectDescendantIdsFromGraph(graph, pageId);
  const descendantTitlesSample = descendants
    .slice(0, 8)
    .map((id) => graph.get(id)?.title ?? id);
  const subtreeIds = [pageId, ...descendants];
  const reservedPageIds = findReservedPagesInIds(graph, subtreeIds);

  return {
    page,
    directChildCount: collectDirectChildIdsFromGraph(graph, pageId).length,
    descendantCount: descendants.length,
    descendantTitlesSample,
    hasReservedInSubtree: reservedPageIds.length > 0,
    reservedPageIds,
    childReparentPlan: buildChildReparentPlan(page, graph),
  };
}

export interface ExecuteOrphanDeleteResult {
  orphanedChildIds: string[];
}

export async function executeOrphanDelete(
  campaignId: string,
  pageId: string,
  actorId?: string,
): Promise<ExecuteOrphanDeleteResult | null> {
  const graph = await loadCampaignWikiGraph(campaignId);
  const page = graph.get(pageId);
  if (!page) return null;

  const deletable = assertPageDeletable(page);
  if (!deletable.ok) {
    throw new WikiDeletionError(deletable.reason, 403);
  }

  const plan = buildChildReparentPlan(page, graph);
  const previousBlocksByChild = new Map<string, unknown>();

  await prisma.$transaction(async (tx) => {
    for (const entry of plan) {
      const child = await tx.wikiPage.findFirst({
        where: { id: entry.childId, campaignId },
        select: { id: true, blocks: true, parentId: true, title: true },
      });
      if (!child) continue;
      previousBlocksByChild.set(child.id, child.blocks);
      await tx.wikiPage.update({
        where: { id: child.id },
        data: { parentId: entry.proposedParentId },
      });
    }

    await resolvePinsAfterTargetPageDelete(pageId, tx);
    const { clearEntityRelationsForWikiPage } = await import('./entityRelationSyncService.js');
    await clearEntityRelationsForWikiPage(tx, campaignId, pageId);
    const { clearQuestLifecycle } = await import('./narrativeLifecycleService.js');
    await clearQuestLifecycle(campaignId, pageId, tx);
    const { appendNarrativeEvent, NarrativeEventType } = await import(
      './narrativeEventService.js'
    );
    await appendNarrativeEvent(tx, {
      campaignId,
      type: NarrativeEventType.PAGE_EDITED,
      actorUserId: actorId ?? null,
      pageId: null,
      metadata: {
        deletedPageId: pageId,
        pageTitleSnapshot: page.title,
        softDelete: true,
      },
    });
    await tx.wikiPage.update({
      where: { id: pageId },
      data: { deletedAt: new Date() },
    });
  });

  if (actorId) {
    const { logWikiPageActivity } = await import('./wikiPageActivity.js');
    for (const entry of plan) {
      logWikiPageActivity({
        campaignId,
        userId: actorId,
        actionType: 'UPDATE',
        entityId: entry.childId,
        entityName: entry.childTitle,
        parentId: entry.proposedParentId,
        newBlocks: [],
        previousBlocks: previousBlocksByChild.get(entry.childId),
      });
    }
    logWikiPageActivity({
      campaignId,
      userId: actorId,
      actionType: 'DELETE',
      entityId: page.id,
      entityName: page.title,
      parentId: page.parentId,
      newBlocks: [],
      previousBlocks: undefined,
    });
  }

  return { orphanedChildIds: plan.map((entry) => entry.childId) };
}

export interface ExecuteRecursiveDeleteResult {
  deletedPageIds: string[];
}

export async function executeRecursiveDelete(
  campaignId: string,
  pageId: string,
  actorId?: string,
): Promise<ExecuteRecursiveDeleteResult | null> {
  const graph = await loadCampaignWikiGraph(campaignId);
  const page = graph.get(pageId);
  if (!page) return null;

  const deletable = assertPageDeletable(page);
  if (!deletable.ok) {
    throw new WikiDeletionError(deletable.reason, 403);
  }

  const descendants = collectDescendantIdsFromGraph(graph, pageId);
  const allIds = [pageId, ...descendants];
  const reservedPageIds = findReservedPagesInIds(graph, allIds);
  if (reservedPageIds.length > 0) {
    throw new WikiDeletionError(
      'Subtree contains reserved or system pages',
      409,
      { reservedPageIds },
    );
  }

  const pagesToDelete = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: allIds } },
    select: { id: true, title: true, parentId: true, blocks: true },
  });

  await prisma.$transaction(async (tx) => {
    await (tx as any).campaignSessionTimeline.deleteMany({
      where: {
        campaignId,
        wikiPageId: { in: allIds },
      },
    });
    await resolvePinsAfterTargetPageDeletes(allIds, tx);
    const { clearEntityRelationsForWikiPage } = await import('./entityRelationSyncService.js');
    const { clearQuestLifecycle } = await import('./narrativeLifecycleService.js');
    for (const id of allIds) {
      await clearEntityRelationsForWikiPage(tx, campaignId, id);
      await clearQuestLifecycle(campaignId, id, tx);
    }
    await tx.wikiPage.deleteMany({
      where: { campaignId, id: { in: allIds } },
    });
  });

  if (actorId) {
    const { logWikiPageActivity } = await import('./wikiPageActivity.js');
    for (const deleted of pagesToDelete) {
      logWikiPageActivity({
        campaignId,
        userId: actorId,
        actionType: 'DELETE',
        entityId: deleted.id,
        entityName: deleted.title,
        parentId: deleted.parentId,
        newBlocks: [],
        previousBlocks: deleted.blocks,
      });
    }
  }

  return { deletedPageIds: allIds };
}

export class WikiDeletionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'WikiDeletionError';
  }
}

export async function collectDescendantIds(
  campaignId: string,
  rootId: string,
): Promise<string[]> {
  const graph = await loadCampaignWikiGraph(campaignId);
  return collectDescendantIdsFromGraph(graph, rootId);
}
