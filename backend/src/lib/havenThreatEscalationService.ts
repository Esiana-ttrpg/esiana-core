import type { Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import {
  applyThreatSeverityPromotion,
  detectNextThreatSeverityPromotion,
  HAVEN_THREAT_ESCALATION_ACTIVITY_SUMMARIES,
} from '../../../shared/downtimeContinuityIntegration.js';
import { createHavenActivityEntry } from '../../../shared/havenMetadata.js';
import { fieldsToPrismaUpdate, rowToFields } from './downtimeHavenFields.js';
import { listDowntimeHavensForSimulation } from './havenSimulationService.js';

export type HavenThreatEscalationRunResult = {
  entitiesScanned: number;
  entitiesUpdated: number;
  promotionsCount: number;
};

export async function runHavenThreatEscalation(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<HavenThreatEscalationRunResult> {
  const rows = await listDowntimeHavensForSimulation(context.campaignId, tx);
  const currentEpochMinute = BigInt(context.nextEpochMinute);
  let entitiesUpdated = 0;
  let promotionsCount = 0;

  for (const row of rows) {
    const fields = rowToFields(row);
    if (fields.threats.length === 0) continue;

    let nextFields = { ...fields };
    let havenChanged = false;
    const nextThreats = [...fields.threats];

    for (let index = 0; index < nextThreats.length; index += 1) {
      const threat = nextThreats[index];
      if (!threat) continue;

      const nextSeverity = detectNextThreatSeverityPromotion(
        threat,
        currentEpochMinute,
      );
      if (!nextSeverity) continue;

      const summary =
        nextSeverity === 'rising'
          ? HAVEN_THREAT_ESCALATION_ACTIVITY_SUMMARIES.low_to_rising
          : HAVEN_THREAT_ESCALATION_ACTIVITY_SUMMARIES.rising_to_critical;

      nextThreats[index] = applyThreatSeverityPromotion(
        threat,
        nextSeverity,
        context.nextEpochMinute,
      );
      nextFields = {
        ...nextFields,
        threats: nextThreats,
        activityLog: [
          ...nextFields.activityLog,
          createHavenActivityEntry({
            summary,
            origin: 'future_simulation',
            atEpochMinute: context.nextEpochMinute,
            tone: 'escalation',
          }),
        ],
      };

      havenChanged = true;
      promotionsCount += 1;
    }

    if (!havenChanged) continue;

    await tx.downtimeHaven.update({
      where: { id: row.id },
      data: fieldsToPrismaUpdate(nextFields),
    });
    entitiesUpdated += 1;
  }

  return {
    entitiesScanned: rows.length,
    entitiesUpdated,
    promotionsCount,
  };
}
