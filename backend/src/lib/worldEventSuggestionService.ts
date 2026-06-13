import type { CampaignWorldEventSuggestion, Prisma, WikiPage } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import {
  formatMomentumStateLabel,
  formatWorldEventSuggestionKindLabel,
  normalizeWorldEventSuggestionKind,
  normalizeWorldEventSuggestionStatus,
  RECENT_SIMILAR_SUGGESTION_WINDOW_MINUTES,
  type TrendDirection,
  type WorldEventSuggestionCore,
} from '../../../shared/worldEventSuggestionMetadata.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { eventLorePageIdForCalendarEvent } from './eventLoreStub.js';

export const WORLD_EVENT_PROMPTS_HANDLER_VERSION = 'world-event-prompts-v1';

type SuggestionRow = CampaignWorldEventSuggestion & {
  primaryOrg: Pick<WikiPage, 'id' | 'title'> | null;
};

const suggestionInclude = {
  primaryOrg: { select: { ...wikiPageHrefSelect } },
} as const;

export function canManageWorldEventSuggestions(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function rowToSuggestionDetail(
  row: SuggestionRow,
  campaignHandle: string,
  canResolve: boolean,
): WorldEventSuggestionCore & {
  orgTitle: string | null;
  orgHref: string | null;
  kindLabel: string;
  momentumLabel: string | null;
  canResolve: boolean;
  acceptedEventHref: string | null;
} {
  const kind = normalizeWorldEventSuggestionKind(row.kind) ?? 'faction_pressure';
  const orgHref = row.primaryOrg
    ? buildWikiPageHref(campaignHandle, row.primaryOrg)
    : null;
  const acceptedEventHref = row.acceptedCalendarEventId
    ? `/campaigns/${campaignHandle}/${eventLorePageIdForCalendarEvent(row.acceptedCalendarEventId)}`
    : null;

  return {
    id: row.id,
    status: normalizeWorldEventSuggestionStatus(row.status),
    kind,
    title: row.title,
    narrative: row.narrative,
    occurredAtEpochMinute: row.occurredAtEpochMinute.toString(),
    sourceType: row.sourceType as WorldEventSuggestionCore['sourceType'],
    sourceRef: row.sourceRef,
    idempotencyKey: row.idempotencyKey,
    primaryOrgPageId: row.primaryOrgPageId,
    eraId: row.eraId,
    momentumState: row.momentumState,
    trendDirection: (row.trendDirection as TrendDirection | null) ?? null,
    acceptedCalendarEventId: row.acceptedCalendarEventId,
    resolvedByUserId: row.resolvedByUserId,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    orgTitle: row.primaryOrg?.title ?? null,
    orgHref,
    kindLabel: formatWorldEventSuggestionKindLabel(kind),
    momentumLabel: formatMomentumStateLabel(row.momentumState),
    canResolve,
    acceptedEventHref,
  };
}

export async function listPendingWorldEventSuggestions(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  options?: { limit?: number },
) {
  const limit = options?.limit ?? 50;
  const canResolve = canManageWorldEventSuggestions(role);

  const rows = await prisma.campaignWorldEventSuggestion.findMany({
    where: { campaignId, status: 'pending' },
    include: suggestionInclude,
    orderBy: [{ occurredAtEpochMinute: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return rows.map((row) => rowToSuggestionDetail(row, campaignHandle, canResolve));
}

export async function countPendingWorldEventSuggestions(campaignId: string): Promise<number> {
  return prisma.campaignWorldEventSuggestion.count({
    where: { campaignId, status: 'pending' },
  });
}

async function resolveMasterCalendarId(
  db: Prisma.TransactionClient | typeof prisma,
  campaignId: string,
): Promise<string | null> {
  const cal = await db.fantasyCalendar.findFirst({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
    select: { id: true },
  });
  return cal?.id ?? null;
}

export async function hasRecentSimilarSuggestion(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    nextEpochMinute: string;
    primaryOrgPageId?: string | null;
    momentumState?: string | null;
    eraId?: string | null;
    trendDirection?: string | null;
    kind: 'faction_pressure' | 'era_trend';
  },
): Promise<boolean> {
  const windowStart = BigInt(input.nextEpochMinute) - BigInt(RECENT_SIMILAR_SUGGESTION_WINDOW_MINUTES);

  if (input.kind === 'faction_pressure') {
    if (!input.primaryOrgPageId || !input.momentumState) return false;
    const existing = await tx.campaignWorldEventSuggestion.findFirst({
      where: {
        campaignId: input.campaignId,
        status: { in: ['pending', 'accepted'] },
        primaryOrgPageId: input.primaryOrgPageId,
        momentumState: input.momentumState,
        occurredAtEpochMinute: { gte: windowStart },
      },
      select: { id: true },
    });
    return existing != null;
  }

  if (!input.eraId || !input.trendDirection) return false;
  const existing = await tx.campaignWorldEventSuggestion.findFirst({
    where: {
      campaignId: input.campaignId,
      status: { in: ['pending', 'accepted'] },
      kind: 'era_trend',
      eraId: input.eraId,
      trendDirection: input.trendDirection,
      occurredAtEpochMinute: { gte: windowStart },
    },
    select: { id: true },
  });
  return existing != null;
}

export const WORLD_PRESSURE_PAUSED_HOOK_SUMMARY =
  'World pressure forecasting paused';

export type EmitWorldEventSuggestionsResult = {
  entitiesScanned: number;
  suggestionsCreated: number;
  paused?: boolean;
};

export async function emitWorldEventSuggestions(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<EmitWorldEventSuggestionsResult> {
  const { emitWorldDevelopments } = await import('./worldDevelopmentEngine.js');
  const result = await emitWorldDevelopments(tx, context);
  if (result.disabled) {
    return {
      entitiesScanned: 0,
      suggestionsCreated: 0,
      paused: result.paused === true,
    };
  }
  return {
    entitiesScanned: result.entitiesScanned,
    suggestionsCreated: result.suggestionsCreated,
    paused: result.paused,
  };
}

export type AcceptWorldEventSuggestionInput = {
  suggestionId: string;
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  userId: string;
  title?: string | null;
  narrative?: string | null;
};

export async function acceptWorldEventSuggestion(
  input: AcceptWorldEventSuggestionInput,
): Promise<{
  suggestion: ReturnType<typeof rowToSuggestionDetail>;
  calendarEventId: string;
  lorePageId: string;
}> {
  const { resolveWorldDevelopmentSuggestion } = await import(
    './worldDevelopmentResolveService.js'
  );
  const result = await resolveWorldDevelopmentSuggestion({
    suggestionId: input.suggestionId,
    campaignId: input.campaignId,
    campaignHandle: input.campaignHandle,
    role: input.role,
    userId: input.userId,
    action: 'accept',
    acceptTarget: 'calendar_event',
    title: input.title,
    narrative: input.narrative,
  });

  const updated = await prisma.campaignWorldEventSuggestion.findFirst({
    where: { id: result.suggestionId, campaignId: input.campaignId },
    include: suggestionInclude,
  });
  if (!updated) {
    throw new Error('Suggestion not found.');
  }

  return {
    suggestion: rowToSuggestionDetail(updated, input.campaignHandle, false),
    calendarEventId: result.calendarEventId!,
    lorePageId: result.lorePageId!,
  };
}

export async function dismissWorldEventSuggestion(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string,
  suggestionId: string,
) {
  const { resolveWorldDevelopmentSuggestion } = await import(
    './worldDevelopmentResolveService.js'
  );
  await resolveWorldDevelopmentSuggestion({
    suggestionId,
    campaignId,
    campaignHandle,
    role,
    userId,
    action: 'dismiss',
  });

  const updated = await prisma.campaignWorldEventSuggestion.findFirst({
    where: { id: suggestionId, campaignId },
    include: suggestionInclude,
  });
  if (!updated) {
    throw new Error('Suggestion not found.');
  }
  return rowToSuggestionDetail(updated, campaignHandle, false);
}
