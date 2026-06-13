import type { FantasyCalendar, Prisma } from '@prisma/client';
import {
  normalizeScheduledEffectKind,
  normalizeScheduledEffectOccurrenceStatus,
  normalizeScheduledEffectSuppressionReason,
  scheduledEffectSuppressionReasonLabel,
  type ScheduledEffectKind,
  type ScheduledEffectOccurrenceStatus,
  type ScheduledEffectOccurrenceSummary,
  type ScheduledEffectSuppressionReason,
} from '../../../shared/scheduledEffectMetadata.js';
import { formatEpochMinuteLabel, loadMasterCalendarForCampaign } from './scheduledEffectService.js';
import { prisma } from './prisma.js';

export type NarrativeFireAttemptResult =
  | { outcome: 'fired'; suggestionId: string }
  | { outcome: 'suppressed'; reason: ScheduledEffectSuppressionReason };

export async function recordScheduledEffectOccurrence(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    scheduledEffectId: string;
    effectKind: ScheduledEffectKind;
    fireAtEpochMinute: bigint;
    status: ScheduledEffectOccurrenceStatus;
    suppressionReason?: ScheduledEffectSuppressionReason | null;
    worldEventSuggestionId?: string | null;
  },
): Promise<void> {
  await tx.campaignScheduledEffectOccurrence.upsert({
    where: {
      campaignId_scheduledEffectId_fireAtEpochMinute: {
        campaignId: input.campaignId,
        scheduledEffectId: input.scheduledEffectId,
        fireAtEpochMinute: input.fireAtEpochMinute,
      },
    },
    create: {
      campaignId: input.campaignId,
      scheduledEffectId: input.scheduledEffectId,
      effectKind: input.effectKind,
      fireAtEpochMinute: input.fireAtEpochMinute,
      status: input.status,
      suppressionReason: input.suppressionReason ?? null,
      worldEventSuggestionId: input.worldEventSuggestionId ?? null,
    },
    update: {
      status: input.status,
      suppressionReason: input.suppressionReason ?? null,
      worldEventSuggestionId: input.worldEventSuggestionId ?? null,
    },
  });
}

export async function loadLatestOccurrencesByScheduleIds(
  campaignId: string,
  scheduleIds: string[],
): Promise<
  Map<
    string,
    {
      status: ScheduledEffectOccurrenceStatus;
      suppressionReason: ScheduledEffectSuppressionReason | null;
      fireAtEpochMinute: bigint;
    }
  >
> {
  if (scheduleIds.length === 0) return new Map();

  const rows = await prisma.campaignScheduledEffectOccurrence.findMany({
    where: { campaignId, scheduledEffectId: { in: scheduleIds } },
    orderBy: [{ scheduledEffectId: 'asc' }, { fireAtEpochMinute: 'desc' }],
    select: {
      scheduledEffectId: true,
      status: true,
      suppressionReason: true,
      fireAtEpochMinute: true,
    },
  });

  const map = new Map<
    string,
    {
      status: ScheduledEffectOccurrenceStatus;
      suppressionReason: ScheduledEffectSuppressionReason | null;
      fireAtEpochMinute: bigint;
    }
  >();

  for (const row of rows) {
    if (map.has(row.scheduledEffectId)) continue;
    const status = normalizeScheduledEffectOccurrenceStatus(row.status);
    if (!status) continue;
    map.set(row.scheduledEffectId, {
      status,
      suppressionReason: normalizeScheduledEffectSuppressionReason(row.suppressionReason),
      fireAtEpochMinute: row.fireAtEpochMinute,
    });
  }

  return map;
}

function occurrenceRowToSummary(
  row: {
    id: string;
    scheduledEffectId: string;
    effectKind: string;
    fireAtEpochMinute: bigint;
    status: string;
    suppressionReason: string | null;
    worldEventSuggestionId: string | null;
    createdAt: Date;
  },
  masterCalendar: FantasyCalendar | null,
): ScheduledEffectOccurrenceSummary {
  const effectKind = normalizeScheduledEffectKind(row.effectKind) ?? 'world_development_prompt';
  const status = normalizeScheduledEffectOccurrenceStatus(row.status) ?? 'suppressed';
  const suppressionReason = normalizeScheduledEffectSuppressionReason(row.suppressionReason);

  return {
    id: row.id,
    scheduledEffectId: row.scheduledEffectId,
    effectKind,
    fireAtEpochMinute: row.fireAtEpochMinute.toString(),
    fireAtLabel: formatEpochMinuteLabel(row.fireAtEpochMinute, masterCalendar),
    status,
    suppressionReason,
    suppressionReasonLabel: scheduledEffectSuppressionReasonLabel(suppressionReason),
    worldEventSuggestionId: row.worldEventSuggestionId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listScheduledEffectOccurrences(
  campaignId: string,
  scheduleId: string,
  limit: number,
): Promise<ScheduledEffectOccurrenceSummary[]> {
  const schedule = await prisma.campaignScheduledEffect.findFirst({
    where: { id: scheduleId, campaignId },
    select: { id: true },
  });
  if (!schedule) {
    throw new Error('Schedule not found.');
  }

  const [rows, calendar] = await Promise.all([
    prisma.campaignScheduledEffectOccurrence.findMany({
      where: { campaignId, scheduledEffectId: scheduleId },
      orderBy: { fireAtEpochMinute: 'desc' },
      take: Math.min(Math.max(1, limit), 50),
    }),
    loadMasterCalendarForCampaign(campaignId),
  ]);

  return rows.map((row) => occurrenceRowToSummary(row, calendar));
}
