import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  TIME_HOOKS_SEMANTICS_VERSION,
  truncateHookSummary,
  type GlobalTimeAdvanceContext,
  type GlobalTimeHookResult,
  type GlobalTimeSimulationReceipt,
} from '../../../../shared/globalTimeHooks.js';
import { GlobalTimeHookExecutionError } from './errors.js';
import { getHookKind, getRegisteredGlobalTimeHooks } from './handlers/index.js';
import { withGlobalTimeHooksGuard } from './recursionGuard.js';

function compactResult(result: GlobalTimeHookResult): GlobalTimeHookResult {
  return {
    ...result,
    summary: truncateHookSummary(result.summary),
    error: truncateHookSummary(result.error),
  };
}

async function findExistingRun(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<GlobalTimeSimulationReceipt | null> {
  if (!context.batchId) return null;

  const row = await tx.timeAdvanceSimulationRun.findFirst({
    where: {
      campaignId: context.campaignId,
      source: context.source,
      sourceRef: context.batchId,
      nextEpochMinute: BigInt(context.nextEpochMinute),
    },
    select: { receipt: true },
  });

  if (!row?.receipt || typeof row.receipt !== 'object') return null;
  return row.receipt as GlobalTimeSimulationReceipt;
}

async function persistRun(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
  receipt: GlobalTimeSimulationReceipt,
): Promise<void> {
  await tx.timeAdvanceSimulationRun.create({
    data: {
      id: receipt.runId,
      campaignId: context.campaignId,
      previousEpochMinute: BigInt(context.previousEpochMinute),
      nextEpochMinute: BigInt(context.nextEpochMinute),
      source: context.source,
      sourceRef: context.batchId ?? null,
      semanticsVersion: TIME_HOOKS_SEMANTICS_VERSION,
      receipt: JSON.parse(JSON.stringify(receipt)),
    },
  });
}

export async function runGlobalTimeHooks(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<GlobalTimeSimulationReceipt> {
  return withGlobalTimeHooksGuard(async () => {
    const existing = await findExistingRun(tx, context);
    if (existing) return existing;

    const runStartedAt = Date.now();
    const startedAt = new Date(runStartedAt).toISOString();
    const results: GlobalTimeHookResult[] = [];

    for (const entry of getRegisteredGlobalTimeHooks()) {
      const hookStartedAt = Date.now();
      const kind = getHookKind(entry.hookId);

      let handlerResult;
      try {
        handlerResult = await entry.run(tx, context);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown hook error';
        const failed: GlobalTimeHookResult = compactResult({
          hookId: entry.hookId,
          handlerVersion: entry.handlerVersion,
          status: 'failed',
          kind,
          durationMs: Date.now() - hookStartedAt,
          error: message,
        });
        results.push(failed);

        if (kind === 'canonical') {
          throw new GlobalTimeHookExecutionError({
            hookId: entry.hookId,
            handlerVersion: entry.handlerVersion,
            message,
            partialResults: results,
          });
        }
        continue;
      }

      const result = compactResult({
        hookId: entry.hookId,
        handlerVersion: handlerResult.handlerVersion,
        status: handlerResult.status,
        kind,
        durationMs: Date.now() - hookStartedAt,
        summary: handlerResult.summary,
        counts: handlerResult.counts,
        error: handlerResult.error,
      });
      results.push(result);

      if (result.status === 'failed' && kind === 'canonical') {
        throw new GlobalTimeHookExecutionError({
          hookId: entry.hookId,
          handlerVersion: result.handlerVersion,
          message: result.error ?? 'Canonical hook failed',
          partialResults: results,
        });
      }
    }

    const runCompletedAt = Date.now();
    const receipt: GlobalTimeSimulationReceipt = {
      runId: randomUUID(),
      semanticsVersion: TIME_HOOKS_SEMANTICS_VERSION,
      context,
      results,
      startedAt,
      completedAt: new Date(runCompletedAt).toISOString(),
      durationMs: runCompletedAt - runStartedAt,
    };

    await persistRun(tx, context, receipt);
    return receipt;
  });
}
