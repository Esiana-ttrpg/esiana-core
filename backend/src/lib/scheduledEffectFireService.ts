import type { CampaignScheduledEffect, FantasyCalendar, Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import {
  buildScheduledEffectSuggestionKey,
  computeDurationDueFires,
  isNarrativeScheduledEffectKind,
  MAX_SCHEDULED_EFFECT_FIRES_PER_ADVANCE,
  normalizeScheduledEffectKind,
  normalizeScheduledEffectRecurrence,
  type ScheduledEffectKind,
  type ScheduledEffectRecurrence,
} from '../../../shared/scheduledEffectMetadata.js';
import { emitLedgerSuggestion } from './ledgerSuggestionService.js';
import { loadMasterCalendarForCampaign, computeNextFireAfter } from './scheduledEffectService.js';
import { computeCalendarMonthDueFires } from './scheduledEffectCalendarRecurrence.js';
import {
  recordScheduledEffectOccurrence,
  type NarrativeFireAttemptResult,
} from './scheduledEffectOccurrenceService.js';

export type ScheduledEffectFireResult = {
  schedulesScanned: number;
  schedulesTriggered: number;
  cappedSchedules: number;
  remaining: boolean;
  treasuryApplied: number;
  narrativeGenerated: number;
  narrativeSuppressed: number;
};

function emptyFireResult(): ScheduledEffectFireResult {
  return {
    schedulesScanned: 0,
    schedulesTriggered: 0,
    cappedSchedules: 0,
    remaining: false,
    treasuryApplied: 0,
    narrativeGenerated: 0,
    narrativeSuppressed: 0,
  };
}

function computeDueFiresForSchedule(input: {
  recurrence: ScheduledEffectRecurrence;
  nextFireEpochMinute: bigint;
  previousEpochMinute: bigint;
  nextEpochMinute: bigint;
  maxFires: number;
  calendar: FantasyCalendar | null;
}): { fires: bigint[]; remaining: boolean } {
  if (input.recurrence.kind === 'duration') {
    return computeDurationDueFires({
      rule: input.recurrence,
      nextFireEpochMinute: input.nextFireEpochMinute,
      previousEpochMinute: input.previousEpochMinute,
      nextEpochMinute: input.nextEpochMinute,
      maxFires: input.maxFires,
    });
  }
  if (!input.calendar) {
    return { fires: [], remaining: false };
  }
  return computeCalendarMonthDueFires({
    rule: input.recurrence,
    nextFireEpochMinute: input.nextFireEpochMinute,
    previousEpochMinute: input.previousEpochMinute,
    nextEpochMinute: input.nextEpochMinute,
    maxFires: input.maxFires,
    calendar: input.calendar,
  });
}

export async function runScheduledEffectFires(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<ScheduledEffectFireResult> {
  const previousEpochMinute = BigInt(context.previousEpochMinute);
  const nextEpochMinute = BigInt(context.nextEpochMinute);

  if (nextEpochMinute <= previousEpochMinute) {
    return emptyFireResult();
  }

  const calendar = await loadMasterCalendarForCampaign(context.campaignId);

  const schedules = await tx.campaignScheduledEffect.findMany({
    where: {
      campaignId: context.campaignId,
      status: 'active',
      effectKind: {
        in: ['ledger_upkeep', 'ledger_income', 'world_development_prompt', 'haven_threat_prompt'],
      },
      nextFireEpochMinute: { lte: nextEpochMinute },
    },
    orderBy: { nextFireEpochMinute: 'asc' },
  });

  let globalFireBudget = MAX_SCHEDULED_EFFECT_FIRES_PER_ADVANCE;
  let schedulesTriggered = 0;
  let treasuryApplied = 0;
  let narrativeGenerated = 0;
  let narrativeSuppressed = 0;
  let cappedSchedules = 0;
  let remaining = false;

  for (const schedule of schedules) {
    if (globalFireBudget <= 0) {
      remaining = true;
      break;
    }

    const recurrence = normalizeScheduledEffectRecurrence(schedule.recurrenceRule);
    if (!recurrence) continue;

    const { fires, remaining: scheduleRemaining } = computeDueFiresForSchedule({
      recurrence,
      nextFireEpochMinute: schedule.nextFireEpochMinute,
      previousEpochMinute,
      nextEpochMinute,
      maxFires: globalFireBudget,
      calendar,
    });

    if (fires.length === 0) {
      if (scheduleRemaining) {
        remaining = true;
        cappedSchedules += 1;
      }
      continue;
    }

    schedulesTriggered += 1;
    if (scheduleRemaining) {
      cappedSchedules += 1;
      remaining = true;
    }

    const effectKind = normalizeScheduledEffectKind(schedule.effectKind);
    if (!effectKind) continue;

    let lastProcessedFire: bigint | null = null;
    for (const fireAt of fires) {
      if (globalFireBudget <= 0) {
        remaining = true;
        break;
      }

      if (isNarrativeScheduledEffectKind(effectKind)) {
        const attempt = await attemptScheduledWorldDevelopmentFire(
          tx,
          schedule,
          effectKind,
          fireAt,
          context,
        );
        await recordScheduledEffectOccurrence(tx, {
          campaignId: schedule.campaignId,
          scheduledEffectId: schedule.id,
          effectKind,
          fireAtEpochMinute: fireAt,
          status: attempt.outcome === 'fired' ? 'fired' : 'suppressed',
          suppressionReason: attempt.outcome === 'suppressed' ? attempt.reason : null,
          worldEventSuggestionId:
            attempt.outcome === 'fired' ? attempt.suggestionId : null,
        });
        if (attempt.outcome === 'fired') {
          narrativeGenerated += 1;
        } else {
          narrativeSuppressed += 1;
        }
      } else {
        const applied = await emitScheduledTreasurySuggestion(tx, schedule, fireAt);
        if (applied) {
          treasuryApplied += 1;
        }
      }

      lastProcessedFire = fireAt;
      globalFireBudget -= 1;
      if (globalFireBudget <= 0) {
        remaining = true;
        break;
      }
    }

    if (lastProcessedFire == null) {
      continue;
    }

    const nextFire = computeNextFireAfter(lastProcessedFire, recurrence, calendar);

    await tx.campaignScheduledEffect.update({
      where: { id: schedule.id },
      data: {
        lastFiredEpochMinute: lastProcessedFire,
        nextFireEpochMinute: nextFire,
      },
    });
  }

  return {
    schedulesScanned: schedules.length,
    schedulesTriggered,
    cappedSchedules,
    remaining,
    treasuryApplied,
    narrativeGenerated,
    narrativeSuppressed,
  };
}

async function emitScheduledTreasurySuggestion(
  tx: Prisma.TransactionClient,
  schedule: CampaignScheduledEffect,
  fireAt: bigint,
): Promise<boolean> {
  const entryKind = schedule.ledgerEntryKind === 'credit' ? 'credit' : 'debit';
  const category =
    schedule.ledgerCategory === 'income' || schedule.ledgerCategory === 'upkeep'
      ? schedule.ledgerCategory
      : entryKind === 'credit'
        ? 'income'
        : 'upkeep';

  const result = await emitLedgerSuggestion(tx, {
    campaignId: schedule.campaignId,
    idempotencyKey: buildScheduledEffectSuggestionKey(schedule.id, fireAt),
    sourceType: 'scheduled_effect',
    sourceRef: schedule.id,
    entryKind,
    category,
    title: schedule.title,
    narrative: schedule.narrative,
    amount: schedule.amount,
    occurredAtEpochMinute: fireAt,
    havenWikiPageId: schedule.havenWikiPageId,
    confidence: 'authored',
  });

  return result.created;
}

async function attemptScheduledWorldDevelopmentFire(
  tx: Prisma.TransactionClient,
  schedule: CampaignScheduledEffect,
  effectKind: ScheduledEffectKind,
  fireAt: bigint,
  context: GlobalTimeAdvanceContext,
): Promise<NarrativeFireAttemptResult> {
  try {
    const { resolveWorldDevelopmentSettings } = await import(
      './worldDevelopmentSettingsService.js'
    );
    const { isWorldDevelopmentEnabled, serializeDevelopmentPayload } = await import(
      '../../../shared/worldDevelopmentMetadata.js'
    );
    const { computeSuggestionExpiresAt } = await import('./developmentExpirationService.js');

    const settings = await resolveWorldDevelopmentSettings(context.campaignId, tx);
    if (!isWorldDevelopmentEnabled(settings)) {
      return { outcome: 'suppressed', reason: 'WORLD_DEVELOPMENT_DISABLED' };
    }

    const payload = (schedule.effectPayload as Record<string, unknown> | null) ?? {};
    const orgPageId =
      typeof payload.primaryOrgPageId === 'string'
        ? payload.primaryOrgPageId
        : effectKind === 'haven_threat_prompt'
          ? schedule.havenWikiPageId
          : null;
    const developmentType = (
      effectKind === 'haven_threat_prompt' ? 'border_incident' : 'faction_pressure'
    ) as import('../../../shared/worldDevelopmentMetadata.js').DevelopmentType;

    const idempotencyKey = buildScheduledEffectSuggestionKey(schedule.id, fireAt);
    const existing = await tx.campaignWorldEventSuggestion.findUnique({
      where: {
        campaignId_idempotencyKey: {
          campaignId: schedule.campaignId,
          idempotencyKey,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return { outcome: 'fired', suggestionId: existing.id };
    }

    const devPayload = serializeDevelopmentPayload({
      version: 'world-development-v1',
      developmentType,
      significance: settings.typeLifecycles[developmentType]?.significance ?? 'minor',
      rationale: [{ kind: 'scheduled', text: `Scheduled effect: ${schedule.title}` }],
      confidence: 'medium',
      dependencyRefs: orgPageId ? [{ kind: 'org', id: orgPageId }] : [],
      proposedAcceptTarget: 'calendar_event',
    });

    const suggestion = await tx.campaignWorldEventSuggestion.create({
      data: {
        campaignId: schedule.campaignId,
        status: 'pending',
        kind: 'faction_pressure',
        title: schedule.title,
        narrative: schedule.narrative,
        occurredAtEpochMinute: fireAt,
        sourceType: 'scheduled_effect',
        sourceRef: schedule.id,
        idempotencyKey,
        primaryOrgPageId: orgPageId,
        developmentPayload: devPayload as Prisma.InputJsonValue,
        expiresAt: computeSuggestionExpiresAt(settings.expiration.wallClockDays),
      },
      select: { id: true },
    });

    return { outcome: 'fired', suggestionId: suggestion.id };
  } catch {
    return { outcome: 'suppressed', reason: 'GENERATION_FAILED' };
  }
}
