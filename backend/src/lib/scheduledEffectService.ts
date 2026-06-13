import type { CampaignScheduledEffect, FantasyCalendar, Prisma, WikiPage } from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';
import { assertScopedMutationCount } from './scopedMutation.js';
import { toNullableInputJsonValue } from './inputJsonValue.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { buildCalendarStates } from './timeTracking.js';
import { canManageLedgerSettings } from './campaignLedgerService.js';
import {
  computeInitialCalendarMonthNextFire,
  computeNextCalendarMonthFire,
} from './scheduledEffectCalendarRecurrence.js';
import {
  computeInitialDurationNextFire,
  computeNextDurationFire,
  formatRecurrenceLabel,
  isNarrativeScheduledEffectKind,
  isTreasuryScheduledEffectKind,
  normalizeCalendarMonthRecurrence,
  normalizeDurationRecurrence,
  normalizeScheduledEffectKind,
  normalizeScheduledEffectRecurrence,
  normalizeScheduledEffectStatus,
  scheduledEffectKindsForScope,
  scheduledEffectSuppressionReasonLabel,
  SCHEDULED_EFFECT_SEMANTICS_VERSION,
  type ScheduledEffectKind,
  type ScheduledEffectListScope,
  type ScheduledEffectOccurrenceStatus,
  type ScheduledEffectRecurrence,
  type ScheduledEffectSummary,
  type ScheduledTreasuryPulseHint,
} from '../../../shared/scheduledEffectMetadata.js';
import { loadLatestOccurrencesByScheduleIds } from './scheduledEffectOccurrenceService.js';

type ScheduleRow = CampaignScheduledEffect & {
  havenWiki: Pick<WikiPage, 'id' | 'title'> | null;
};

const scheduleInclude = {
  havenWiki: { select: { ...wikiPageHrefSelect } },
} as const;

export function canManageScheduledEffects(role: CampaignMemberRole | null): boolean {
  return canManageLedgerSettings(role);
}

async function loadMasterCalendar(campaignId: string): Promise<FantasyCalendar | null> {
  const calendars = await prisma.fantasyCalendar.findMany({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
  });
  return calendars.find((calendar) => calendar.isMasterTime) ?? calendars[0] ?? null;
}

function formatEpochMinuteLabel(
  epochMinute: bigint,
  masterCalendar: FantasyCalendar | null,
): string {
  if (!masterCalendar) {
    return `Minute ${epochMinute.toString()}`;
  }
  const [built] = buildCalendarStates(epochMinute, [masterCalendar]);
  const state = built?.state;
  if (!state) {
    return `Minute ${epochMinute.toString()}`;
  }
  return `${state.day} ${state.monthName}, Year ${state.year}`;
}

function formatRelativeDueLabel(
  nextFireEpochMinute: bigint,
  currentEpochMinute: bigint,
): string | null {
  const delta = nextFireEpochMinute - currentEpochMinute;
  if (delta <= 0n) return 'now';
  const days = delta / 1440n;
  if (days === 0n) return 'today';
  if (days === 1n) return 'in 1 day';
  if (days < 30n) return `in ${days.toString()} days`;
  return `in ${days.toString()} days`;
}

function rowToSummary(
  row: ScheduleRow,
  campaignHandle: string,
  masterCalendar: FantasyCalendar | null,
  currentEpochMinute: bigint,
  canManage: boolean,
  lastOccurrence?: {
    status: ScheduledEffectOccurrenceStatus;
    suppressionReason: import('../../../shared/scheduledEffectMetadata.js').ScheduledEffectSuppressionReason | null;
    fireAtEpochMinute: bigint;
  } | null,
): ScheduledEffectSummary {
  const recurrence =
    normalizeScheduledEffectRecurrence(row.recurrenceRule) ?? {
      kind: 'duration' as const,
      intervalMinutes: 1440,
    };
  const effectKind = normalizeScheduledEffectKind(row.effectKind) ?? 'ledger_upkeep';

  const lastFiredEpoch =
    lastOccurrence?.fireAtEpochMinute ?? row.lastFiredEpochMinute ?? null;

  return {
    id: row.id,
    campaignId: row.campaignId,
    status: normalizeScheduledEffectStatus(row.status),
    effectKind,
    title: row.title,
    narrative: row.narrative,
    recurrenceRule: recurrence,
    anchorEpochMinute: row.anchorEpochMinute.toString(),
    nextFireEpochMinute: row.nextFireEpochMinute.toString(),
    lastFiredEpochMinute: row.lastFiredEpochMinute?.toString() ?? null,
    effectPayload:
      row.effectPayload && typeof row.effectPayload === 'object' && !Array.isArray(row.effectPayload)
        ? (row.effectPayload as Record<string, unknown>)
        : null,
    ledgerEntryKind:
      row.ledgerEntryKind === 'credit' || row.ledgerEntryKind === 'debit'
        ? row.ledgerEntryKind
        : null,
    ledgerCategory: row.ledgerCategory,
    amount: row.amount,
    havenWikiPageId: row.havenWikiPageId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    nextFireLabel:
      row.status === 'active'
        ? isNarrativeScheduledEffectKind(effectKind)
          ? formatEpochMinuteLabel(row.nextFireEpochMinute, masterCalendar)
          : formatRelativeDueLabel(row.nextFireEpochMinute, currentEpochMinute)
        : null,
    recurrenceLabel: formatRecurrenceLabel(recurrence),
    havenTitle: row.havenWiki?.title ?? null,
    havenHref: row.havenWiki
      ? buildWikiPageHref(campaignHandle, row.havenWiki)
      : null,
    canManage,
    lastFiredAtLabel: lastFiredEpoch
      ? formatEpochMinuteLabel(lastFiredEpoch, masterCalendar)
      : null,
    lastOutcome: lastOccurrence?.status ?? null,
    lastSuppressionReasonLabel: scheduledEffectSuppressionReasonLabel(
      lastOccurrence?.suppressionReason ?? null,
    ),
  };
}

export function computeInitialNextFire(
  anchorEpochMinute: bigint,
  recurrence: ScheduledEffectRecurrence,
  calendar: FantasyCalendar | null,
): bigint {
  if (recurrence.kind === 'duration') {
    return computeInitialDurationNextFire(recurrence, anchorEpochMinute);
  }
  if (!calendar) {
    throw new Error('A master fantasy calendar is required for monthly schedules.');
  }
  return computeInitialCalendarMonthNextFire(anchorEpochMinute, recurrence, calendar);
}

export function computeNextFireAfter(
  lastFireEpochMinute: bigint,
  recurrence: ScheduledEffectRecurrence,
  calendar: FantasyCalendar | null,
): bigint {
  if (recurrence.kind === 'duration') {
    return computeNextDurationFire(recurrence, lastFireEpochMinute);
  }
  if (!calendar) {
    throw new Error('A master fantasy calendar is required for monthly schedules.');
  }
  return computeNextCalendarMonthFire(lastFireEpochMinute, recurrence, calendar);
}

export type CreateScheduledEffectInput = {
  campaignId: string;
  effectKind: ScheduledEffectKind;
  title: string;
  narrative?: string | null;
  recurrenceRule: ScheduledEffectRecurrence;
  anchorEpochMinute?: bigint;
  amount?: number | null;
  havenWikiPageId?: string | null;
  primaryOrgPageId?: string | null;
  effectPayload?: Record<string, unknown> | null;
  createdByUserId: string;
};

function ledgerDefaultsForKind(
  effectKind: ScheduledEffectKind,
): { entryKind: 'credit' | 'debit'; category: string } {
  if (effectKind === 'ledger_income') {
    return { entryKind: 'credit', category: 'income' };
  }
  return { entryKind: 'debit', category: 'upkeep' };
}

async function validateOrgLink(
  campaignId: string,
  orgPageId: string | null | undefined,
): Promise<void> {
  if (!orgPageId) return;
  const org = await prisma.wikiPage.findFirst({
    where: {
      id: orgPageId,
      campaignId,
      deletedAt: null,
      templateType: 'ORGANIZATION',
    },
    select: { id: true },
  });
  if (!org) {
    throw new Error('Organization not found in this campaign.');
  }
}

export function validateScheduledEffectCreateFields(input: {
  effectKind: ScheduledEffectKind;
  amount?: number | null;
  havenWikiPageId?: string | null;
  primaryOrgPageId?: string | null;
}): { amount: number | null; havenWikiPageId: string | null; effectPayload: Record<string, unknown> | null } {
  if (isTreasuryScheduledEffectKind(input.effectKind)) {
    if (input.primaryOrgPageId) {
      throw new Error('Organization scope is not allowed for treasury schedules.');
    }
    if (input.amount == null || input.amount < 0) {
      throw new Error('A non-negative amount is required.');
    }
    return {
      amount: Math.max(0, Math.floor(input.amount)),
      havenWikiPageId: input.havenWikiPageId ?? null,
      effectPayload: null,
    };
  }

  if (input.amount != null) {
    throw new Error('Amount is not allowed for narrative schedules.');
  }
  if (input.primaryOrgPageId && input.havenWikiPageId) {
    throw new Error('Provide either an organization or a haven scope, not both.');
  }

  if (input.effectKind === 'world_development_prompt') {
    if (input.havenWikiPageId) {
      throw new Error('Haven scope is not allowed for world development prompts.');
    }
    return {
      amount: null,
      havenWikiPageId: null,
      effectPayload: input.primaryOrgPageId
        ? { primaryOrgPageId: input.primaryOrgPageId }
        : null,
    };
  }

  if (input.effectKind === 'haven_threat_prompt') {
    if (input.primaryOrgPageId) {
      throw new Error('Organization scope is not allowed for haven threat prompts.');
    }
    if (!input.havenWikiPageId) {
      throw new Error('A haven is required for haven threat prompts.');
    }
    return {
      amount: null,
      havenWikiPageId: input.havenWikiPageId,
      effectPayload: null,
    };
  }

  throw new Error('Invalid effect kind.');
}

export async function createScheduledEffect(
  input: CreateScheduledEffectInput,
): Promise<ScheduledEffectSummary> {
  const recurrence = normalizeScheduledEffectRecurrence(input.recurrenceRule);
  if (!recurrence) {
    throw new Error('Invalid recurrence rule.');
  }
  if (recurrence.kind === 'calendar_month') {
    const calendar = await loadMasterCalendar(input.campaignId);
    if (!calendar) {
      throw new Error('A master fantasy calendar is required for monthly schedules.');
    }
  }

  const normalized = validateScheduledEffectCreateFields(input);

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { currentEpochMinute: true },
  });
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  const anchor = input.anchorEpochMinute ?? campaign.currentEpochMinute;
  const calendar = await loadMasterCalendar(input.campaignId);
  const nextFire = computeInitialNextFire(anchor, recurrence, calendar);

  await validateOrgLink(input.campaignId, input.primaryOrgPageId);
  if (normalized.havenWikiPageId) {
    const haven = await prisma.downtimeHaven.findFirst({
      where: { campaignId: input.campaignId, wikiPageId: normalized.havenWikiPageId },
      select: { id: true },
    });
    if (!haven) {
      throw new Error('Haven not found in this campaign.');
    }
  }

  const ledgerDefaults = isTreasuryScheduledEffectKind(input.effectKind)
    ? ledgerDefaultsForKind(input.effectKind)
    : null;

  const row = await prisma.campaignScheduledEffect.create({
    data: {
      campaignId: input.campaignId,
      status: 'active',
      effectKind: input.effectKind,
      title: input.title.trim(),
      narrative: input.narrative?.trim() || null,
      recurrenceRule: recurrence as Prisma.InputJsonValue,
      anchorEpochMinute: anchor,
      nextFireEpochMinute: nextFire,
      effectPayload: toNullableInputJsonValue(normalized.effectPayload),
      ledgerEntryKind: ledgerDefaults?.entryKind ?? null,
      ledgerCategory: ledgerDefaults?.category ?? null,
      amount: normalized.amount,
      havenWikiPageId: normalized.havenWikiPageId,
      createdByUserId: input.createdByUserId,
    },
    include: scheduleInclude,
  });

  const campaignHandle = (
    await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { handle: true },
    })
  )?.handle;

  return rowToSummary(
    row,
    campaignHandle ?? input.campaignId,
    calendar,
    campaign.currentEpochMinute,
    true,
    null,
  );
}

export type UpdateScheduledEffectInput = {
  status?: 'active' | 'paused' | 'archived';
  title?: string;
  narrative?: string | null;
  recurrenceRule?: ScheduledEffectRecurrence;
  amount?: number;
};

export async function updateScheduledEffect(
  campaignId: string,
  campaignHandle: string,
  scheduleId: string,
  role: CampaignMemberRole | null,
  input: UpdateScheduledEffectInput,
): Promise<ScheduledEffectSummary> {
  if (!canManageScheduledEffects(role)) {
    throw new Error('Forbidden');
  }

  const existing = await prisma.campaignScheduledEffect.findFirst({
    where: { id: scheduleId, campaignId },
    include: scheduleInclude,
  });
  if (!existing) {
    throw new Error('Schedule not found.');
  }

  const [campaign, calendar] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    loadMasterCalendar(campaignId),
  ]);

  const data: Prisma.CampaignScheduledEffectUpdateInput = {};

  if (input.status != null) {
    data.status = normalizeScheduledEffectStatus(input.status);
  }
  if (input.title != null) {
    data.title = input.title.trim();
  }
  if (input.narrative !== undefined) {
    data.narrative = input.narrative?.trim() || null;
  }
  if (input.amount != null) {
    const kind = normalizeScheduledEffectKind(existing.effectKind);
    if (kind && isNarrativeScheduledEffectKind(kind)) {
      throw new Error('Amount cannot be updated on narrative schedules.');
    }
    data.amount = Math.max(0, Math.floor(input.amount));
  }
  if (input.recurrenceRule != null) {
    const recurrence = normalizeScheduledEffectRecurrence(input.recurrenceRule);
    if (!recurrence) {
      throw new Error('Invalid recurrence rule.');
    }
    if (recurrence.kind === 'calendar_month' && !calendar) {
      throw new Error('A master fantasy calendar is required for monthly schedules.');
    }
    data.recurrenceRule = recurrence as Prisma.InputJsonValue;
    const anchor = existing.anchorEpochMinute;
    const fromEpoch = existing.lastFiredEpochMinute ?? anchor;
    data.nextFireEpochMinute = computeNextFireAfter(fromEpoch, recurrence, calendar);
  }

  const updateResult = await prisma.campaignScheduledEffect.updateMany({
    where: { id: scheduleId, campaignId },
    data,
  });
  assertScopedMutationCount(updateResult.count, 1, 'Scheduled effect not found.');

  const row = await prisma.campaignScheduledEffect.findFirst({
    where: { id: scheduleId, campaignId },
    include: scheduleInclude,
  });
  if (!row) {
    throw new Error('Scheduled effect not found.');
  }

  return rowToSummary(
    row,
    campaignHandle,
    calendar,
    campaign?.currentEpochMinute ?? 0n,
    true,
    null,
  );
}

export async function archiveScheduledEffect(
  campaignId: string,
  campaignHandle: string,
  scheduleId: string,
  role: CampaignMemberRole | null,
): Promise<ScheduledEffectSummary> {
  return updateScheduledEffect(campaignId, campaignHandle, scheduleId, role, {
    status: 'archived',
  });
}

export async function listScheduledEffects(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  options?: { includeArchived?: boolean; scope?: ScheduledEffectListScope },
): Promise<ScheduledEffectSummary[]> {
  const scope = options?.scope ?? 'treasury';
  const kinds = scheduledEffectKindsForScope(scope);

  const [rows, campaign, calendar] = await Promise.all([
    prisma.campaignScheduledEffect.findMany({
      where: {
        campaignId,
        ...(options?.includeArchived ? {} : { status: { not: 'archived' } }),
        ...(kinds ? { effectKind: { in: kinds } } : {}),
      },
      include: scheduleInclude,
      orderBy: [{ status: 'asc' }, { nextFireEpochMinute: 'asc' }],
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    loadMasterCalendar(campaignId),
  ]);

  const canManage = canManageScheduledEffects(role);
  const currentEpoch = campaign?.currentEpochMinute ?? 0n;

  const includeOccurrences = scope === 'narrative' || scope === 'all';
  const latestOccurrences = includeOccurrences
    ? await loadLatestOccurrencesByScheduleIds(
        campaignId,
        rows.map((row) => row.id),
      )
    : new Map();

  return rows.map((row) =>
    rowToSummary(
      row,
      campaignHandle,
      calendar,
      currentEpoch,
      canManage,
      latestOccurrences.get(row.id) ?? null,
    ),
  );
}

export async function getScheduledTreasuryPulseHint(
  campaignId: string,
): Promise<ScheduledTreasuryPulseHint | null> {
  const [activeCount, nextRow, campaign, calendar] = await Promise.all([
    prisma.campaignScheduledEffect.count({
      where: {
        campaignId,
        status: 'active',
        effectKind: { in: ['ledger_upkeep', 'ledger_income'] },
      },
    }),
    prisma.campaignScheduledEffect.findFirst({
      where: {
        campaignId,
        status: 'active',
        effectKind: { in: ['ledger_upkeep', 'ledger_income'] },
      },
      orderBy: { nextFireEpochMinute: 'asc' },
      select: { nextFireEpochMinute: true },
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    loadMasterCalendar(campaignId),
  ]);

  if (activeCount === 0) return null;

  const currentEpoch = campaign?.currentEpochMinute ?? 0n;
  const nextDueLabel = nextRow
    ? formatRelativeDueLabel(nextRow.nextFireEpochMinute, currentEpoch)
    : null;

  return { activeCount, nextDueLabel };
}

export async function loadMasterCalendarForCampaign(
  campaignId: string,
): Promise<FantasyCalendar | null> {
  return loadMasterCalendar(campaignId);
}

export {
  formatEpochMinuteLabel,
  normalizeDurationRecurrence,
  normalizeCalendarMonthRecurrence,
  SCHEDULED_EFFECT_SEMANTICS_VERSION,
};
