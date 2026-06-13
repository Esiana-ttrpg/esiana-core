import type { CampaignWorldEventSuggestion, Prisma, WikiPage } from '@prisma/client';
import {
  isWorldDevelopmentEnabled,
  normalizeDevelopmentPayload,
  type DevelopmentRationaleLine,
} from '../../../shared/worldDevelopmentMetadata.js';
import type {
  DevelopmentHistoryRow,
  PendingDevelopmentRow,
  WorldDevelopmentPresentation,
} from '../../../shared/worldDevelopmentPresentation.js';
import {
  HISTORY_STATUS_FILTER_LABELS,
  normalizeWorldEventSuggestionKind,
  normalizeWorldEventSuggestionStatus,
  type WorldEventSuggestionTerminalStatus,
} from '../../../shared/worldEventSuggestionMetadata.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { prisma } from './prisma.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { listPendingReputationSuggestions } from './reputationSuggestionService.js';
import { canManageWorldEventSuggestions } from './worldEventSuggestionService.js';
import { resolveWorldDevelopmentSettings } from './worldDevelopmentSettingsService.js';
import { markStalePendingDevelopments } from './developmentStalenessService.js';
import { eventLorePageIdForCalendarEvent } from './eventLoreStub.js';
import {
  buildWorldDevelopmentReadiness,
  buildWorldDevelopmentStatusSummary,
  countGeneratedThisCampaignMonth,
} from './worldDevelopmentPresentationHelpers.js';
import { resolveMonthlyBudgetRange } from '../../../shared/worldDevelopmentMetadata.js';

type WorldRow = CampaignWorldEventSuggestion & {
  primaryOrg: Pick<WikiPage, 'id' | 'title'> | null;
};

const worldInclude = {
  primaryOrg: { select: { ...wikiPageHrefSelect } },
} as const;

function worldRowToPending(
  row: WorldRow,
  campaignHandle: string,
  canResolve: boolean,
): PendingDevelopmentRow {
  const payload = normalizeDevelopmentPayload(row.developmentPayload);
  const kind = normalizeWorldEventSuggestionKind(row.kind) ?? 'faction_pressure';
  return {
    id: row.id,
    source: 'world_event',
    status: 'pending',
    title: row.title,
    narrative: row.narrative,
    scopeLabel: row.primaryOrg?.title ?? null,
    scopeHref: row.primaryOrg ? buildWikiPageHref(campaignHandle, row.primaryOrg) : null,
    occurredAtEpochMinute: row.occurredAtEpochMinute.toString(),
    kindLabel: kind === 'era_trend' ? 'Regional shift' : 'Faction development',
    rationale: payload?.rationale ?? [],
    confidence: payload?.confidence ?? null,
    proposedAcceptTarget: payload?.proposedAcceptTarget ?? 'calendar_event',
    parentSuggestionId: row.parentSuggestionId,
    chainStage: payload?.chainStage ?? null,
    chainStageLabel: payload?.chainStageLabel ?? null,
    canResolve,
  };
}

function reputationToPending(
  row: Awaited<ReturnType<typeof listPendingReputationSuggestions>>[number],
): PendingDevelopmentRow {
  const rationale: DevelopmentRationaleLine[] = [
    {
      kind: 'pressure',
      text: row.narrative ?? row.title,
    },
  ];
  return {
    id: row.id,
    source: 'reputation',
    status: 'pending',
    title: row.title,
    narrative: row.narrative,
    scopeLabel: row.factionTitle,
    scopeHref: row.factionHref,
    occurredAtEpochMinute: row.occurredAtEpochMinute,
    kindLabel: `Reputation — ${row.kind}`,
    rationale,
    confidence: 'medium',
    proposedAcceptTarget: row.kind === 'rumor_spread' ? 'rumor' : 'faction_change',
    parentSuggestionId: null,
    chainStage: null,
    chainStageLabel: null,
    canResolve: row.canResolve,
  };
}

export async function buildPendingDevelopmentsPresentation(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
): Promise<WorldDevelopmentPresentation> {
  await markStalePendingDevelopments(campaignId);

  const settings = await resolveWorldDevelopmentSettings(campaignId);
  const canResolve = canManageWorldEventSuggestions(role);

  const [worldRows, reputationRows] = await Promise.all([
    prisma.campaignWorldEventSuggestion.findMany({
      where: { campaignId, status: 'pending' },
      include: worldInclude,
      orderBy: [{ occurredAtEpochMinute: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    listPendingReputationSuggestions(campaignId, campaignHandle, role, { limit: 50 }),
  ]);

  const pending: PendingDevelopmentRow[] = [
    ...worldRows.map((row) => worldRowToPending(row, campaignHandle, canResolve)),
    ...reputationRows.map(reputationToPending),
  ].sort((a, b) => Number(BigInt(b.occurredAtEpochMinute) - BigInt(a.occurredAtEpochMinute)));

  const pendingCount = pending.length;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });

  const generatedThisCampaignMonth = await countGeneratedThisCampaignMonth(
    campaignId,
    campaign?.currentEpochMinute ?? null,
  );

  const { max: budgetMax } = resolveMonthlyBudgetRange(settings);

  const status = buildWorldDevelopmentStatusSummary({
    settings,
    pendingCount,
    generatedThisCampaignMonth,
  });

  const readiness = await buildWorldDevelopmentReadiness({
    campaignId,
    settings,
    generatedThisCampaignMonth,
    budgetMax,
  });

  return {
    settings: {
      mode: settings.mode,
      enabled: isWorldDevelopmentEnabled(settings),
      paused: settings.worldPressurePaused === true,
    },
    status,
    readiness,
    pending,
    pendingCount,
  };
}

export async function listDevelopmentHistory(
  campaignId: string,
  campaignHandle: string,
  options: {
    status?: WorldEventSuggestionTerminalStatus | WorldEventSuggestionTerminalStatus[];
    q?: string;
    from?: string;
    to?: string;
    limit?: number;
  },
): Promise<DevelopmentHistoryRow[]> {
  const statuses = options.status
    ? Array.isArray(options.status)
      ? options.status
      : [options.status]
    : (['accepted', 'dismissed', 'archived', 'obsolete'] as WorldEventSuggestionTerminalStatus[]);

  const where: Prisma.CampaignWorldEventSuggestionWhereInput = {
    campaignId,
    status: { in: statuses },
  };

  if (options.from || options.to) {
    where.resolvedAt = {};
    if (options.from) where.resolvedAt.gte = new Date(options.from);
    if (options.to) where.resolvedAt.lte = new Date(options.to);
  }

  if (options.q?.trim()) {
    where.OR = [
      { title: { contains: options.q.trim() } },
      { narrative: { contains: options.q.trim() } },
    ];
  }

  const rows = await prisma.campaignWorldEventSuggestion.findMany({
    where,
    include: worldInclude,
    orderBy: [{ resolvedAt: 'desc' }, { createdAt: 'desc' }],
    take: options.limit ?? 100,
  });

  return rows.map((row) => {
    const status = normalizeWorldEventSuggestionStatus(row.status) as WorldEventSuggestionTerminalStatus;
    const payload = normalizeDevelopmentPayload(row.developmentPayload);
    return {
      id: row.id,
      source: 'world_event' as const,
      status,
      statusLabel: HISTORY_STATUS_FILTER_LABELS[status],
      title: row.title,
      narrative: row.narrative,
      scopeLabel: row.primaryOrg?.title ?? null,
      occurredAtEpochMinute: row.occurredAtEpochMinute.toString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      rationale: payload?.rationale ?? [],
      obsoleteReason: payload?.obsoleteReason ?? null,
      acceptedEventHref: row.acceptedCalendarEventId
        ? `/campaigns/${campaignHandle}/${eventLorePageIdForCalendarEvent(row.acceptedCalendarEventId)}`
        : null,
      resolvedBy: payload?.resolvedBy ?? null,
      resultSummary: payload?.resultSummary ?? null,
    };
  });
}

export async function countPendingDevelopments(campaignId: string): Promise<number> {
  const [world, reputation] = await Promise.all([
    prisma.campaignWorldEventSuggestion.count({
      where: { campaignId, status: 'pending' },
    }),
    prisma.campaignReputationSuggestion.count({
      where: { campaignId, status: 'pending' },
    }),
  ]);
  return world + reputation;
}

export async function countPendingDevelopmentsWhenEnabled(
  campaignId: string,
): Promise<number> {
  const settings = await resolveWorldDevelopmentSettings(campaignId);
  if (settings.mode === 'off') {
    return 0;
  }
  return countPendingDevelopments(campaignId);
}
