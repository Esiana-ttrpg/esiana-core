import type {
  CampaignReputationEvent,
  CampaignReputationSuggestion,
  DowntimeProject,
  Prisma,
  WikiPage,
} from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import {
  normalizeReputationNarrative,
  normalizeReputationSuggestionStatus,
  parseCampaignReputationState,
  serializeCampaignReputationState,
  CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
  type ReputationSuggestionCore,
} from '../../../shared/reputationMetadata.js';
import { ensureCampaignReputation } from './reputationSimulationService.js';
import { applyCanonicalWorldEffect } from './canonicalWorldEffect.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';

type SuggestionRow = CampaignReputationSuggestion & {
  factionWiki: Pick<WikiPage, 'id' | 'title'>;
  project: (DowntimeProject & { wikiPage: Pick<WikiPage, 'id' | 'title'> }) | null;
  havenWiki: Pick<WikiPage, 'id' | 'title'> | null;
};

const suggestionInclude = {
  factionWiki: { select: { ...wikiPageHrefSelect } },
  project: {
    include: { wikiPage: { select: { ...wikiPageHrefSelect } } },
  },
  havenWiki: { select: { ...wikiPageHrefSelect } },
} as const;

export function canManageReputationSuggestions(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  );
}

function rowToSuggestionDetail(
  row: SuggestionRow,
  campaignHandle: string,
  canResolve: boolean,
): ReputationSuggestionCore & {
  factionTitle: string;
  factionHref: string;
  projectTitle: string | null;
  havenTitle: string | null;
  projectHref: string | null;
  havenHref: string | null;
  canResolve: boolean;
} {
  const factionHref = buildWikiPageHref(campaignHandle, row.factionWiki);
  const projectHref = row.project
    ? buildWikiPageHref(campaignHandle, row.project.wikiPage)
    : null;
  const havenHref = row.havenWiki
    ? buildWikiPageHref(campaignHandle, row.havenWiki)
    : null;

  return {
    id: row.id,
    status: normalizeReputationSuggestionStatus(row.status),
    kind: row.kind as ReputationSuggestionCore['kind'],
    factionPageId: row.factionPageId,
    axis: row.axis as ReputationSuggestionCore['axis'],
    direction: row.direction as ReputationSuggestionCore['direction'],
    fromBand: row.fromBand,
    toBand: row.toBand,
    title: row.title,
    narrative: row.narrative,
    occurredAtEpochMinute: row.occurredAtEpochMinute.toString(),
    sourceType: row.sourceType as ReputationSuggestionCore['sourceType'],
    sourceRef: row.sourceRef,
    idempotencyKey: row.idempotencyKey,
    projectId: row.projectId,
    havenWikiPageId: row.havenWikiPageId,
    claimId: row.claimId,
    targetOrgPageId: row.targetOrgPageId,
    proposedTrust: row.proposedTrust,
    proposedNotoriety: row.proposedNotoriety,
    resolvedByUserId: row.resolvedByUserId,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    factionTitle: row.factionWiki.title,
    factionHref,
    projectTitle: row.project?.wikiPage.title ?? null,
    havenTitle: row.havenWiki?.title ?? null,
    projectHref,
    havenHref,
    canResolve,
  };
}

export async function listPendingReputationSuggestions(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  options?: { limit?: number },
) {
  const limit = options?.limit ?? 50;
  const canResolve = canManageReputationSuggestions(role);

  const rows = await prisma.campaignReputationSuggestion.findMany({
    where: { campaignId, status: 'pending' },
    include: suggestionInclude,
    orderBy: [{ occurredAtEpochMinute: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return rows.map((row) => rowToSuggestionDetail(row, campaignHandle, canResolve));
}

export async function countPendingReputationSuggestions(campaignId: string): Promise<number> {
  return prisma.campaignReputationSuggestion.count({
    where: { campaignId, status: 'pending' },
  });
}

export type AcceptReputationSuggestionInput = {
  suggestionId: string;
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  userId: string;
  narrative?: string | null;
};

export async function acceptReputationSuggestion(
  input: AcceptReputationSuggestionInput,
): Promise<{ suggestion: ReturnType<typeof rowToSuggestionDetail>; eventId: string }> {
  if (!canManageReputationSuggestions(input.role)) {
    throw new Error('Forbidden');
  }

  const suggestion = await prisma.campaignReputationSuggestion.findFirst({
    where: { id: input.suggestionId, campaignId: input.campaignId },
    include: suggestionInclude,
  });
  if (!suggestion) {
    throw new Error('Suggestion not found.');
  }
  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion is no longer pending.');
  }

  const narrative =
    input.narrative !== undefined
      ? normalizeReputationNarrative(input.narrative)
      : suggestion.narrative;

  const result = await prisma.$transaction(async (tx) => {
    const reputation = await ensureCampaignReputation(input.campaignId, tx);
    const state = parseCampaignReputationState(reputation.simulationState);
    const existing = state.factions[suggestion.factionPageId] ?? {
      trust: 50,
      notoriety: 50,
      lastSimulatedAtEpochMinute: null,
    };

    const nextTrust = suggestion.proposedTrust ?? existing.trust;
    const nextNotoriety = suggestion.proposedNotoriety ?? existing.notoriety;

    await tx.campaignReputation.update({
      where: { id: reputation.id },
      data: {
        simulationState: serializeCampaignReputationState({
          version: CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
          factions: {
            ...state.factions,
            [suggestion.factionPageId]: {
              trust: nextTrust,
              notoriety: nextNotoriety,
              lastSimulatedAtEpochMinute: suggestion.occurredAtEpochMinute.toString(),
            },
          },
        }) as Prisma.InputJsonValue,
      },
    });

    const eventKind =
      suggestion.kind === 'investigation'
        ? 'investigation'
        : suggestion.kind === 'rumor_spread'
          ? 'rumor_spread'
          : 'band_crossing';

    const event = await tx.campaignReputationEvent.create({
      data: {
        campaignId: input.campaignId,
        reputationId: reputation.id,
        factionPageId: suggestion.factionPageId,
        eventKind,
        axis: suggestion.axis,
        direction: suggestion.direction,
        fromBand: suggestion.fromBand,
        toBand: suggestion.toBand,
        title: suggestion.title,
        narrative,
        occurredAtEpochMinute: suggestion.occurredAtEpochMinute,
        sourceType: suggestion.sourceType,
        sourceRef: suggestion.sourceRef,
        projectId: suggestion.projectId,
        havenWikiPageId: suggestion.havenWikiPageId,
      },
    });

    const updated = await tx.campaignReputationSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'accepted',
        acceptedEventId: event.id,
        resolvedByUserId: input.userId,
        resolvedAt: new Date(),
        ...(input.narrative !== undefined ? { narrative } : {}),
      },
      include: suggestionInclude,
    });

    if (suggestion.kind === 'rumor_spread' && suggestion.claimId) {
      const [effectiveDate, campaign] = await Promise.all([
        resolveCampaignChronologyNow(input.campaignId),
        tx.campaign.findUnique({
          where: { id: input.campaignId },
          select: { currentEpochMinute: true },
        }),
      ]);
      await applyCanonicalWorldEffect(
        {
          type: 'circulate_rumor',
          claimId: suggestion.claimId,
          targetOrgPageId: suggestion.targetOrgPageId ?? suggestion.factionPageId,
          visibility: 'PARTY',
        },
        {
          campaignId: input.campaignId,
          actorUserId: input.userId,
          canManage: true,
          atEpochMinute: (campaign?.currentEpochMinute ?? 0n).toString(),
          effectiveDate,
        },
        tx,
      );
    }

    return { updated, event };
  });

  return {
    suggestion: rowToSuggestionDetail(result.updated, input.campaignHandle, false),
    eventId: result.event.id,
  };
}

export async function dismissReputationSuggestion(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string,
  suggestionId: string,
) {
  if (!canManageReputationSuggestions(role)) {
    throw new Error('Forbidden');
  }

  const suggestion = await prisma.campaignReputationSuggestion.findFirst({
    where: { id: suggestionId, campaignId },
    include: suggestionInclude,
  });
  if (!suggestion) {
    throw new Error('Suggestion not found.');
  }
  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion is no longer pending.');
  }

  const updated = await prisma.campaignReputationSuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: 'dismissed',
      resolvedByUserId: userId,
      resolvedAt: new Date(),
    },
    include: suggestionInclude,
  });

  return rowToSuggestionDetail(updated, campaignHandle, false);
}
