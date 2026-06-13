import type { Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import { advanceProjectElapsed } from '../../../shared/projectMetadata.js';
import { fieldsToPrismaUpdate, rowToFields } from './downtimeProjectFields.js';
import { listDowntimeProjectsForSimulation } from './downtimeProjectService.js';
import { applyProjectOutcomes } from './projectOutcomeService.js';
import { emitProjectCompletionLedgerSuggestions } from './ledgerSuggestionEmitters.js';

export type ProjectProgressionResult = {
  entitiesScanned: number;
  entitiesUpdated: number;
  completedCount: number;
  stalledCount: number;
  progressedCount: number;
  partial: boolean;
};

export async function runProjectProgression(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<ProjectProgressionResult> {
  const deltaMinutes = BigInt(context.elapsedMinutes);
  const nextEpochMinute = BigInt(context.nextEpochMinute);
  const actorUserId = context.actorUserId ?? 'system';

  if (deltaMinutes <= 0n) {
    return {
      entitiesScanned: 0,
      entitiesUpdated: 0,
      completedCount: 0,
      stalledCount: 0,
      progressedCount: 0,
      partial: false,
    };
  }

  const rows = await listDowntimeProjectsForSimulation(context.campaignId, tx);

  let entitiesUpdated = 0;
  let completedCount = 0;
  let stalledCount = 0;
  let progressedCount = 0;
  let partial = false;

  for (const row of rows) {
    const before = rowToFields(row);
    const result = advanceProjectElapsed(before, deltaMinutes, nextEpochMinute);

    if (
      !result.progressed &&
      !result.stalled &&
      !result.completed &&
      result.fields === before
    ) {
      continue;
    }

    await tx.downtimeProject.update({
      where: { id: row.id },
      data: fieldsToPrismaUpdate(result.fields),
    });
    entitiesUpdated += 1;

    if (result.stalled) stalledCount += 1;
    if (result.progressed) progressedCount += 1;

    if (result.completed) {
      completedCount += 1;
      const applicationRunId = context.batchId
        ? `hook:${context.batchId}:${row.id}`
        : `hook:${context.nextEpochMinute}:${row.id}`;
      const outcomeResult = await applyProjectOutcomes(tx, {
        campaignId: context.campaignId,
        projectId: row.id,
        wikiPageId: row.wikiPageId,
        outcomes: result.fields.outcomes,
        actorUserId,
        atEpochMinute: context.nextEpochMinute,
        applicationSource: 'project_progression',
        applicationRunId,
      });
      if (outcomeResult.partial || outcomeResult.deferredCount > 0) {
        partial = true;
      }

      const wikiPage = await tx.wikiPage.findUnique({
        where: { id: row.wikiPageId },
        select: { title: true },
      });
      await emitProjectCompletionLedgerSuggestions(tx, {
        campaignId: context.campaignId,
        projectId: row.id,
        projectTitle: wikiPage?.title ?? 'Project',
        havenPageId: result.fields.havenPageId,
        resources: result.fields.resources,
        outcomes: outcomeResult.outcomes,
        atEpochMinute: context.nextEpochMinute,
        applicationRunId,
      });
    }
  }

  return {
    entitiesScanned: rows.length,
    entitiesUpdated,
    completedCount,
    stalledCount,
    progressedCount,
    partial,
  };
}
