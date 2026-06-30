import { prisma } from './prisma.js';
import { buildConvergenceOverlay } from './chronologyConvergenceService.js';
import {
  ChronologyDomainKind,
  chronologyInstantSortKey,
} from '../../../shared/chronologyTypes.js';
import {
  normalizeWorldEventsConfig,
  type DashboardWorldEventType,
} from '../../../shared/dashboardWorldEventsCatalog.js';
import {
  formatWorldEventTypeLabel,
  resolveWorldEventImportanceRank,
  resolveWorldEventWidgetType,
} from '../../../shared/worldEventWidgetPresentation.js';
import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
import type { CampaignMemberRole } from '../types/domain.js';

export type DashboardWorldEventRow = {
  id: string;
  label: string;
  type: DashboardWorldEventType;
  typeLabel: string;
  href: string | null;
  timestamp: string;
  epochMinute: string;
  importanceRank: number;
};

export type DashboardWorldEventsFeedResult = {
  items: DashboardWorldEventRow[];
};

const WORLD_EVENT_DOMAINS = [
  ChronologyDomainKind.WORLD_EVENT,
  ChronologyDomainKind.WORLD_ADVANCE,
  ChronologyDomainKind.ORG_RELATION,
  ChronologyDomainKind.FACTION_CONTROL,
] as const;

const LOOKBACK_DAYS = 60n;
const LOOKAHEAD_DAYS = 90n;
const MINUTES_PER_DAY = 1440n;

function isTemporallyRelevant(
  entry: ConvergenceTimelineEntry,
  campaignNowEpoch: bigint,
): boolean {
  if (entry.instant.epochMinute == null) return false;
  const epoch = chronologyInstantSortKey(entry.instant);
  const lookback = campaignNowEpoch - LOOKBACK_DAYS * MINUTES_PER_DAY;
  const lookahead = campaignNowEpoch + LOOKAHEAD_DAYS * MINUTES_PER_DAY;
  return epoch >= lookback && epoch <= lookahead;
}

async function loadCalendarCategoryNames(
  campaignId: string,
): Promise<Map<string, string>> {
  const categories = await prisma.calendarEventCategory.findMany({
    where: { campaignId },
    select: { id: true, name: true },
  });
  const map = new Map<string, string>();
  for (const category of categories) {
    map.set(category.id, category.name);
  }
  return map;
}

function entryHref(entry: ConvergenceTimelineEntry): string | null {
  return entry.links[0]?.path ?? null;
}

function mapEntryToRow(
  entry: ConvergenceTimelineEntry,
  categoryNames: Map<string, string>,
): DashboardWorldEventRow {
  let calendarCategoryName: string | null = null;
  if (
    entry.domain === ChronologyDomainKind.WORLD_EVENT &&
    entry.domainPayload.domain === ChronologyDomainKind.WORLD_EVENT
  ) {
    const categoryId = entry.domainPayload.payload.categoryId;
    if (categoryId) {
      calendarCategoryName = categoryNames.get(categoryId) ?? null;
    }
  }

  const type = resolveWorldEventWidgetType({
    domain: entry.domain,
    calendarCategoryName,
  });

  const importanceRank = resolveWorldEventImportanceRank({
    domain: entry.domain,
    importance: null,
  });

  const epochMinute = entry.instant.epochMinute ?? '0';

  return {
    id: entry.entryId,
    label: entry.display.title,
    type,
    typeLabel: formatWorldEventTypeLabel(type),
    href: entryHref(entry),
    timestamp: entry.display.dateLabel ?? epochMinute,
    epochMinute,
    importanceRank,
  };
}

export async function buildDashboardWorldEventsFeed(input: {
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  allowPlayerChronologyManagement?: boolean;
  config?: Record<string, unknown>;
}): Promise<DashboardWorldEventsFeedResult> {
  const { typeFilters, limit, sortBy } = normalizeWorldEventsConfig(input.config);
  const typeFilterSet = new Set(typeFilters);

  const [overlay, categoryNames, campaign] = await Promise.all([
    buildConvergenceOverlay({
      campaignId: input.campaignId,
      campaignHandle: input.campaignHandle,
      role: input.role,
      allowPlayerChronologyManagement: input.allowPlayerChronologyManagement ?? false,
      window: { mode: 'YEAR_RANGE', from: '0', to: '9999' },
      domains: [...WORLD_EVENT_DOMAINS],
      sessionLinkedOnly: false,
      includeSuppressed: false,
    }),
    loadCalendarCategoryNames(input.campaignId),
    prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { currentEpochMinute: true },
    }),
  ]);

  const campaignNow = campaign?.currentEpochMinute ?? 0n;

  let rows = overlay.entries
    .filter((entry) => entry.projection.visible)
    .filter((entry) => isTemporallyRelevant(entry, campaignNow))
    .map((entry) => mapEntryToRow(entry, categoryNames))
    .filter((row) => typeFilterSet.has(row.type));

  if (sortBy === 'importance') {
    rows.sort((a, b) => {
      if (a.importanceRank !== b.importanceRank) {
        return a.importanceRank - b.importanceRank;
      }
      return BigInt(b.epochMinute) > BigInt(a.epochMinute) ? 1 : -1;
    });
  } else {
    rows.sort((a, b) =>
      BigInt(b.epochMinute) > BigInt(a.epochMinute) ? 1 : -1,
    );
  }

  return { items: rows.slice(0, limit) };
}
