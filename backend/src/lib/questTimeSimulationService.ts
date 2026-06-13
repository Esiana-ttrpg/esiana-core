import type { Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import {
  NarrativeLifecycleStates,
  NarrativeLifecycleSubjectKinds,
} from '../../../shared/narrativeLifecycle.js';
import {
  buildQuestExpiryDismissKey,
  buildQuestTimeTierReceiptKey,
  detectQuestTimeSignals,
  hasQuestTimeRules,
  mergeQuestTimeState,
  parseQuestTimePayload,
  type QuestTimePayload,
  type QuestTimeSignal,
  writeQuestTimeToMetadata,
} from '../../../shared/questTimeSimulation.js';
import { executeConsequenceEffects } from './narrativeConsequenceService.js';
import { transitionLifecycle } from './narrativeLifecycleService.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import { isDescendantOfQuestsRoot } from './questHubTree.js';

export type QuestTimeSimulationResult = {
  entitiesScanned: number;
  entitiesUpdated: number;
  signalsDetected: number;
  signalsApplied: number;
  pendingExpiryCount: number;
};

async function loadDismissedExpiryKeys(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<Set<string>> {
  const receipts = await tx.narrativeConsequenceReceipt.findMany({
    where: {
      campaignId,
      idempotencyKey: { startsWith: 'quest-expiry-dismissed:' },
    },
    select: { idempotencyKey: true },
  });
  return new Set(receipts.map((row) => row.idempotencyKey));
}

async function listQuestTimeSimulationRows(
  tx: Prisma.TransactionClient,
  campaignId: string,
  questsRootId: string,
): Promise<
  Array<{
    questPageId: string;
    questTitle: string;
    lifecycleState: import('../../../shared/narrativeLifecycle.js').NarrativeLifecycleState;
    questTime: QuestTimePayload;
    metadata: unknown;
  }>
> {
  const pages = await tx.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      metadata: true,
    },
  });

  const parentById = new Map(pages.map((p) => [p.id, { parentId: p.parentId }]));

  const lifecycles = await tx.narrativeLifecycleState.findMany({
    where: {
      campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
    },
    select: { subjectId: true, lifecycleState: true },
  });
  const lifecycleById = new Map(lifecycles.map((row) => [row.subjectId, row.lifecycleState]));

  const rows: Array<{
    questPageId: string;
    questTitle: string;
    lifecycleState: import('../../../shared/narrativeLifecycle.js').NarrativeLifecycleState;
    questTime: QuestTimePayload;
    metadata: unknown;
  }> = [];

  for (const page of pages) {
    if (page.id === questsRootId) continue;
    if (!isDescendantOfQuestsRoot(page.id, questsRootId, parentById)) continue;
    const questTime = parseQuestTimePayload(page.metadata);
    if (!questTime || !hasQuestTimeRules(questTime.rules)) continue;
    const lifecycleState =
      (lifecycleById.get(page.id) as import('../../../shared/narrativeLifecycle.js').NarrativeLifecycleState | undefined) ??
      NarrativeLifecycleStates.LOCKED;
    rows.push({
      questPageId: page.id,
      questTitle: page.title,
      lifecycleState,
      questTime,
      metadata: page.metadata,
    });
  }

  return rows;
}

async function persistQuestTimeState(
  tx: Prisma.TransactionClient,
  questPageId: string,
  metadata: unknown,
  payload: QuestTimePayload,
): Promise<void> {
  const base =
    metadata && typeof metadata === 'object'
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  await tx.wikiPage.update({
    where: { id: questPageId },
    data: { metadata: writeQuestTimeToMetadata(base, payload) as never },
  });
}

async function applyQuestTimeSignal(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
  signal: QuestTimeSignal,
  payload: QuestTimePayload,
  metadata: unknown,
  questTitle: string,
): Promise<{ applied: boolean; pendingExpiry: boolean }> {
  const batchId = context.batchId ?? context.nextEpochMinute;
  const actorUserId = context.actorUserId ?? 'system';

  if (signal.kind === 'QUEST_EXPIRED') {
    if (signal.autoFailOnExpiry) {
      await transitionLifecycle(
        {
          campaignId: context.campaignId,
          subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
          subjectId: signal.questPageId,
          toState: NarrativeLifecycleStates.FAILED,
          actorUserId,
          canManage: true,
          entityName: questTitle,
        },
        tx,
      );
      return { applied: true, pendingExpiry: false };
    }
    return { applied: false, pendingExpiry: true };
  }

  if (signal.kind === 'QUEST_ESCALATION_TIER_REACHED') {
    const receiptKey = buildQuestTimeTierReceiptKey(
      signal.questPageId,
      signal.tierId,
      batchId,
    );
    if (signal.tier.effects?.length) {
      await executeConsequenceEffects(
        {
          campaignId: context.campaignId,
          subjectId: signal.questPageId,
          effects: signal.tier.effects,
          idempotencyPrefix: receiptKey,
          actorUserId,
          canManage: true,
        },
        tx,
      );
    }
    let nextPayload = mergeQuestTimeState(payload, {
      currentEscalationTierId: signal.tierId,
      appliedSignalReceipts: [
        ...(payload.state.appliedSignalReceipts ?? []),
        receiptKey,
      ],
    });
    if (signal.tier.autoFail) {
      await transitionLifecycle(
        {
          campaignId: context.campaignId,
          subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
          subjectId: signal.questPageId,
          toState: NarrativeLifecycleStates.FAILED,
          actorUserId,
          canManage: true,
          entityName: questTitle,
        },
        tx,
      );
    }
    await persistQuestTimeState(tx, signal.questPageId, metadata, nextPayload);
    return { applied: true, pendingExpiry: false };
  }

  if (signal.kind === 'QUEST_OFFSCREEN_PROGRESS_COMPLETE') {
    const receiptKey = `quest-time:${signal.questPageId}:offscreen:${signal.totalMinutes}:${batchId}`;
    const nextPayload = mergeQuestTimeState(payload, {
      offscreenComplete: true,
      appliedSignalReceipts: [
        ...(payload.state.appliedSignalReceipts ?? []),
        receiptKey,
      ],
    });
    await persistQuestTimeState(tx, signal.questPageId, metadata, nextPayload);
    return { applied: true, pendingExpiry: false };
  }

  return { applied: false, pendingExpiry: false };
}

export async function runQuestTimeSimulation(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<QuestTimeSimulationResult> {
  const elapsed = BigInt(context.elapsedMinutes);
  const previousEpoch = BigInt(context.previousEpochMinute);
  const nextEpoch = BigInt(context.nextEpochMinute);

  if (elapsed <= 0n) {
    return {
      entitiesScanned: 0,
      entitiesUpdated: 0,
      signalsDetected: 0,
      signalsApplied: 0,
      pendingExpiryCount: 0,
    };
  }

  const questsRootId = await ensureQuestsSystemCategoryKey(context.campaignId, tx);
  if (!questsRootId) {
    return {
      entitiesScanned: 0,
      entitiesUpdated: 0,
      signalsDetected: 0,
      signalsApplied: 0,
      pendingExpiryCount: 0,
    };
  }

  const rows = await listQuestTimeSimulationRows(tx, context.campaignId, questsRootId);
  const dismissedExpiryKeys = await loadDismissedExpiryKeys(tx, context.campaignId);

  const detectResult = detectQuestTimeSignals({
    rows: rows.map((row) => ({
      questPageId: row.questPageId,
      questTitle: row.questTitle,
      lifecycleState: row.lifecycleState,
      questTime: row.questTime,
    })),
    previousEpochMinute: previousEpoch,
    nextEpochMinute: nextEpoch,
    elapsedMinutes: elapsed,
    dismissedExpiryKeys,
  });

  let entitiesUpdated = 0;
  let signalsApplied = 0;
  let pendingExpiryCount = 0;

  const rowById = new Map(rows.map((row) => [row.questPageId, row]));

  for (const [questPageId, nextState] of detectResult.nextStateByQuestId) {
    const row = rowById.get(questPageId);
    if (!row) continue;
    const updatedPayload = mergeQuestTimeState(row.questTime, nextState);
    const signalForQuest = detectResult.signals.some((s) => s.questPageId === questPageId);
    if (!signalForQuest && updatedPayload.state === row.questTime.state) continue;
    await persistQuestTimeState(tx, questPageId, row.metadata, updatedPayload);
    entitiesUpdated += 1;
  }

  for (const signal of detectResult.signals) {
    const row = rowById.get(signal.questPageId);
    if (!row) continue;
    const currentPage = await tx.wikiPage.findFirst({
      where: { id: signal.questPageId, campaignId: context.campaignId },
      select: { metadata: true, title: true },
    });
    const payload =
      parseQuestTimePayload(currentPage?.metadata) ??
      mergeQuestTimeState(row.questTime, detectResult.nextStateByQuestId.get(signal.questPageId) ?? {});
    const result = await applyQuestTimeSignal(
      tx,
      context,
      signal,
      payload,
      currentPage?.metadata ?? row.metadata,
      currentPage?.title ?? row.questTitle,
    );
    if (result.applied) signalsApplied += 1;
    if (result.pendingExpiry) pendingExpiryCount += 1;
  }

  return {
    entitiesScanned: rows.length,
    entitiesUpdated,
    signalsDetected: detectResult.signals.length,
    signalsApplied,
    pendingExpiryCount,
  };
}

export async function loadPendingQuestTimeFeedSignals(
  tx: Prisma.TransactionClient,
  campaignId: string,
  currentEpochMinute: bigint,
): Promise<import('../../../shared/questTimeSimulation.js').QuestTimeSignal[]> {
  const questsRootId = await ensureQuestsSystemCategoryKey(campaignId, tx);
  if (!questsRootId) return [];

  const rows = await listQuestTimeSimulationRows(tx, campaignId, questsRootId);
  const dismissedExpiryKeys = await loadDismissedExpiryKeys(tx, campaignId);
  const signals: import('../../../shared/questTimeSimulation.js').QuestTimeSignal[] = [];

  for (const row of rows) {
    if (row.questTime.rules.isTimePressurePaused) continue;
    const expiresAt = row.questTime.rules.expiresAtEpochMinute;
    if (
      expiresAt &&
      BigInt(expiresAt) <= currentEpochMinute &&
      !row.questTime.rules.autoFailOnExpiry
    ) {
      const dismissKey = buildQuestExpiryDismissKey(row.questPageId, expiresAt);
      if (!dismissedExpiryKeys.has(dismissKey)) {
        signals.push({
          kind: 'QUEST_EXPIRED',
          questPageId: row.questPageId,
          expiresAtEpochMinute: expiresAt,
          autoFailOnExpiry: false,
        });
      }
    }
  }

  return signals;
}
