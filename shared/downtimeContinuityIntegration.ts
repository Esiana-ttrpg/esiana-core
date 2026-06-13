/**
 * Phase 7 — Downtime continuity integration (Layer 4 + havens + projects → pressure feed).
 */
import type {
  ContinuityIssue,
  ContinuityIssueSeverity,
  ContinuityIssueType,
} from './continuityIssue.js';
import type {
  DowntimeFeedCard,
  DowntimeFeedCardPriority,
  DowntimeFeedCardSourceType,
  DowntimePressurePresentation,
} from './downtimeHub.js';
import type { DowntimeHavenDetail, HavenThreatEntry, HavenThreatSeverity } from './havenMetadata.js';
import { isEscalatingThreat } from './havenMetadata.js';
import { buildNarrativePressureFeed } from './narrativePressureFeed.js';
import type { DowntimeProjectDetail } from './projectMetadata.js';
import {
  canProjectProgress,
  formatProjectStalledLabel,
  parseDowntimeProjectFields,
  resolveProjectClockState,
} from './projectMetadata.js';

export const MINUTES_PER_DAY = 1440n;

export const HAVEN_THREAT_ESCALATION_THRESHOLDS = {
  low: 14n * MINUTES_PER_DAY,
  rising: 7n * MINUTES_PER_DAY,
} as const;

export const PROJECT_STALL_PRESSURE_THRESHOLD = 7n * MINUTES_PER_DAY;
export const PROJECT_STALL_ACTIONABLE_THRESHOLD = 14n * MINUTES_PER_DAY;

export const DOWNTIME_CONTINUITY_ISSUE_TYPES = new Set<ContinuityIssueType>([
  'narrative_foreshadowing_stale',
  'narrative_foreshadowing_no_payoff',
  'narrative_foreshadowing_no_reminder',
  'narrative_unresolved_thread',
  'narrative_dramatic_topology',
]);

const MIN_FEED_SEVERITY: Partial<Record<ContinuityIssueType, ContinuityIssueSeverity>> = {
  narrative_foreshadowing_stale: 'warning',
  narrative_foreshadowing_no_payoff: 'warning',
  narrative_foreshadowing_no_reminder: 'warning',
  narrative_unresolved_thread: 'warning',
  narrative_dramatic_topology: 'warning',
};

const SEVERITY_RANK: Record<ContinuityIssueSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

export const FEED_PRIORITY_WEIGHT: Record<DowntimeFeedCardPriority, number> = {
  critical: 400,
  actionable: 300,
  important: 200,
  ambient: 100,
};

const SOURCE_TYPE_SORT_RANK: Record<DowntimeFeedCardSourceType, number> = {
  haven_threat: 0,
  project_pressure: 1,
  quest_time: 2,
  event_consequence: 3,
  continuity_diagnostic: 4,
  creative_drift: 5,
};

export function emptyDowntimePressurePresentation(): DowntimePressurePresentation {
  return {
    cards: [],
    counts: {
      continuityPressureCount: 0,
      havenThreatCount: 0,
      stalledProjectCount: 0,
      actionableCount: 0,
    },
  };
}

function passesContinuitySeverityGate(issue: ContinuityIssue): boolean {
  if (!DOWNTIME_CONTINUITY_ISSUE_TYPES.has(issue.type)) return false;
  const minSeverity = MIN_FEED_SEVERITY[issue.type] ?? 'warning';
  return SEVERITY_RANK[issue.severity] >= SEVERITY_RANK[minSeverity];
}

export function filterContinuityIssuesForDowntime(issues: ContinuityIssue[]): ContinuityIssue[] {
  return issues.filter(passesContinuitySeverityGate);
}

export function adaptContinuityPressureToDowntimeCards(
  issues: ContinuityIssue[],
): DowntimeFeedCard[] {
  const filtered = filterContinuityIssuesForDowntime(issues);
  const pressureItems = buildNarrativePressureFeed(filtered);

  return pressureItems.map((item) => ({
    id: `continuity:${item.id}`,
    title: item.message.slice(0, 80),
    summary: item.message,
    dateLabel: 'Narrative pressure',
    tone: item.severity === 'critical' ? 'escalation' : 'warning',
    sourceType: 'continuity_diagnostic' as const,
    priority: item.severity === 'critical' ? ('important' as const) : ('ambient' as const),
    detectedAtEpochMinute: '0',
  }));
}

function havenThreatFeedPriority(severity: HavenThreatSeverity | null): DowntimeFeedCardPriority {
  if (severity === 'critical') return 'critical';
  if (severity === 'rising') return 'important';
  return 'ambient';
}

function formatHavenThreatSeverityLabel(severity: HavenThreatSeverity | null): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'rising':
      return 'Rising';
    case 'low':
      return 'Low';
    default:
      return 'Unknown';
  }
}

export function buildHavenThreatFeedCards(
  havens: Pick<DowntimeHavenDetail, 'id' | 'title' | 'href' | 'threats'>[],
): DowntimeFeedCard[] {
  const cards: DowntimeFeedCard[] = [];

  for (const haven of havens) {
    for (const threat of haven.threats) {
      if (!isEscalatingThreat(threat)) continue;

      const severity = threat.severity ?? 'low';
      cards.push({
        id: `haven-threat:${haven.id}:${threat.id}`,
        title: `${haven.title} — ${threat.label}`,
        summary:
          threat.description?.trim() ||
          `${formatHavenThreatSeverityLabel(severity)} threat at ${haven.title}`,
        dateLabel: 'Haven threat',
        tone: severity === 'critical' ? 'escalation' : 'warning',
        href: haven.href,
        sourceType: 'haven_threat',
        priority: havenThreatFeedPriority(severity),
        detectedAtEpochMinute: threat.sinceEpochMinute ?? '0',
      });
    }
  }

  return cards;
}

export function projectQualifiesForStallPressure(project: DowntimeProjectDetail): boolean {
  if (project.status !== 'ACTIVE') return false;

  const fields = parseDowntimeProjectFields({
    status: project.status,
    resources: project.resources,
    blockers: project.blockers,
    durationTotalMinutes: project.durationTotalMinutes,
    durationElapsedMinutes: project.durationElapsedMinutes,
    stalledDurationMinutes: project.stalledDurationMinutes,
  });
  const canProgress = canProjectProgress(fields);
  const clockState = resolveProjectClockState(project.status, canProgress);
  const stalledMinutes = BigInt(project.stalledDurationMinutes);
  const unresolvedBlockers = project.blockers.filter((entry) => !entry.resolved);

  return (
    stalledMinutes >= PROJECT_STALL_PRESSURE_THRESHOLD ||
    (clockState === 'waiting' && unresolvedBlockers.length > 0)
  );
}

export function buildProjectStallFeedCards(
  projects: DowntimeProjectDetail[],
): DowntimeFeedCard[] {
  const cards: DowntimeFeedCard[] = [];

  for (const project of projects) {
    if (!projectQualifiesForStallPressure(project)) continue;

    const fields = parseDowntimeProjectFields({
      status: project.status,
      resources: project.resources,
      blockers: project.blockers,
      durationTotalMinutes: project.durationTotalMinutes,
      durationElapsedMinutes: project.durationElapsedMinutes,
      stalledDurationMinutes: project.stalledDurationMinutes,
    });
    const canProgress = canProjectProgress(fields);
    const clockState = resolveProjectClockState(project.status, canProgress);
    const stalledMinutes = BigInt(project.stalledDurationMinutes);
    const stalledLabel = formatProjectStalledLabel(stalledMinutes);
    const blockersSummary = project.blockers
      .filter((entry) => !entry.resolved)
      .map((entry) => entry.label)
      .slice(0, 2)
      .join(', ');

    const summary =
      stalledLabel ??
      (clockState === 'waiting' && blockersSummary
        ? `Blocked: ${blockersSummary}`
        : 'Project progress has stalled');

    const priority: DowntimeFeedCardPriority =
      stalledMinutes >= PROJECT_STALL_ACTIONABLE_THRESHOLD || project.risks.length > 0
        ? 'actionable'
        : 'important';

    cards.push({
      id: `project-stall:${project.id}`,
      title: project.title,
      summary,
      dateLabel: 'Project pressure',
      tone: priority === 'actionable' ? 'warning' : 'neutral',
      href: project.href,
      sourceType: 'project_pressure',
      priority,
      detectedAtEpochMinute: project.startedAtEpochMinute ?? '0',
    });
  }

  return cards;
}

export function sortDowntimePressureFeedCards(cards: DowntimeFeedCard[]): DowntimeFeedCard[] {
  return [...cards].sort((a, b) => {
    const aWeight = FEED_PRIORITY_WEIGHT[a.priority ?? 'ambient'];
    const bWeight = FEED_PRIORITY_WEIGHT[b.priority ?? 'ambient'];
    if (aWeight !== bWeight) return bWeight - aWeight;

    const aDetected = a.detectedAtEpochMinute ? BigInt(a.detectedAtEpochMinute) : 0n;
    const bDetected = b.detectedAtEpochMinute ? BigInt(b.detectedAtEpochMinute) : 0n;
    if (aDetected !== bDetected) return aDetected > bDetected ? -1 : 1;

    const aSource = a.sourceType ? SOURCE_TYPE_SORT_RANK[a.sourceType] : 99;
    const bSource = b.sourceType ? SOURCE_TYPE_SORT_RANK[b.sourceType] : 99;
    return aSource - bSource;
  });
}

export function buildDowntimePressurePresentation(input: {
  continuityIssues: ContinuityIssue[];
  havens: Pick<DowntimeHavenDetail, 'id' | 'title' | 'href' | 'threats'>[];
  projects: DowntimeProjectDetail[];
  cardCap?: number;
}): DowntimePressurePresentation {
  const continuityCards = adaptContinuityPressureToDowntimeCards(input.continuityIssues);
  const havenCards = buildHavenThreatFeedCards(input.havens);
  const projectCards = buildProjectStallFeedCards(input.projects);

  const continuityPressureCount = filterContinuityIssuesForDowntime(input.continuityIssues).length;
  const havenThreatCount = havenCards.length;
  const stalledProjectCount = projectCards.length;

  const cards = sortDowntimePressureFeedCards([
    ...havenCards,
    ...projectCards,
    ...continuityCards,
  ]).slice(0, input.cardCap ?? 12);

  const actionableCount = cards.filter(
    (card) => card.priority === 'critical' || card.priority === 'actionable',
  ).length;

  return {
    cards,
    counts: {
      continuityPressureCount,
      havenThreatCount,
      stalledProjectCount,
      actionableCount,
    },
  };
}

export function detectNextThreatSeverityPromotion(
  threat: HavenThreatEntry,
  currentEpochMinute: bigint,
): 'rising' | 'critical' | null {
  const severity = threat.severity ?? 'low';
  if (severity === 'critical') return null;

  const sinceRaw = threat.sinceEpochMinute;
  if (!sinceRaw) return null;

  const since = BigInt(sinceRaw);
  const elapsed = currentEpochMinute - since;
  if (elapsed < 0n) return null;

  if (severity === 'low' && elapsed >= HAVEN_THREAT_ESCALATION_THRESHOLDS.low) {
    return 'rising';
  }
  if (severity === 'rising' && elapsed >= HAVEN_THREAT_ESCALATION_THRESHOLDS.rising) {
    return 'critical';
  }

  return null;
}

export const HAVEN_THREAT_ESCALATION_ACTIVITY_SUMMARIES = {
  low_to_rising:
    'Threat severity increased from Low to Rising after remaining unresolved.',
  rising_to_critical:
    'Threat severity increased from Rising to Critical after remaining unresolved.',
} as const;

export function applyThreatSeverityPromotion(
  threat: HavenThreatEntry,
  nextSeverity: 'rising' | 'critical',
  atEpochMinute: string,
): HavenThreatEntry {
  return {
    ...threat,
    severity: nextSeverity,
    sinceEpochMinute: atEpochMinute,
  };
}
