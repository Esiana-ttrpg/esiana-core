/**
 * Read-side DTO helpers for the Journal system. Linked-page refs resolve the
 * narrative anchor into a display chip (loose id — a dangling/cross-tenant page
 * simply yields null; diagnostics own the "missing reference" story).
 */
import { prisma } from './prisma.js';
import { readEntityCategoryFromMetadata } from './wikiCategoryEntityIndex.js';
import { asReleaseNode } from './journalReleaseService.js';
import type {
  JournalLinkedPageRef,
  JournalSeriesDTO,
  JournalSeriesMode,
  JournalPublicationType,
} from '../../../shared/journalPublication.js';

function uniqueIds(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

/** Resolve linked wiki pages into display chips, scoped to the campaign. */
export async function resolveLinkedPageRefs(
  campaignId: string,
  pageIds: (string | null | undefined)[],
): Promise<Map<string, JournalLinkedPageRef>> {
  const map = new Map<string, JournalLinkedPageRef>();
  const ids = uniqueIds(pageIds);
  if (ids.length === 0) return map;

  const rows = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: ids }, deletedAt: null },
    select: { id: true, title: true, metadata: true },
  });
  for (const row of rows) {
    map.set(row.id, {
      pageId: row.id,
      title: row.title,
      entityCategory: readEntityCategoryFromMetadata(row.metadata),
    });
  }
  return map;
}

/** Resolve series ids to their display names, scoped to the campaign. */
export async function resolveSeriesNames(
  campaignId: string,
  seriesIds: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = uniqueIds(seriesIds);
  if (ids.length === 0) return map;

  const rows = await prisma.journalSeries.findMany({
    where: { campaignId, id: { in: ids } },
    select: { id: true, name: true },
  });
  for (const row of rows) map.set(row.id, row.name);
  return map;
}

const OPEN_STATUSES = ['draft', 'scheduled'] as const;

/**
 * Build series DTOs for the Planner series strip. `nextIssueState` reflects the
 * buffer-of-1 invariant: at most one open (unreleased) issue exists at a time.
 */
export async function buildSeriesDTOs(
  campaignId: string,
  options: { createdByUserId?: string } = {},
): Promise<JournalSeriesDTO[]> {
  const where: { campaignId: string; createdByUserId?: string } = { campaignId };
  if (options.createdByUserId) {
    where.createdByUserId = options.createdByUserId;
  }
  const rows = await prisma.journalSeries.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      name: true,
      description: true,
      defaultType: true,
      linkedPageId: true,
      templateWorkshopDraftId: true,
      nextIssueRule: true,
      namingScheme: true,
      nextIssueNumber: true,
      seriesMode: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (rows.length === 0) return [];

  const seriesIds = rows.map((row) => row.id);
  const [openIssues, releasedMax, linkedPages] = await Promise.all([
    prisma.journalPublication.findMany({
      where: { campaignId, seriesId: { in: seriesIds }, status: { in: [...OPEN_STATUSES] } },
      orderBy: { issueNumber: 'desc' },
      select: { id: true, seriesId: true },
    }),
    prisma.journalPublication.groupBy({
      by: ['seriesId'],
      where: { campaignId, seriesId: { in: seriesIds }, status: 'released' },
      _max: { issueNumber: true },
    }),
    resolveLinkedPageRefs(campaignId, rows.map((row) => row.linkedPageId)),
  ]);

  const openBySeries = new Map<string, string>();
  for (const issue of openIssues) {
    if (issue.seriesId && !openBySeries.has(issue.seriesId)) {
      openBySeries.set(issue.seriesId, issue.id);
    }
  }
  const lastReleasedBySeries = new Map<string, number | null>();
  for (const group of releasedMax) {
    if (group.seriesId) lastReleasedBySeries.set(group.seriesId, group._max.issueNumber ?? null);
  }

  return rows.map((row) => {
    const rule = asReleaseNode(row.nextIssueRule);
    const openPublicationId = openBySeries.get(row.id) ?? null;
    const kind: JournalSeriesDTO['nextIssueState']['kind'] = !rule
      ? 'no_rule'
      : openPublicationId
        ? 'draft_created'
        : 'not_created';
    return {
      id: row.id,
      campaignId,
      name: row.name,
      description: row.description,
      defaultType: row.defaultType as JournalPublicationType,
      linkedPage: row.linkedPageId ? linkedPages.get(row.linkedPageId) ?? null : null,
      templateWorkshopDraftId: row.templateWorkshopDraftId,
      nextIssueRule: rule,
      namingScheme: row.namingScheme,
      nextIssueNumber: row.nextIssueNumber,
      seriesMode: row.seriesMode as JournalSeriesMode,
      nextIssueState: {
        kind,
        issueNumber: row.nextIssueNumber,
        openPublicationId,
      },
      lastReleasedIssueNumber: lastReleasedBySeries.get(row.id) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}
