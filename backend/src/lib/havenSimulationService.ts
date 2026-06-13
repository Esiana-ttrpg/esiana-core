import type { Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import {
  advanceHavenSimulation,
  mergeHavenSimulationIntoHints,
  parseHavenSimulationFromHints,
} from '../../../shared/havenSimulation.js';
import {
  createHavenActivityEntry,
  isEscalatingThreat,
} from '../../../shared/havenMetadata.js';
import { fieldsToPrismaUpdate, rowToFields } from './downtimeHavenFields.js';
import { SIMULATION_PROJECT_STATUSES } from './projectMetadata.js';

export type HavenSimulationRunResult = {
  entitiesScanned: number;
  entitiesUpdated: number;
  crossingsCount: number;
  partial: boolean;
};

export async function listDowntimeHavensForSimulation(
  campaignId: string,
  tx: Prisma.TransactionClient,
) {
  return tx.downtimeHaven.findMany({
    where: {
      campaignId,
      wikiPage: { deletedAt: null },
    },
    include: {
      wikiPage: {
        select: { id: true, deletedAt: true },
      },
    },
  });
}

async function countActiveProjectsAtHaven(
  tx: Prisma.TransactionClient,
  campaignId: string,
  havenWikiPageId: string,
): Promise<number> {
  return tx.downtimeProject.count({
    where: {
      campaignId,
      havenPageId: havenWikiPageId,
      status: { in: [...SIMULATION_PROJECT_STATUSES] },
      wikiPage: { deletedAt: null },
    },
  });
}

export async function runHavenSimulation(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<HavenSimulationRunResult> {
  const deltaMinutes = BigInt(context.elapsedMinutes);
  if (deltaMinutes <= 0n) {
    return {
      entitiesScanned: 0,
      entitiesUpdated: 0,
      crossingsCount: 0,
      partial: false,
    };
  }

  const rows = await listDowntimeHavensForSimulation(context.campaignId, tx);
  let entitiesUpdated = 0;
  let crossingsCount = 0;

  for (const row of rows) {
    const fields = rowToFields(row);
    const simulation = parseHavenSimulationFromHints(fields.simulationHints);

    if (!simulation.enabled || simulation.pausedReason) {
      continue;
    }

    const escalatingThreatCount = fields.threats.filter(isEscalatingThreat).length;
    const activeProjectCount = await countActiveProjectsAtHaven(
      tx,
      context.campaignId,
      row.wikiPageId,
    );

    const result = advanceHavenSimulation({
      simulation,
      elapsedMinutes: deltaMinutes,
      advanceMagnitude: context.advanceMagnitude,
      nextEpochMinute: context.nextEpochMinute,
      context: {
        status: fields.status,
        escalatingThreatCount,
        activeProjectCount,
        primaryTheme: fields.primaryTheme,
      },
    });

    const hasCrossings = result.bandCrossings.length > 0;
    const axesChanged =
      JSON.stringify(result.nextSimulation.axes) !== JSON.stringify(simulation.axes);
    const timestampChanged =
      result.nextSimulation.lastSimulatedAtEpochMinute !==
      simulation.lastSimulatedAtEpochMinute;

    if (!hasCrossings && !axesChanged && !timestampChanged) {
      continue;
    }

    let nextFields = {
      ...fields,
      simulationHints: mergeHavenSimulationIntoHints(
        fields.simulationHints,
        result.nextSimulation,
      ),
    };

    if (hasCrossings) {
      for (const crossing of result.bandCrossings) {
        nextFields = {
          ...nextFields,
          activityLog: [
            ...nextFields.activityLog,
            createHavenActivityEntry({
              summary: crossing.summary,
              origin: 'future_simulation',
              atEpochMinute: context.nextEpochMinute,
              tone: crossing.tone,
            }),
          ],
        };
      }
      crossingsCount += result.bandCrossings.length;
    }

    await tx.downtimeHaven.update({
      where: { id: row.id },
      data: fieldsToPrismaUpdate(nextFields),
    });
    entitiesUpdated += 1;
  }

  return {
    entitiesScanned: rows.length,
    entitiesUpdated,
    crossingsCount,
    partial: false,
  };
}
