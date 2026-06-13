import type { Prisma } from '@prisma/client';
import {
  allowedNextBranchNodes,
  assertValidBranchGraph,
  NarrativeBranchValidationError,
  parseNarrativeBranchGraph,
  type NarrativeBranchGraph,
  type NarrativeBranchNode,
} from '../../../shared/narrativeBranch.js';
import { prisma } from './prisma.js';

const BRANCH_METADATA_KEY = 'narrativeBranchGraph';

export function readBranchGraphFromMetadata(metadata: unknown): NarrativeBranchGraph | null {
  if (!metadata || typeof metadata !== 'object') return null;
  return parseNarrativeBranchGraph(
    (metadata as Record<string, unknown>)[BRANCH_METADATA_KEY],
  );
}

export function mergeBranchGraphIntoMetadata(
  existing: unknown,
  graph: NarrativeBranchGraph | null,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (!graph) {
    delete base[BRANCH_METADATA_KEY];
    return base;
  }
  return { ...base, [BRANCH_METADATA_KEY]: graph };
}

export async function getBranchState(
  campaignId: string,
  subjectId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ activeNodeId: string | null; graph: NarrativeBranchGraph | null }> {
  const page = await db.wikiPage.findFirst({
    where: { id: subjectId, campaignId },
    select: { metadata: true },
  });
  const graph = page ? readBranchGraphFromMetadata(page.metadata) : null;
  const runtime = await db.narrativeBranchState.findUnique({
    where: { campaignId_subjectId: { campaignId, subjectId } },
    select: { activeNodeId: true },
  });
  return { activeNodeId: runtime?.activeNodeId ?? null, graph };
}

export async function saveBranchGraph(
  campaignId: string,
  subjectId: string,
  graph: NarrativeBranchGraph,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  assertValidBranchGraph(graph);
  const page = await db.wikiPage.findFirst({
    where: { id: subjectId, campaignId },
    select: { metadata: true },
  });
  if (!page) throw new Error('PAGE_NOT_FOUND');
  const merged = mergeBranchGraphIntoMetadata(page.metadata, graph);
  await db.wikiPage.update({
    where: { id: subjectId },
    data: { metadata: merged as never },
  });
}

export async function setActiveBranchNode(
  campaignId: string,
  subjectId: string,
  activeNodeId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const { graph } = await getBranchState(campaignId, subjectId, db);
  if (!graph) throw new NarrativeBranchValidationError('No branch graph on subject');
  if (!graph.nodes.some((n) => n.id === activeNodeId)) {
    throw new NarrativeBranchValidationError('Unknown branch node');
  }
  await db.narrativeBranchState.upsert({
    where: { campaignId_subjectId: { campaignId, subjectId } },
    create: { campaignId, subjectId, activeNodeId },
    update: { activeNodeId },
  });
}

export async function evaluateBranchTransitions(
  campaignId: string,
  subjectId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ activeNodeId: string | null; allowed: NarrativeBranchNode[] }> {
  const state = await getBranchState(campaignId, subjectId, db);
  if (!state.graph) {
    return { activeNodeId: null, allowed: [] };
  }
  return {
    activeNodeId: state.activeNodeId,
    allowed: allowedNextBranchNodes(state.graph, state.activeNodeId),
  };
}

export { NarrativeBranchValidationError, BRANCH_METADATA_KEY };
