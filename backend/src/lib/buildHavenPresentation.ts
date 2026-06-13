import type {
  DowntimeFeedCard,
  DowntimeHavenOverviewPayload,
  DowntimeHavenSituationCard,
  DowntimePulse,
} from '../../../shared/downtimeHub.js';
import type { DowntimeHavenDetail } from '../../../shared/havenMetadata.js';
import {
  activityToneToFeedTone,
  formatHavenDiscoveryLabel,
  formatHavenStatusLabel,
  formatHavenThemeLabel,
  formatHavenTypeLabel,
  isEscalatingThreat,
  sortActivityLogNewestFirst,
  sortThreatsBySeverity,
  threatSeverityToFeedTone,
} from '../../../shared/havenMetadata.js';
import type { DowntimeProjectDetail } from '../../../shared/projectMetadata.js';
import {
  buildHavenSimulationSnapshot,
  deriveAxisDriversForPresentation,
  parseHavenSimulationFromHints,
} from '../../../shared/havenSimulation.js';
import { formatRelativeEpochLabel } from '../../../shared/relativeEpochLabel.js';
import { buildDowntimeProjectOperationCards } from './buildDowntimePresentation.js';
import {
  hydrateHavenIdentity,
  hydrateHavenReferences,
  hydrateHavenSpaces,
} from './havenReferenceHydration.js';

function buildHavenSimulationPresentation(haven: DowntimeHavenDetail) {
  const simulation = parseHavenSimulationFromHints(haven.simulationHints);
  const axisDrivers = deriveAxisDriversForPresentation(simulation.axes, {
    status: haven.status,
    escalatingThreatCount: haven.escalatingThreatCount,
    activeProjectCount: haven.activeProjectCount,
    primaryTheme: haven.primaryTheme,
  });
  return buildHavenSimulationSnapshot(haven.simulationHints, axisDrivers);
}

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

function resolveLastActiveEpochMinute(
  haven: DowntimeHavenDetail,
): string | null {
  const sorted = sortActivityLogNewestFirst(haven.activityLog);
  return sorted[0]?.atEpochMinute ?? haven.updatedAt;
}

export function buildHavenPulse(
  haven: DowntimeHavenDetail,
  simulationSnapshot?: ReturnType<typeof buildHavenSimulationSnapshot>,
): DowntimePulse {
  const typeLabel = formatHavenTypeLabel(haven.havenType);
  const statusLabel = formatHavenStatusLabel(haven.status);
  const themeLabel = formatHavenThemeLabel(haven.primaryTheme);
  const discoveryLabel = formatHavenDiscoveryLabel(haven.discoveryState);

  const headline = `${statusLabel} ${typeLabel.toLowerCase()}`;

  const bullets: string[] = [];
  if (themeLabel) bullets.push(`${themeLabel} character`);
  if (discoveryLabel) bullets.push(`${discoveryLabel} to the wider world`);
  if (haven.passiveBenefits.length > 0) {
    bullets.push(haven.passiveBenefits[0]!.label);
  }
  if (haven.escalatingThreatCount > 0) {
    bullets.push(
      `${haven.escalatingThreatCount.toString()} escalating threat(s) need attention`,
    );
  }
  if (haven.activeProjectCount > 0) {
    bullets.push(
      `${haven.activeProjectCount.toString()} active operation(s) underway`,
    );
  }
  if (simulationSnapshot?.pressureHeadline) {
    bullets.unshift(simulationSnapshot.pressureHeadline);
  }

  return { headline, bullets };
}

export function buildHavenRecentChanges(
  haven: DowntimeHavenDetail,
  currentEpochMinute: bigint,
  limit = 8,
): DowntimeFeedCard[] {
  return sortActivityLogNewestFirst(haven.activityLog)
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      title: entry.summary,
      summary:
        entry.origin === 'project_outcome'
          ? 'Project outcome'
          : entry.origin === 'future_simulation'
            ? 'Time passage'
            : entry.origin === 'manual'
              ? 'Recorded update'
              : 'Campaign change',
      dateLabel:
        formatRelativeEpochLabel(entry.atEpochMinute, currentEpochMinute) ??
        'Undated',
      tone: activityToneToFeedTone(entry.tone),
    }));
}

export function buildHavenSituationCard(
  haven: DowntimeHavenDetail,
  presentLabels: string[],
  currentEpochMinute: bigint,
): DowntimeHavenSituationCard {
  const recentActivity = sortActivityLogNewestFirst(haven.activityLog)
    .slice(0, 3)
    .map((entry) => entry.summary);

  const escalatingThreats = sortThreatsBySeverity(haven.threats)
    .filter(isEscalatingThreat)
    .slice(0, 2)
    .map((threat) => threat.label);

  const typeLabel = formatHavenTypeLabel(haven.havenType);
  const statusLabel = formatHavenStatusLabel(haven.status);
  const discoveryLabel = formatHavenDiscoveryLabel(haven.discoveryState);

  const subtitleParts = [typeLabel];
  if (discoveryLabel) subtitleParts.push(discoveryLabel);
  else subtitleParts.push(statusLabel);

  const lastActiveAt = resolveLastActiveEpochMinute(haven);

  return {
    ...haven,
    subtitle: subtitleParts.join(' · '),
    recentActivity,
    escalatingThreats,
    presentLabels,
    lastActiveLabel: formatRelativeEpochLabel(lastActiveAt, currentEpochMinute),
    pressureHeadline: buildHavenSimulationPresentation(haven).pressureHeadline,
  };
}

export async function buildHavenOverviewPayload(input: {
  haven: DowntimeHavenDetail;
  blocks: unknown;
  featuredImageId: string | null;
  campaignId: string;
  campaignHandle: string;
  activeProjects: Array<{ project: DowntimeProjectDetail; wikiMetadata?: unknown }>;
  residentLabels: Map<string, string>;
  currentEpochMinute: bigint;
}): Promise<DowntimeHavenOverviewPayload> {
  const {
    haven,
    blocks,
    featuredImageId,
    campaignId,
    campaignHandle,
    activeProjects,
    residentLabels,
    currentEpochMinute,
  } = input;

  const [identity, references, spaces] = await Promise.all([
    hydrateHavenIdentity({
      campaignId,
      campaignHandle,
      featuredImageId,
      identityHints: haven.identityHints,
      locationPageId: haven.locationPageId,
      factionPageIds: haven.factionPageIds,
      relatedPageIds: haven.relatedPageIds,
    }),
    hydrateHavenReferences({
      campaignId,
      campaignHandle,
      references: haven.references,
    }),
    Promise.resolve(hydrateHavenSpaces(haven.spaces)),
  ]);

  const simulation = buildHavenSimulationPresentation(haven);
  const pulse = buildHavenPulse(haven, simulation);
  const recentChanges = buildHavenRecentChanges(haven, currentEpochMinute);
  const activeOperations = buildDowntimeProjectOperationCards(activeProjects);

  const threats = sortThreatsBySeverity(haven.threats).map((threat) => ({
    id: threat.id,
    label: threat.label,
    severity: threat.severity,
    description: threat.description,
    tone: threatSeverityToFeedTone(threat.severity),
  }));

  const improvements = haven.upgrades.map((upgrade) => ({
    id: upgrade.id,
    label: upgrade.label,
    description: upgrade.description,
    provenanceLabel: upgrade.establishedByProjectTitle
      ? `Built during: ${upgrade.establishedByProjectTitle}`
      : null,
  }));

  const residents = haven.residentPageIds.map((pageId) => ({
    pageId,
    label: residentLabels.get(pageId) ?? 'Unknown resident',
  }));

  return {
    havenId: haven.id,
    wikiPageId: haven.wikiPageId,
    title: haven.title,
    identity,
    pulse,
    simulation,
    recentChanges,
    references,
    spaces,
    activeOperations,
    threats,
    improvements,
    present: {
      residents,
      crew: haven.crew,
    },
    loreMarkdown: extractLoreMarkdown(blocks),
  };
}

export function buildHavenSituationCards(
  havens: DowntimeHavenDetail[],
  residentLabelsByHaven: Map<string, string[]>,
  currentEpochMinute: bigint,
): DowntimeHavenSituationCard[] {
  return havens.map((haven) =>
    buildHavenSituationCard(
      haven,
      residentLabelsByHaven.get(haven.id) ?? [],
      currentEpochMinute,
    ),
  );
}
