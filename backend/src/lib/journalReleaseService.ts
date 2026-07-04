/**
 * Journal release evaluation + resolution.
 *
 * Two orthogonal gates decide auto-release: the rule must evaluate to `ready`
 * AND content readiness must be `ready`. An empty/partial issue never
 * auto-releases even when its rule is satisfied. Manual release honours the
 * same content gate (an empty publication cannot be released).
 */
import { prisma } from './prisma.js';
import {
  evaluateReleaseRule,
  type ConditionDiagnostic,
  type JournalReleaseSnapshot,
  type PlanState,
  type ReleaseNode,
} from '../../../shared/journalReleaseRule.js';
import {
  computeContentReadiness,
  type ContentReadiness,
  type JournalReleaseTriggerKind,
} from '../../../shared/journalPublication.js';
import { buildJournalReleaseSnapshot } from './journalReleaseSnapshotService.js';

/** Best-effort cast of a stored Json rule into a ReleaseNode (or null). */
export function asReleaseNode(raw: unknown): ReleaseNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const node = raw as { type?: unknown };
  if (node.type === 'group' || node.type === 'criteria') return raw as ReleaseNode;
  return null;
}

export interface PublicationContentInput {
  title: string;
  contentMarkdown: string | null;
  contentBlocks: unknown;
  releaseRule: unknown;
}

export interface PublicationEvaluation {
  planState: PlanState;
  contentReadiness: ContentReadiness;
  diagnostics: ConditionDiagnostic[];
  rule: ReleaseNode | null;
  /** True only when the rule is satisfied AND content is ready. */
  releasable: boolean;
}

export function evaluatePublication(
  pub: PublicationContentInput,
  snapshot: JournalReleaseSnapshot,
): PublicationEvaluation {
  const rule = asReleaseNode(pub.releaseRule);
  const { planState, diagnostics } = evaluateReleaseRule(rule, snapshot);
  const contentReadiness = computeContentReadiness({
    title: pub.title,
    contentMarkdown: pub.contentMarkdown,
    contentBlocks: pub.contentBlocks,
  });
  return {
    planState,
    contentReadiness,
    diagnostics,
    rule,
    releasable: planState === 'ready' && contentReadiness === 'ready',
  };
}

type PublicationRow = {
  id: string;
  title: string;
  contentMarkdown: string | null;
  contentBlocks: unknown;
  releaseRule: unknown;
};

async function writeRelease(params: {
  campaignId: string;
  publicationId: string;
  userId: string | null;
  triggerKind: JournalReleaseTriggerKind;
  diagnostics: ConditionDiagnostic[];
  releasedAtEpochMinute: bigint;
  now: Date;
}): Promise<void> {
  const { campaignId, publicationId } = params;
  await prisma.$transaction([
    prisma.journalPublication.updateMany({
      where: { id: publicationId, campaignId },
      data: {
        status: 'released',
        releasedAt: params.now,
        releasedByUserId: params.userId,
        lastEvaluatedAt: params.now,
      },
    }),
    prisma.journalReleaseReceipt.upsert({
      where: { campaignId_publicationId: { campaignId, publicationId } },
      create: {
        campaignId,
        publicationId,
        releasedAtEpochMinute: params.releasedAtEpochMinute,
        triggerKind: params.triggerKind,
        diagnosticsSnapshot: params.diagnostics as unknown as object,
      },
      update: {
        releasedAtEpochMinute: params.releasedAtEpochMinute,
        triggerKind: params.triggerKind,
        diagnosticsSnapshot: params.diagnostics as unknown as object,
      },
    }),
  ]);
}

/**
 * Evaluate all unreleased publications against ONE shared snapshot and release
 * every publication whose rule is satisfied and whose content is ready. Called
 * lazily from the global-time advisory hook (no background scheduler).
 */
export async function resolveDuePublications(
  campaignId: string,
): Promise<{ releasedIds: string[] }> {
  const rows = (await prisma.journalPublication.findMany({
    where: { campaignId, status: { in: ['draft', 'scheduled'] } },
    select: {
      id: true,
      title: true,
      contentMarkdown: true,
      contentBlocks: true,
      releaseRule: true,
    },
  })) as PublicationRow[];

  const candidates = rows.filter((row) => asReleaseNode(row.releaseRule) !== null);
  if (candidates.length === 0) return { releasedIds: [] };

  const snapshot = await buildJournalReleaseSnapshot({
    campaignId,
    rules: candidates.map((row) => asReleaseNode(row.releaseRule)),
  });
  const releasedAtEpochMinute = BigInt(snapshot.currentEpochMinute || '0');
  const now = new Date();

  const releasedIds: string[] = [];
  for (const row of candidates) {
    const evaluation = evaluatePublication(row, snapshot);
    if (evaluation.releasable) {
      await writeRelease({
        campaignId,
        publicationId: row.id,
        userId: null,
        triggerKind: 'auto',
        diagnostics: evaluation.diagnostics,
        releasedAtEpochMinute,
        now,
      });
      releasedIds.push(row.id);
    } else {
      await prisma.journalPublication.updateMany({
        where: { id: row.id, campaignId },
        data: { lastEvaluatedAt: now },
      });
    }
  }
  return { releasedIds };
}

export class JournalReleaseError extends Error {
  readonly code: 'NOT_FOUND' | 'CONTENT_NOT_READY' | 'ALREADY_RELEASED';
  constructor(code: 'NOT_FOUND' | 'CONTENT_NOT_READY' | 'ALREADY_RELEASED', message: string) {
    super(message);
    this.name = 'JournalReleaseError';
    this.code = code;
  }
}

/**
 * Release one publication immediately by GM action. `override` skips the rule
 * but NEVER the content gate — an empty publication cannot be released.
 */
export async function releasePublicationManually(params: {
  campaignId: string;
  publicationId: string;
  userId: string;
  triggerKind: Extract<JournalReleaseTriggerKind, 'manual' | 'override'>;
}): Promise<void> {
  const { campaignId, publicationId } = params;
  const row = (await prisma.journalPublication.findFirst({
    where: { id: publicationId, campaignId },
    select: {
      id: true,
      status: true,
      title: true,
      contentMarkdown: true,
      contentBlocks: true,
      releaseRule: true,
    },
  })) as (PublicationRow & { status: string }) | null;

  if (!row) throw new JournalReleaseError('NOT_FOUND', 'Publication not found');
  if (row.status === 'released') {
    throw new JournalReleaseError('ALREADY_RELEASED', 'Publication already released');
  }

  const snapshot = await buildJournalReleaseSnapshot({
    campaignId,
    rules: [asReleaseNode(row.releaseRule)],
  });
  const evaluation = evaluatePublication(row, snapshot);
  if (evaluation.contentReadiness !== 'ready') {
    throw new JournalReleaseError('CONTENT_NOT_READY', 'Publication has no content to release');
  }

  await writeRelease({
    campaignId,
    publicationId,
    userId: params.userId,
    triggerKind: params.triggerKind,
    diagnostics: evaluation.diagnostics,
    releasedAtEpochMinute: BigInt(snapshot.currentEpochMinute || '0'),
    now: new Date(),
  });
}
