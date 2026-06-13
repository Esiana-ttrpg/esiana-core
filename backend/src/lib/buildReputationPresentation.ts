import type { FantasyCalendar } from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { buildCalendarStates } from './timeTracking.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import {
  DOWNTIME_PLACEHOLDER_FRAMING,
  type DowntimeFeedCardTone,
  type DowntimeHubReputationPayload,
  type ReputationFeedLine,
  type ReputationStandingCard,
  type ReputationSuggestionLine,
} from '../../../shared/downtimeHub.js';
import {
  formatReputationDirectionArrow,
  parseCampaignReputationState,
} from '../../../shared/reputationMetadata.js';
import { formatReputationAxisBand } from '../../../shared/reputationSimulation.js';
import {
  countPendingReputationSuggestions,
  listPendingReputationSuggestions,
} from './reputationSuggestionService.js';
import { ensureCampaignReputation } from './reputationSimulationService.js';
import { prisma } from './prisma.js';

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

function toneForDirection(
  direction: string,
  axis: string,
): DowntimeFeedCardTone | undefined {
  if (direction === 'down' && axis === 'trust') return 'warning';
  if (direction === 'down' && axis === 'notoriety') return 'warning';
  if (direction === 'up' && axis === 'notoriety') return 'escalation';
  return 'neutral';
}

async function loadMasterCalendar(campaignId: string): Promise<FantasyCalendar | null> {
  const calendars = await prisma.fantasyCalendar.findMany({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
  });
  return calendars.find((calendar) => calendar.isMasterTime) ?? calendars[0] ?? null;
}

export async function buildReputationHubPayload(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
): Promise<DowntimeHubReputationPayload> {
  const reputation = await ensureCampaignReputation(campaignId);
  const state = parseCampaignReputationState(reputation.simulationState);
  const masterCalendar = await loadMasterCalendar(campaignId);

  const factionPageIds = Object.keys(state.factions);
  const factionPages = new Map<
    string,
    { id: string; title: string; parentId: string | null; templateType: string; workspace: string | null; pathKey: string | null; metadata: unknown }
  >();
  if (factionPageIds.length > 0) {
    const pages = await prisma.wikiPage.findMany({
      where: { campaignId, id: { in: factionPageIds }, deletedAt: null },
      select: wikiPageHrefSelect,
    });
    for (const page of pages) {
      factionPages.set(page.id, page);
    }
  }

  const standings = factionPageIds
    .map((factionPageId): ReputationStandingCard | null => {
      const scores = state.factions[factionPageId];
      if (!scores) return null;
      const factionPage = factionPages.get(factionPageId);
      const trustBand = formatReputationAxisBand('trust', scores.trust);
      const notorietyBand = formatReputationAxisBand('notoriety', scores.notoriety);
      return {
        factionPageId,
        factionTitle: factionPage?.title ?? 'Unknown faction',
        factionHref: String(
          factionPage
            ? buildWikiPageHref(campaignHandle, factionPage)
            : buildWikiPageHref(campaignHandle, factionPageId),
        ),
        trustBand: trustBand.bandLabel,
        notorietyBand: notorietyBand.bandLabel,
        trustTone: trustBand.tone,
        notorietyTone: notorietyBand.tone,
      };
    })
    .filter((card): card is ReputationStandingCard => card !== null)
    .sort((a, b) => a.factionTitle.localeCompare(b.factionTitle));

  const eventRows = await prisma.campaignReputationEvent.findMany({
    where: { campaignId },
    include: { factionWiki: { select: { ...wikiPageHrefSelect } } },
    orderBy: [{ occurredAtEpochMinute: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  const feed: ReputationFeedLine[] = eventRows.map((row) => ({
    id: row.id,
    factionTitle: row.factionWiki.title,
    factionHref: buildWikiPageHref(campaignHandle, row.factionWiki),
    direction: row.direction as ReputationFeedLine['direction'],
    bandLabel: row.toBand ?? row.title,
    axis: row.axis as ReputationFeedLine['axis'],
    narrative: row.narrative ?? '',
    dateLabel: formatEpochMinuteLabel(row.occurredAtEpochMinute, masterCalendar),
    tone: toneForDirection(row.direction, row.axis),
    directionArrow: formatReputationDirectionArrow(
      row.direction as ReputationFeedLine['direction'],
    ),
  }));

  const pendingDetails = await listPendingReputationSuggestions(
    campaignId,
    campaignHandle,
    role,
    { limit: 20 },
  );

  const pendingSuggestions: ReputationSuggestionLine[] = pendingDetails.map((s) => ({
    id: s.id,
    kind: s.kind,
    factionTitle: s.factionTitle,
    factionHref: s.factionHref,
    axis: s.axis,
    direction: s.direction,
    fromBand: s.fromBand,
    toBand: s.toBand,
    title: s.title,
    narrative: s.narrative,
    directionArrow: formatReputationDirectionArrow(s.direction),
    projectHref: s.projectHref,
    havenHref: s.havenHref,
    canResolve: s.canResolve,
  }));

  const pendingSuggestionsCount = await countPendingReputationSuggestions(campaignId);

  return {
    standings,
    feed,
    pendingSuggestions,
    pendingSuggestionsCount,
    framing: DOWNTIME_PLACEHOLDER_FRAMING.reputation,
  };
}
