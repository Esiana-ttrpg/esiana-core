import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
import { ChronologyDomainKind } from '../../../shared/chronologyDomainKinds.js';
import {
  formatConvergenceEntrySummary,
  formatConvergenceFeedTitle,
} from '../../../shared/convergenceFeedDisplay.js';
import type { CreativeDriftScanResult } from '../../../shared/creativeDrift.js';
import { sortDowntimePressureFeedCards } from '../../../shared/downtimeContinuityIntegration.js';
import type {
  DowntimeCurrentPeriod,
  DowntimeFeedCard,
  DowntimeFeedCardTone,
  DowntimeHubWorldEventsPayload,
  DowntimeHubOverviewPayload,
  DowntimeHubLedgerPayload,
  DowntimeHubReputationPayload,
  DowntimeHavenSituationCard,
  DowntimeOverviewActivity,
  DowntimePressureCounts,
  DowntimeProjectOperationCard,
  DowntimeProjectOverviewLink,
  DowntimeProjectOverviewPayload,
  DowntimePulse,
  DowntimeSimulationSnapshot,
  LedgerSuggestionLine,
} from '../../../shared/downtimeHub.js';
import {
  buildScheduledTreasuryPulseBullets,
  type ScheduledTreasuryPulseHint,
} from '../../../shared/scheduledEffectMetadata.js';
import type { DowntimeProjectDetail } from '../../../shared/projectMetadata.js';
import {
  buildProjectBlockersSummary,
  buildProjectRequiresSummary,
  canProjectProgress,
  formatOperationPostureLabel,
  formatProjectRemainingLabel,
  formatProjectStalledLabel,
  parseDowntimeProjectFields,
  parseOperationPostureFromWikiMetadata,
  resolveProjectClockState,
} from '../../../shared/projectMetadata.js';
import { formatRelativeEpochLabel } from '../../../shared/relativeEpochLabel.js';
import { pickFactionPressureHint as pickWorldPressureHint } from '../../../shared/worldPressureProjection.js';
import type { WorldPressureProjection } from '../../../shared/worldPressureProjection.js';
import type { DashboardChronometerSummary } from './buildDashboardChronometer.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { prisma } from './prisma.js';
import { listPendingLedgerSuggestions } from './ledgerSuggestionService.js';
import type { CampaignMemberRole } from '../types/domain.js';
import type { CampaignLedgerSuggestionDetail } from './ledgerMetadata.js';

const MINUTES_PER_DAY = 1440n;

function extractLoreMarkdown(blocks: unknown): string | null {
  if (!Array.isArray(blocks)) return null;
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const record = block as Record<string, unknown>;
    if (record.type !== 'text-tiptap') continue;
    const data = record.data;
    if (!data || typeof data !== 'object') continue;
    const markdown = (data as Record<string, unknown>).markdown;
    if (typeof markdown === 'string' && markdown.trim()) {
      return markdown.trim();
    }
  }
  return null;
}

async function hydrateProjectPageLink(
  campaignId: string,
  campaignHandle: string,
  pageId: string | null,
): Promise<DowntimeProjectOverviewLink | null> {
  if (!pageId) return null;
  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId, deletedAt: null },
    select: { id: true, title: true, workspace: true, pathKey: true },
  });
  if (!page) return null;
  return {
    pageId: page.id,
    label: page.title,
    href: buildWikiPageHref(campaignHandle, page),
  };
}

function suggestionToLedgerLine(suggestion: CampaignLedgerSuggestionDetail): LedgerSuggestionLine {
  return {
    id: suggestion.id,
    title: suggestion.title,
    amountLabel: suggestion.amountLabel,
    narrative: suggestion.narrative,
    category: suggestion.category,
    categoryLabel: suggestion.categoryLabel,
    entryKind: suggestion.entryKind,
    amount: suggestion.amount,
    confidence: suggestion.confidence,
    sourceType: suggestion.sourceType,
    projectId: suggestion.projectId,
    havenWikiPageId: suggestion.havenWikiPageId,
    projectHref: suggestion.projectHref,
    havenHref: suggestion.havenHref,
    canResolve: suggestion.canResolve,
  };
}

export async function buildProjectOverviewPayload(input: {
  project: DowntimeProjectDetail;
  wikiMetadata: unknown;
  blocks: unknown;
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
}): Promise<DowntimeProjectOverviewPayload> {
  const { project, wikiMetadata, blocks, campaignId, campaignHandle, role } = input;
  const cards = buildDowntimeProjectOperationCards([{ project, wikiMetadata }]);
  const operation = cards[0];
  if (!operation) {
    throw new Error('Failed to build project operation card.');
  }

  const [owner, haven, pendingSuggestions] = await Promise.all([
    hydrateProjectPageLink(campaignId, campaignHandle, project.ownerPageId),
    hydrateProjectPageLink(campaignId, campaignHandle, project.havenPageId),
    listPendingLedgerSuggestions(campaignId, campaignHandle, role, { limit: 20 }),
  ]);

  const projectSuggestions = pendingSuggestions
    .filter((s) => s.projectId === project.id)
    .map(suggestionToLedgerLine);

  return {
    projectId: project.id,
    wikiPageId: project.wikiPageId,
    title: project.title,
    operation,
    resources: project.resources,
    blockers: project.blockers,
    outcomes: project.outcomes,
    owner,
    haven,
    loreMarkdown: extractLoreMarkdown(blocks),
    recentChanges: [],
    pendingTreasurySuggestions:
      projectSuggestions.length > 0 ? projectSuggestions : undefined,
  };
}

const DOWNTIME_OVERVIEW_DOMAINS = [
  ChronologyDomainKind.WORLD_EVENT,
  ChronologyDomainKind.WORLD_ADVANCE,
  ChronologyDomainKind.ORG_RELATION,
  ChronologyDomainKind.FACTION_CONTROL,
] as const;

const DOWNTIME_WORLD_EVENT_DOMAINS = [...DOWNTIME_OVERVIEW_DOMAINS];

function toneForEntry(entry: ConvergenceTimelineEntry): DowntimeFeedCardTone {
  if (entry.domain === ChronologyDomainKind.WORLD_ADVANCE) return 'warning';
  if (entry.domain === ChronologyDomainKind.FACTION_CONTROL) return 'escalation';
  if (entry.domain === ChronologyDomainKind.ORG_RELATION) return 'warning';
  return 'neutral';
}

export function adaptConvergenceEntryToFeedCard(
  entry: ConvergenceTimelineEntry,
): DowntimeFeedCard {
  const summary =
    formatConvergenceEntrySummary({
      title: entry.display.title,
      summary: entry.display.summary,
    }) ??
    entry.display.summary?.trim() ??
    'Something shifted in the wider world.';

  const primaryLink = entry.links[0];

  return {
    id: entry.entryId,
    title: formatConvergenceFeedTitle(entry.display.title),
    summary,
    dateLabel: entry.display.dateLabel ?? 'Undated',
    tone: toneForEntry(entry),
    href: primaryLink?.path,
  };
}

export function adaptVisibleFeedCards(
  entries: ConvergenceTimelineEntry[],
  limit?: number,
): DowntimeFeedCard[] {
  const visible = entries.filter((entry) => entry.projection.visible);
  const slice = limit != null ? visible.slice(0, limit) : visible;
  return slice.map(adaptConvergenceEntryToFeedCard);
}

export function adaptConvergenceEntryToNarrativeFeedCard(
  entry: ConvergenceTimelineEntry,
  currentEpochMinute: bigint,
): DowntimeFeedCard {
  const base = adaptConvergenceEntryToFeedCard(entry);
  const narrative =
    formatConvergenceEntrySummary({
      title: entry.display.title,
      summary: entry.display.summary,
    })?.trim() || base.title;

  const calendarLabel = entry.display.dateLabel?.trim() || undefined;
  const relativeLabel = formatRelativeEpochLabel(
    entry.instant.epochMinute,
    currentEpochMinute,
  );

  return {
    ...base,
    relativeDateLabel: relativeLabel ?? calendarLabel,
    calendarDateLabel: relativeLabel ? calendarLabel : undefined,
    narrative,
  };
}

export function adaptVisibleNarrativeFeedCards(
  entries: ConvergenceTimelineEntry[],
  currentEpochMinute: bigint,
  limit?: number,
): DowntimeFeedCard[] {
  const visible = entries.filter((entry) => entry.projection.visible);
  const newestFirst = [...visible].reverse();
  const slice = limit != null ? newestFirst.slice(0, limit) : newestFirst;
  return slice.map((entry) =>
    adaptConvergenceEntryToNarrativeFeedCard(entry, currentEpochMinute),
  );
}

function formatElapsedDays(days: bigint): string {
  if (days <= 0n) return 'Less than a day has passed since the last milestone.';
  if (days === 1n) return '1 day since the last milestone.';
  return `${days.toString()} days since the last milestone.`;
}

function computeElapsedDays(
  currentEpochMinute: bigint,
  sinceEpochMinute: bigint | null,
): bigint | null {
  if (sinceEpochMinute == null) return null;
  const diff = currentEpochMinute - sinceEpochMinute;
  if (diff <= 0n) return 0n;
  return diff / MINUTES_PER_DAY;
}

export function buildDowntimeCurrentTimePresentation(input: {
  currentEpochMinute: bigint;
  sinceEpochMinute: bigint | null;
  chronometer: DashboardChronometerSummary | null;
}): { currentTimeLabel: string; elapsedSinceLabel: string | null } {
  const elapsedDays = computeElapsedDays(input.currentEpochMinute, input.sinceEpochMinute);
  return {
    currentTimeLabel:
      input.chronometer?.label != null
        ? [input.chronometer.season, input.chronometer.label].filter(Boolean).join(' · ')
        : 'Campaign time not configured',
    elapsedSinceLabel: elapsedDays != null ? formatElapsedDays(elapsedDays) : null,
  };
}

function activityDensityLabel(recentCount: number, elapsedDays: bigint | null): string {
  if (recentCount === 0) {
    if (elapsedDays != null && elapsedDays >= 7n) {
      return 'The world has been quiet.';
    }
    return 'Little has stirred beyond the party\'s immediate horizon.';
  }
  if (recentCount >= 4) {
    return 'The world has been busy while attention was elsewhere.';
  }
  return 'A few ripples have moved through the campaign.';
}

export function buildDowntimePulse(input: {
  elapsedDays: bigint | null;
  recentActivityCount: number;
  creativeDriftActiveCount: number | null;
  continuityPressureCount: number | null;
  havenThreatCount: number | null;
  stalledProjectCount: number | null;
  factionPressureHint: string | null;
  latestWorldAdvanceHeadline: string | null;
  pendingReputationCount?: number;
  pendingEventConsequenceCount?: number;
  pendingQuestTimeCount?: number;
  worldPressure?: WorldPressureProjection | null;
  scheduledTreasuryPulse?: ScheduledTreasuryPulseHint | null;
}): DowntimePulse {
  const { elapsedDays, recentActivityCount } = input;

  let headline: string;
  if (elapsedDays == null) {
    headline = activityDensityLabel(recentActivityCount, null);
  } else if (elapsedDays === 0n) {
    headline = 'Time has barely moved since the last recorded milestone.';
  } else if (elapsedDays === 1n) {
    headline = 'A single day has passed since the last milestone.';
  } else if (recentActivityCount === 0 && elapsedDays >= 7n) {
    headline = `The world has been quiet for ${elapsedDays.toString()} days.`;
  } else if (elapsedDays >= 30n) {
    headline = `${elapsedDays.toString()} days have passed since the last milestone.`;
  } else {
    headline = `${elapsedDays.toString()} days have passed — the world kept moving.`;
  }

  const bullets: string[] = [];

  if (input.latestWorldAdvanceHeadline?.trim()) {
    bullets.push(input.latestWorldAdvanceHeadline.trim());
  } else if (recentActivityCount === 0) {
    bullets.push('No major world events have surfaced in recent chronology.');
  } else {
    bullets.push(
      `${recentActivityCount} recent development${recentActivityCount === 1 ? '' : 's'} recorded in world chronology.`,
    );
  }

  for (const line of buildScheduledTreasuryPulseBullets(
    input.scheduledTreasuryPulse ?? null,
  )) {
    bullets.push(line);
  }

  if (input.pendingReputationCount != null && input.pendingReputationCount > 0) {
    const noun = input.pendingReputationCount === 1 ? 'shift' : 'shifts';
    bullets.push(
      `${input.pendingReputationCount.toString()} reputation ${noun} await review in Downtime.`,
    );
  } else if (input.factionPressureHint?.trim()) {
    bullets.push(input.factionPressureHint.trim());
    const extraTensions = input.worldPressure?.risingTensions ?? [];
    for (const line of extraTensions.slice(1, 3)) {
      bullets.push(`${line.orgTitle} — ${line.momentumLabel}`);
    }
    if (bullets.length < 3 && input.worldPressure?.eraTrends[0]) {
      bullets.push(input.worldPressure.eraTrends[0]);
    }
  } else if (recentActivityCount > 0) {
    bullets.push('Faction and organizational currents may be shifting beneath the surface.');
  } else {
    bullets.push('No major faction movement detected in recent records.');
  }

  if (input.pendingEventConsequenceCount != null && input.pendingEventConsequenceCount > 0) {
    const noun =
      input.pendingEventConsequenceCount === 1 ? 'consequence' : 'consequences';
    bullets.push(
      `${input.pendingEventConsequenceCount.toString()} event ${noun} await review on world events.`,
    );
  }

  if (input.pendingQuestTimeCount != null && input.pendingQuestTimeCount > 0) {
    const noun = input.pendingQuestTimeCount === 1 ? 'deadline' : 'deadlines';
    bullets.push(
      `${input.pendingQuestTimeCount.toString()} quest ${noun} need GM resolution.`,
    );
  }

  if (input.havenThreatCount != null && input.havenThreatCount > 0) {
    const noun = input.havenThreatCount === 1 ? 'threat' : 'threats';
    bullets.push(
      `${input.havenThreatCount.toString()} escalating haven ${noun} need attention.`,
    );
  }

  if (input.stalledProjectCount != null && input.stalledProjectCount > 0) {
    const noun = input.stalledProjectCount === 1 ? 'project' : 'projects';
    bullets.push(
      `${input.stalledProjectCount.toString()} ${noun} stalled beyond expectations.`,
    );
  }

  if (input.continuityPressureCount != null && input.continuityPressureCount > 0) {
    const noun = input.continuityPressureCount === 1 ? 'warning' : 'warnings';
    bullets.push(
      `${input.continuityPressureCount.toString()} narrative ${noun} maturing.`,
    );
  }

  if (input.creativeDriftActiveCount != null && input.creativeDriftActiveCount > 0) {
    const noun = input.creativeDriftActiveCount === 1 ? 'thread' : 'threads';
    bullets.push(
      `${input.creativeDriftActiveCount.toString()} dormant ${noun} may be stirring.`,
    );
  }

  const hasImmediatePressure =
    (input.havenThreatCount ?? 0) > 0 ||
    (input.stalledProjectCount ?? 0) > 0 ||
    (input.pendingQuestTimeCount ?? 0) > 0 ||
    (input.pendingEventConsequenceCount ?? 0) > 0;

  if (!hasImmediatePressure) {
    bullets.push('Nothing flagged as an immediate escalation — for now.');
  }

  return {
    headline,
    bullets: bullets.slice(0, 4),
  };
}

function adaptDriftFindingsToConsequenceCards(
  scan: CreativeDriftScanResult | null,
): DowntimeFeedCard[] {
  if (!scan) return [];

  const cards: DowntimeFeedCard[] = [];
  for (const bucket of scan.buckets) {
    for (const item of bucket.items.slice(0, 3)) {
      cards.push({
        id: item.fingerprint,
        title: item.title,
        summary: item.statusLabel,
        dateLabel: bucket.label,
        tone: item.narrativeWeight === 'critical' ? 'escalation' : 'warning',
        sourceType: 'creative_drift',
        priority: 'ambient',
      });
    }
  }

  return cards.slice(0, 6);
}

function pickFactionPressureHint(entries: ConvergenceTimelineEntry[]): string | null {
  const orgEntry = entries.find(
    (entry) =>
      entry.projection.visible &&
      (entry.domain === ChronologyDomainKind.ORG_RELATION ||
        entry.domain === ChronologyDomainKind.FACTION_CONTROL),
  );
  if (!orgEntry) return null;
  const summary = formatConvergenceEntrySummary({
    title: orgEntry.display.title,
    summary: orgEntry.display.summary,
  });
  return summary ?? orgEntry.display.title;
}

export type BuildDowntimePresentationInput = {
  campaignHandle: string;
  currentEpochMinute: bigint;
  chronometer: DashboardChronometerSummary | null;
  sinceEpochMinute: bigint | null;
  currentDowntimePeriod: DowntimeCurrentPeriod | null;
  overlayEntries: ConvergenceTimelineEntry[];
  creativeDrift: CreativeDriftScanResult | null;
  latestWorldAdvanceHeadline: string | null;
  activeProjectCount?: number;
  havenCount?: number;
  pendingReputationCount?: number;
  eventConsequenceCards?: DowntimeFeedCard[];
  pendingEventConsequenceCount?: number;
  questTimeFeedCards?: DowntimeFeedCard[];
  pendingQuestTimeCount?: number;
  pressureCards?: DowntimeFeedCard[];
  pressureCounts?: DowntimePressureCounts;
  worldPressure?: WorldPressureProjection | null;
  scheduledTreasuryPulse?: ScheduledTreasuryPulseHint | null;
};

export function buildDowntimeSimulationSnapshot(
  input: BuildDowntimePresentationInput,
): DowntimeSimulationSnapshot {
  const elapsedDays = computeElapsedDays(
    input.currentEpochMinute,
    input.sinceEpochMinute,
  );
  const recentWorldActivity = adaptVisibleNarrativeFeedCards(
    input.overlayEntries,
    input.currentEpochMinute,
    5,
  );
  const driftCards = adaptDriftFindingsToConsequenceCards(input.creativeDrift);
  const eventCards = input.eventConsequenceCards ?? [];
  const questTimeCards = input.questTimeFeedCards ?? [];
  const pressureCards = input.pressureCards ?? [];
  const recentConsequences = sortDowntimePressureFeedCards([
    ...pressureCards,
    ...eventCards,
    ...questTimeCards,
    ...driftCards,
  ]).slice(0, 10);
  const creativeDriftActiveCount = input.creativeDrift?.summary.totalActive ?? null;
  const continuityPressureCount = input.pressureCounts?.continuityPressureCount ?? null;
  const havenThreatCount = input.pressureCounts?.havenThreatCount ?? null;
  const stalledProjectCount = input.pressureCounts?.stalledProjectCount ?? null;
  const factionPressureHint =
    input.worldPressure != null
      ? pickWorldPressureHint(input.worldPressure)
      : pickFactionPressureHint(input.overlayEntries);

  const pulse = buildDowntimePulse({
    elapsedDays,
    recentActivityCount: recentWorldActivity.length,
    creativeDriftActiveCount,
    continuityPressureCount,
    havenThreatCount,
    stalledProjectCount,
    factionPressureHint,
    latestWorldAdvanceHeadline: input.latestWorldAdvanceHeadline,
    pendingReputationCount: input.pendingReputationCount,
    pendingEventConsequenceCount: input.pendingEventConsequenceCount,
    pendingQuestTimeCount: input.pendingQuestTimeCount,
    worldPressure: input.worldPressure,
    scheduledTreasuryPulse: input.scheduledTreasuryPulse,
  });

  const currentTimeLabel =
    input.chronometer?.label != null
      ? [input.chronometer.season, input.chronometer.label].filter(Boolean).join(' · ')
      : 'Campaign time not configured';

  const elapsedSinceLabel =
    elapsedDays != null ? formatElapsedDays(elapsedDays) : null;

  return {
    currentTimeLabel,
    elapsedSinceLabel,
    currentDowntimePeriod: input.currentDowntimePeriod,
    pulse,
    recentWorldActivity,
    recentConsequences,
    activeOperationsSummary: {
      projects: {
        count: input.activeProjectCount ?? 0,
        status:
          (input.activeProjectCount ?? 0) > 0
            ? 'active'
            : 'empty',
      },
      havens: {
        count: input.havenCount ?? 0,
        status: (input.havenCount ?? 0) > 0 ? 'active' : 'empty',
      },
    },
    creativeDriftActiveCount,
    continuityPressureCount,
    havenThreatCount,
    stalledProjectCount,
    factionPressureHint,
    worldPressure: input.worldPressure ?? null,
  };
}

export function buildDowntimeWorldEventsPayload(
  campaignHandle: string,
  entries: ConvergenceTimelineEntry[],
  currentEpochMinute: bigint,
  options?: { pendingConsequenceCount?: number },
): DowntimeHubWorldEventsPayload {
  return {
    feed: adaptVisibleNarrativeFeedCards(entries, currentEpochMinute),
    chronologyHref: `/campaigns/${campaignHandle}/chronology?view=feed`,
    pendingConsequenceCount: options?.pendingConsequenceCount,
  };
}

export function buildDowntimeProjectOperationCards(
  entries: Array<{ project: DowntimeProjectDetail; wikiMetadata?: unknown }>,
): DowntimeProjectOperationCard[] {
  return entries.map(({ project, wikiMetadata }) => {
    const fields = parseDowntimeProjectFields({
      status: project.status,
      resources: project.resources,
      blockers: project.blockers,
      durationTotalMinutes: project.durationTotalMinutes,
      durationElapsedMinutes: project.durationElapsedMinutes,
      stalledDurationMinutes: project.stalledDurationMinutes,
    });
    const progressAllowed = canProjectProgress(fields);
    const clockState = resolveProjectClockState(project.status, progressAllowed);
    const elapsed = BigInt(project.durationElapsedMinutes);
    const total = BigInt(project.durationTotalMinutes);
    const stalled = BigInt(project.stalledDurationMinutes);

    let remainingLabel: string | null = null;
    if (project.status === 'COMPLETED' && project.completedAtEpochMinute) {
      remainingLabel = 'Completed';
    } else if (project.status === 'FAILED' || project.status === 'ABANDONED') {
      remainingLabel = project.status === 'FAILED' ? 'Failed' : 'Abandoned';
    } else if (project.status === 'PLANNED') {
      remainingLabel = 'Not yet started';
    } else {
      remainingLabel = formatProjectRemainingLabel(elapsed, total);
    }

    const stalledLabel =
      clockState === 'waiting' || clockState === 'paused'
        ? formatProjectStalledLabel(stalled)
        : null;

    const posture = parseOperationPostureFromWikiMetadata(wikiMetadata);

    return {
      ...project,
      remainingLabel,
      stalledLabel,
      requiresSummary: buildProjectRequiresSummary(project.resources),
      blockersSummary: buildProjectBlockersSummary(project.blockers),
      clockState,
      operationPostureLabel: formatOperationPostureLabel(posture),
    };
  });
}

export type DowntimeOverviewHavenActivity = {
  id: string;
  havenTitle: string;
  havenHref: string;
  summary: string;
  occurredAtEpochMinute: string;
  tone?: DowntimeFeedCardTone;
};

export type BuildDowntimeOverviewPresentationInput = {
  currentEpochMinute: bigint;
  currentTimeLabel: string;
  elapsedSinceLabel: string | null;
  currentDowntimePeriod: DowntimeCurrentPeriod | null;
  projectCards: DowntimeProjectOperationCard[];
  havenCards: DowntimeHavenSituationCard[];
  havenActivity: DowntimeOverviewHavenActivity[];
  ledger: DowntimeHubLedgerPayload;
  reputation: DowntimeHubReputationPayload;
  pendingWorldEventSuggestionsCount: number;
};

const TERMINAL_PROJECT_STATUSES = new Set(['COMPLETED', 'FAILED', 'ABANDONED']);

function overviewProjectRank(card: DowntimeProjectOperationCard): number {
  if (card.clockState === 'running') return 0;
  if (card.clockState === 'waiting') return 1;
  if (card.clockState === 'paused') return 2;
  return 3;
}

function reputationToneRank(tone: DowntimeFeedCardTone): number {
  if (tone === 'escalation') return 0;
  if (tone === 'warning') return 1;
  return 2;
}

function activityDateLabel(epochMinute: string, currentEpochMinute: bigint): string {
  return formatRelativeEpochLabel(epochMinute, currentEpochMinute) ?? `Minute ${epochMinute}`;
}

/** Builds the Downtime sheet read model from canonical domain projections. */
export function buildDowntimeOverviewPresentation(
  input: BuildDowntimeOverviewPresentationInput,
): DowntimeHubOverviewPayload {
  const projectActivities: DowntimeOverviewActivity[] = input.projectCards
    .filter(
      (card) =>
        TERMINAL_PROJECT_STATUSES.has(card.status) && card.completedAtEpochMinute != null,
    )
    .map((card) => ({
      id: `project:${card.id}:${card.completedAtEpochMinute}`,
      source: 'project',
      sourceLabel: 'Project',
      title: `${card.title} ${
        card.status === 'COMPLETED'
          ? 'completed'
          : card.status === 'FAILED'
            ? 'failed'
            : 'was abandoned'
      }`,
      detail: null,
      dateLabel: activityDateLabel(card.completedAtEpochMinute!, input.currentEpochMinute),
      occurredAtEpochMinute: card.completedAtEpochMinute!,
      href: card.href,
      tone: card.status === 'COMPLETED' ? 'neutral' : 'warning',
    }));

  const ledgerActivities: DowntimeOverviewActivity[] = input.ledger.feed.map((line) => ({
    id: `ledger:${line.id}`,
    source: 'ledger',
    sourceLabel: 'Ledger',
    title: line.title,
    detail: line.amountLabel,
    dateLabel: line.dateLabel,
    occurredAtEpochMinute: line.occurredAtEpochMinute,
    href: line.href,
    tone: line.tone,
  }));

  const reputationActivities: DowntimeOverviewActivity[] = input.reputation.feed.map(
    (line) => ({
      id: `reputation:${line.id}`,
      source: 'reputation',
      sourceLabel: 'Reputation',
      title: `${line.factionTitle} ${line.directionArrow} ${line.bandLabel}`,
      detail: line.narrative || null,
      dateLabel: line.dateLabel,
      occurredAtEpochMinute: line.occurredAtEpochMinute,
      href: line.factionHref,
      tone: line.tone,
    }),
  );

  const havenActivities: DowntimeOverviewActivity[] = input.havenActivity.map((entry) => ({
    id: `haven:${entry.id}`,
    source: 'haven',
    sourceLabel: 'Haven',
    title: entry.summary,
    detail: entry.havenTitle,
    dateLabel: activityDateLabel(entry.occurredAtEpochMinute, input.currentEpochMinute),
    occurredAtEpochMinute: entry.occurredAtEpochMinute,
    href: entry.havenHref,
    tone: entry.tone,
  }));

  const recentActivity = [
    ...projectActivities,
    ...ledgerActivities,
    ...reputationActivities,
    ...havenActivities,
  ]
    .sort((a, b) => {
      const timeOrder = BigInt(b.occurredAtEpochMinute) - BigInt(a.occurredAtEpochMinute);
      if (timeOrder !== 0n) return timeOrder > 0n ? 1 : -1;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 8);

  const projects = input.projectCards
    .filter((card) => !TERMINAL_PROJECT_STATUSES.has(card.status))
    .sort((a, b) => {
      const rank = overviewProjectRank(a) - overviewProjectRank(b);
      return rank || a.title.localeCompare(b.title);
    })
    .slice(0, 5);

  const standings = [...input.reputation.standings]
    .sort((a, b) => {
      const aRank = Math.min(reputationToneRank(a.trustTone), reputationToneRank(a.notorietyTone));
      const bRank = Math.min(reputationToneRank(b.trustTone), reputationToneRank(b.notorietyTone));
      return aRank - bRank || a.factionTitle.localeCompare(b.factionTitle);
    })
    .slice(0, 3);

  const havenCount = input.havenCards.length;
  return {
    currentTimeLabel: input.currentTimeLabel,
    elapsedSinceLabel: input.elapsedSinceLabel,
    currentDowntimePeriod: input.currentDowntimePeriod,
    projects,
    havens: input.havenCards.slice(0, 3),
    ledger: {
      hasEntries: input.ledger.feed.length > 0,
      balanceLabel:
        input.ledger.feed.length > 0 || input.ledger.treasury.openingBalance !== 0
          ? input.ledger.treasury.balanceLabel
          : null,
      entries: input.ledger.feed.slice(0, 2),
    },
    reputation: {
      standingCount: input.reputation.standings.length,
      standings,
    },
    partyOperations: [
      {
        id: 'holdings',
        label: 'Holdings',
        supported: true,
        value: havenCount,
        valueLabel: `${havenCount.toString()} ${havenCount === 1 ? 'haven' : 'havens'}`,
      },
      { id: 'hirelings_followers', label: 'Hirelings & followers', supported: false },
      { id: 'obligations', label: 'Obligations', supported: false },
      { id: 'other_resources', label: 'Other resources', supported: false },
    ],
    recentActivity,
    pendingWorldEventSuggestionsCount: input.pendingWorldEventSuggestionsCount,
  };
}

export { DOWNTIME_OVERVIEW_DOMAINS, DOWNTIME_WORLD_EVENT_DOMAINS };
