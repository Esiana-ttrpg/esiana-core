/**
 * Journal series: lazy, just-in-time issue materialization.
 *
 * A series is a blueprint, not a queue. It keeps a buffer of at most ONE open
 * (unreleased) issue. The next draft materializes only when the series
 * `nextIssueRule` is satisfied (evaluated lazily via the time hook), or when a
 * GM explicitly asks to generate the next issue now. No batch pre-generation.
 */
import { prisma } from './prisma.js';
import { asReleaseNode } from './journalReleaseService.js';
import { evaluateReleaseRule } from '../../../shared/journalReleaseRule.js';
import { buildJournalReleaseSnapshot } from './journalReleaseSnapshotService.js';

const OPEN_STATUSES = ['draft', 'scheduled'] as const;

type SeriesRow = {
  id: string;
  name: string;
  defaultType: string;
  namingScheme: string | null;
  nextIssueNumber: number;
  linkedPageId: string | null;
  nextIssueRule: unknown;
};

export function buildIssueTitle(
  namingScheme: string | null,
  seriesName: string,
  issueNumber: number,
): string {
  if (namingScheme && namingScheme.trim()) {
    return namingScheme
      .replace(/\{n\}/gi, String(issueNumber))
      .replace(/\{name\}/gi, seriesName)
      .trim();
  }
  return `${seriesName} #${issueNumber}`;
}

async function findOpenIssueId(campaignId: string, seriesId: string): Promise<string | null> {
  const open = await prisma.journalPublication.findFirst({
    where: { campaignId, seriesId, status: { in: [...OPEN_STATUSES] } },
    orderBy: { issueNumber: 'desc' },
    select: { id: true },
  });
  return open?.id ?? null;
}

async function createIssueDraft(
  campaignId: string,
  series: SeriesRow,
  createdByUserId: string | null,
): Promise<string> {
  const created = await prisma.journalPublication.create({
    data: {
      campaignId,
      seriesId: series.id,
      title: buildIssueTitle(series.namingScheme, series.name, series.nextIssueNumber),
      type: series.defaultType,
      status: 'draft',
      issueNumber: series.nextIssueNumber,
      sourceKind: 'quick_draft',
      linkedPageId: series.linkedPageId,
      createdByUserId,
    },
    select: { id: true },
  });
  await prisma.journalSeries.updateMany({
    where: { id: series.id, campaignId },
    data: { nextIssueNumber: series.nextIssueNumber + 1 },
  });
  return created.id;
}

const SERIES_SELECT = {
  id: true,
  name: true,
  defaultType: true,
  namingScheme: true,
  nextIssueNumber: true,
  linkedPageId: true,
  nextIssueRule: true,
} as const;

export class JournalSeriesError extends Error {
  readonly code: 'NOT_FOUND';
  constructor(code: 'NOT_FOUND', message: string) {
    super(message);
    this.name = 'JournalSeriesError';
    this.code = code;
  }
}

/**
 * Manual override: create the next issue now. Respects the buffer-of-1 guard —
 * if an open issue already exists it is returned instead of creating a second.
 */
export async function generateNextIssueNow(params: {
  campaignId: string;
  seriesId: string;
  userId: string;
}): Promise<{ created: boolean; publicationId: string }> {
  const series = (await prisma.journalSeries.findFirst({
    where: { id: params.seriesId, campaignId: params.campaignId },
    select: SERIES_SELECT,
  })) as SeriesRow | null;
  if (!series) throw new JournalSeriesError('NOT_FOUND', 'Series not found');

  const openId = await findOpenIssueId(params.campaignId, params.seriesId);
  if (openId) return { created: false, publicationId: openId };

  const publicationId = await createIssueDraft(params.campaignId, series, params.userId);
  return { created: true, publicationId };
}

/**
 * Lazy auto-materialization for all `live` series: for each series with a
 * satisfied `nextIssueRule` and no open issue, create exactly one next draft.
 */
export async function resolveSeriesMaterialization(
  campaignId: string,
): Promise<{ createdSeriesIds: string[] }> {
  const seriesList = (await prisma.journalSeries.findMany({
    where: { campaignId, seriesMode: 'live' },
    select: SERIES_SELECT,
  })) as SeriesRow[];

  const withRule = seriesList.filter((s) => asReleaseNode(s.nextIssueRule) !== null);
  if (withRule.length === 0) return { createdSeriesIds: [] };

  const openRows = await prisma.journalPublication.findMany({
    where: {
      campaignId,
      seriesId: { in: withRule.map((s) => s.id) },
      status: { in: [...OPEN_STATUSES] },
    },
    select: { seriesId: true },
  });
  const openSeries = new Set(openRows.map((r) => r.seriesId));
  const pending = withRule.filter((s) => !openSeries.has(s.id));
  if (pending.length === 0) return { createdSeriesIds: [] };

  const snapshot = await buildJournalReleaseSnapshot({
    campaignId,
    rules: pending.map((s) => asReleaseNode(s.nextIssueRule)),
  });

  const createdSeriesIds: string[] = [];
  for (const series of pending) {
    const { planState } = evaluateReleaseRule(asReleaseNode(series.nextIssueRule), snapshot);
    if (planState === 'ready') {
      await createIssueDraft(campaignId, series, null);
      createdSeriesIds.push(series.id);
    }
  }
  return { createdSeriesIds };
}
