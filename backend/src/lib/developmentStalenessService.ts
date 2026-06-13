import type { Prisma } from '@prisma/client';
import {
  normalizeDevelopmentPayload,
  serializeDevelopmentPayload,
  type DevelopmentDependencyRef,
} from '../../../shared/worldDevelopmentMetadata.js';
import { normalizeWorldEventSuggestionStatus } from '../../../shared/worldEventSuggestionMetadata.js';
import { prisma } from './prisma.js';

async function isOrgDependencyValid(
  tx: Prisma.TransactionClient,
  campaignId: string,
  orgId: string,
): Promise<boolean> {
  const page = await tx.wikiPage.findFirst({
    where: { id: orgId, campaignId },
    select: { id: true, metadata: true },
  });
  if (!page) return false;
  const meta = page.metadata as Record<string, unknown> | null;
  if (meta?.dissolved === true || meta?.destroyed === true) return false;
  return true;
}

async function isQuestDependencyValid(
  tx: Prisma.TransactionClient,
  campaignId: string,
  questPageId: string,
): Promise<boolean> {
  const lifecycle = await tx.narrativeLifecycleState.findFirst({
    where: {
      campaignId,
      subjectKind: 'quest',
      subjectId: questPageId,
    },
    select: { lifecycleState: true },
  });
  if (!lifecycle) return true;
  const terminal = ['completed', 'failed', 'abandoned', 'archived'];
  return !terminal.includes(lifecycle.lifecycleState.toLowerCase());
}

async function evaluateDependencyRefs(
  tx: Prisma.TransactionClient,
  campaignId: string,
  refs: DevelopmentDependencyRef[],
): Promise<string | null> {
  for (const ref of refs) {
    if (ref.kind === 'org') {
      const valid = await isOrgDependencyValid(tx, campaignId, ref.id);
      if (!valid) return `Organization no longer valid (${ref.id})`;
    }
    if (ref.kind === 'quest') {
      const valid = await isQuestDependencyValid(tx, campaignId, ref.id);
      if (!valid) return `Linked quest resolved or closed`;
    }
  }
  return null;
}

export async function markStalePendingDevelopments(
  campaignId: string,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const db = tx ?? prisma;
  const pending = await db.campaignWorldEventSuggestion.findMany({
    where: { campaignId, status: 'pending' },
    select: { id: true, developmentPayload: true },
  });

  let marked = 0;
  const now = new Date();

  for (const row of pending) {
    const payload = normalizeDevelopmentPayload(row.developmentPayload);
    if (!payload || payload.dependencyRefs.length === 0) continue;

    const reason = await evaluateDependencyRefs(db, campaignId, payload.dependencyRefs);
    if (!reason) continue;

    const nextPayload = {
      ...payload,
      obsoleteReason: reason,
    };

    await db.campaignWorldEventSuggestion.update({
      where: { id: row.id },
      data: {
        status: 'obsolete',
        resolvedAt: now,
        developmentPayload: serializeDevelopmentPayload(nextPayload) as object,
      },
    });
    marked += 1;
  }

  return marked;
}

export function isTerminalSuggestionStatus(status: string): boolean {
  const normalized = normalizeWorldEventSuggestionStatus(status);
  return normalized !== 'pending';
}
