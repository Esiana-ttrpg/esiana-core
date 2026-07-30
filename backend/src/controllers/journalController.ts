import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { buildJournalReleaseSnapshot } from '../lib/journalReleaseSnapshotService.js';
import {
  asReleaseNode,
  evaluatePublication,
  JournalReleaseError,
  releasePublicationManually,
  type PublicationEvaluation,
} from '../lib/journalReleaseService.js';
import { safeResolveJournalCampaign } from '../lib/journalResolution.js';
import { resolveLinkedPageRefs, resolveSeriesNames, buildSeriesDTOs } from '../lib/journalPresentation.js';
import { CampaignCapabilities } from '../../../shared/campaignPolicy/capabilities.js';
import { can as policyCan } from '../../../shared/campaignPolicy/policy.js';
import {
  DEFAULT_JOURNAL_PUBLICATION_TYPE,
  JOURNAL_PUBLICATION_TYPES,
  JOURNAL_SOURCE_KINDS,
  normalizeJournalTags,
  toPerceivedState,
  type JournalLibraryItemDTO,
  type JournalLibrarySection,
  type JournalLibrarySort,
  type JournalPlannerItemDTO,
  type JournalPublicationDTO,
  type JournalPublicationType,
  type JournalSourceKind,
} from '../../../shared/journalPublication.js';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function clampLimit(raw: unknown): number {
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function strParam(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPublicationType(value: string | undefined): value is JournalPublicationType {
  return value !== undefined && (JOURNAL_PUBLICATION_TYPES as readonly string[]).includes(value);
}

function isSourceKind(value: string | undefined): value is JournalSourceKind {
  return value !== undefined && (JOURNAL_SOURCE_KINDS as readonly string[]).includes(value);
}

const DETAIL_SELECT = {
  id: true,
  campaignId: true,
  title: true,
  type: true,
  status: true,
  seriesId: true,
  issueNumber: true,
  sourceKind: true,
  workshopDraftId: true,
  linkedPageId: true,
  contentMarkdown: true,
  contentBlocks: true,
  releaseRule: true,
  createdByUserId: true,
  releasedAt: true,
  lastEvaluatedAt: true,
  createdAt: true,
  updatedAt: true,
  tags: true,
} as const;

type DetailRow = Prisma.JournalPublicationGetPayload<{ select: typeof DETAIL_SELECT }>;

function parseTagsInput(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tags = raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return tags;
}

function isLibrarySection(value: string | undefined): value is JournalLibrarySection {
  return value === 'released' || value === 'upcoming' || value === 'all';
}

function toPublicationDTO(
  row: DetailRow,
  evaluation: PublicationEvaluation,
  linkedPage: JournalPublicationDTO['linkedPage'],
  options: { stripBody?: boolean } = {},
): JournalPublicationDTO {
  const stripBody = options.stripBody ?? false;
  return {
    id: row.id,
    campaignId: row.campaignId,
    title: row.title,
    type: row.type as JournalPublicationType,
    status: row.status as JournalPublicationDTO['status'],
    seriesId: row.seriesId,
    issueNumber: row.issueNumber,
    sourceKind: row.sourceKind as JournalSourceKind,
    workshopDraftId: row.workshopDraftId,
    linkedPage,
    contentMarkdown: stripBody ? null : row.contentMarkdown,
    contentBlocks: stripBody ? null : row.contentBlocks ?? null,
    releaseRule: evaluation.rule,
    contentReadiness: evaluation.contentReadiness,
    planState: evaluation.planState,
    perceivedState: toPerceivedState({ planState: evaluation.planState }),
    diagnostics: evaluation.diagnostics,
    createdByUserId: row.createdByUserId,
    releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
    lastEvaluatedAt: row.lastEvaluatedAt ? row.lastEvaluatedAt.toISOString() : null,
    tags: normalizeJournalTags(row.tags),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Load one publication, evaluate it against a fresh snapshot, and shape the full DTO. */
async function loadPublicationDTO(
  campaignId: string,
  id: string,
  options: { stripBodyForScheduled?: boolean } = {},
): Promise<JournalPublicationDTO | null> {
  const row = (await prisma.journalPublication.findFirst({
    where: { id, campaignId },
    select: DETAIL_SELECT,
  })) as DetailRow | null;
  if (!row) return null;

  const snapshot = await buildJournalReleaseSnapshot({
    campaignId,
    rules: [asReleaseNode(row.releaseRule)],
  });
  const evaluation = evaluatePublication(row, snapshot);
  const linkedPages = await resolveLinkedPageRefs(campaignId, [row.linkedPageId]);
  const linkedPage = row.linkedPageId ? linkedPages.get(row.linkedPageId) ?? null : null;
  const stripBody =
    options.stripBodyForScheduled === true && row.status === 'scheduled';
  return toPublicationDTO(row, evaluation, linkedPage, { stripBody });
}

// ---------------------------------------------------------------------------
// Library — released publications only (cursor-paginated canonical archive).
// ---------------------------------------------------------------------------

export async function listJournalLibrary(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  await safeResolveJournalCampaign(campaignId);

  const typeFilter = strParam(req.query.type);
  const seriesId = strParam(req.query.seriesId);
  const linkedPageId = strParam(req.query.linkedPageId);
  const q = strParam(req.query.q);
  const cursor = strParam(req.query.cursor);
  const sectionRaw = strParam(req.query.section);
  const section: JournalLibrarySection = isLibrarySection(sectionRaw) ? sectionRaw : 'released';
  const tagFilter = strParam(req.query.tag);
  const sort = (strParam(req.query.sort) ?? 'newest') as JournalLibrarySort;
  const take = clampLimit(req.query.limit);

  const where: Prisma.JournalPublicationWhereInput = { campaignId };
  if (section === 'released') {
    where.status = 'released';
  } else if (section === 'upcoming') {
    where.status = 'scheduled';
  } else {
    where.status = { in: ['released', 'scheduled'] };
  }
  if (isPublicationType(typeFilter)) where.type = typeFilter;
  if (seriesId) where.seriesId = seriesId;
  if (linkedPageId) where.linkedPageId = linkedPageId;
  if (q) where.title = { contains: q };

  const orderBy: Prisma.JournalPublicationOrderByWithRelationInput[] =
    section === 'upcoming'
      ? [{ updatedAt: 'desc' }, { id: 'desc' }]
      : sort === 'oldest'
        ? [{ releasedAt: 'asc' }, { id: 'asc' }]
        : sort === 'type'
          ? [{ type: 'asc' }, { releasedAt: 'desc' }, { id: 'desc' }]
          : [{ releasedAt: 'desc' }, { id: 'desc' }];

  const rows = await prisma.journalPublication.findMany({
    where,
    orderBy,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      type: true,
      seriesId: true,
      issueNumber: true,
      sourceKind: true,
      workshopDraftId: true,
      linkedPageId: true,
      releasedAt: true,
      updatedAt: true,
      tags: true,
      status: true,
    },
  });

  const hasMore = rows.length > take;
  let page = hasMore ? rows.slice(0, take) : rows;
  if (tagFilter) {
    page = page.filter((row) => normalizeJournalTags(row.tags).includes(tagFilter));
  }
  const nextCursor = hasMore && !tagFilter ? page[page.length - 1]!.id : null;

  const [linkedPages, seriesNames] = await Promise.all([
    resolveLinkedPageRefs(campaignId, page.map((row) => row.linkedPageId)),
    resolveSeriesNames(campaignId, page.map((row) => row.seriesId)),
  ]);

  const items: JournalLibraryItemDTO[] = page.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as JournalPublicationType,
    seriesId: row.seriesId,
    seriesName: row.seriesId ? seriesNames.get(row.seriesId) ?? null : null,
    issueNumber: row.issueNumber,
    sourceKind: row.sourceKind as JournalSourceKind,
    workshopDraftId: row.workshopDraftId,
    linkedPage: row.linkedPageId ? linkedPages.get(row.linkedPageId) ?? null : null,
    releaseSummary: null,
    releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
    tags: normalizeJournalTags(row.tags),
    updatedAt: row.updatedAt.toISOString(),
    status: row.status as JournalLibraryItemDTO['status'],
  }));

  res.json({ items, nextCursor });
}

// ---------------------------------------------------------------------------
// Planner — pre-release workspace (drafts + scheduled) with lightweight state.
// ---------------------------------------------------------------------------

export async function getJournalPlanner(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  await safeResolveJournalCampaign(campaignId);

  const cursor = strParam(req.query.cursor);
  const take = clampLimit(req.query.limit);

  const rows = await prisma.journalPublication.findMany({
    where: { campaignId, status: { in: ['draft', 'scheduled'] } },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      type: true,
      seriesId: true,
      issueNumber: true,
      sourceKind: true,
      linkedPageId: true,
      contentMarkdown: true,
      contentBlocks: true,
      releaseRule: true,
      lastEvaluatedAt: true,
      updatedAt: true,
      status: true,
      tags: true,
    },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  // One shared snapshot across every rule on the page (batched, reference-driven).
  const snapshot = await buildJournalReleaseSnapshot({
    campaignId,
    rules: page.map((row) => asReleaseNode(row.releaseRule)),
  });
  const [linkedPages, series, seriesNames, recentReleaseRows] = await Promise.all([
    resolveLinkedPageRefs(campaignId, page.map((row) => row.linkedPageId)),
    buildSeriesDTOs(campaignId),
    resolveSeriesNames(campaignId, page.map((row) => row.seriesId)),
    prisma.journalPublication.findMany({
      where: { campaignId, status: 'released' },
      orderBy: [{ releasedAt: 'desc' }, { id: 'desc' }],
      take: 3,
      select: {
        id: true,
        title: true,
        type: true,
        seriesId: true,
        issueNumber: true,
        sourceKind: true,
        workshopDraftId: true,
        linkedPageId: true,
        releasedAt: true,
        updatedAt: true,
        tags: true,
        status: true,
      },
    }),
  ]);

  const items: JournalPlannerItemDTO[] = page.map((row) => {
    const evaluation = evaluatePublication(
      {
        title: row.title,
        contentMarkdown: row.contentMarkdown,
        contentBlocks: row.contentBlocks,
        releaseRule: row.releaseRule,
      },
      snapshot,
    );
    const unmetCount = evaluation.diagnostics.filter((diag) => diag.outcome !== 'met').length;
    return {
      id: row.id,
      title: row.title,
      type: row.type as JournalPublicationType,
      seriesId: row.seriesId,
      issueNumber: row.issueNumber,
      sourceKind: row.sourceKind as JournalSourceKind,
      linkedPage: row.linkedPageId ? linkedPages.get(row.linkedPageId) ?? null : null,
      perceivedState: toPerceivedState({ planState: evaluation.planState }),
      contentReadiness: evaluation.contentReadiness,
      hasRule: evaluation.rule !== null,
      unmetCount,
      lastEvaluatedAt: row.lastEvaluatedAt ? row.lastEvaluatedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      seriesName: row.seriesId ? seriesNames.get(row.seriesId) ?? null : null,
      tags: normalizeJournalTags(row.tags),
      status: row.status as JournalPlannerItemDTO['status'],
    };
  });

  const recentSeriesNames = await resolveSeriesNames(
    campaignId,
    recentReleaseRows.map((row) => row.seriesId),
  );
  const recentLinkedPages = await resolveLinkedPageRefs(
    campaignId,
    recentReleaseRows.map((row) => row.linkedPageId),
  );
  const recentReleases: JournalLibraryItemDTO[] = recentReleaseRows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as JournalPublicationType,
    seriesId: row.seriesId,
    seriesName: row.seriesId ? recentSeriesNames.get(row.seriesId) ?? null : null,
    issueNumber: row.issueNumber,
    sourceKind: row.sourceKind as JournalSourceKind,
    workshopDraftId: row.workshopDraftId,
    linkedPage: row.linkedPageId ? recentLinkedPages.get(row.linkedPageId) ?? null : null,
    releaseSummary: null,
    releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
    tags: normalizeJournalTags(row.tags),
    updatedAt: row.updatedAt.toISOString(),
    status: 'released',
  }));

  res.json({ items, nextCursor, series, recentReleases });
}

// ---------------------------------------------------------------------------
// Publication detail + authoring (PAGE_CREATE) and orchestration (PLANNER).
// ---------------------------------------------------------------------------

export async function getJournalPublication(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const canPlan =
    req.campaign?.actor != null &&
    policyCan(req.campaign.actor, CampaignCapabilities.JOURNAL_PLANNER_ACCESS);
  const dto = await loadPublicationDTO(campaignId, String(req.params.id), {
    stripBodyForScheduled: !canPlan,
  });
  if (!dto) {
    res.status(404).json({ error: 'Publication not found.' });
    return;
  }
  res.json({ publication: dto });
}

export async function createJournalPublication(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = (req.body ?? {}) as Record<string, unknown>;

  const title = typeof body.title === 'string' ? body.title : '';
  const typeCandidate = strParam(body.type);
  const type = isPublicationType(typeCandidate) ? typeCandidate : DEFAULT_JOURNAL_PUBLICATION_TYPE;
  const sourceCandidate = strParam(body.sourceKind);
  const sourceKind = isSourceKind(sourceCandidate) ? sourceCandidate : 'quick_draft';
  const seriesId = strParam(body.seriesId) ?? null;
  const linkedPageId = strParam(body.linkedPageId) ?? null;
  const workshopDraftId = strParam(body.workshopDraftId) ?? null;
  const contentMarkdown = typeof body.contentMarkdown === 'string' ? body.contentMarkdown : null;
  const contentBlocks = Array.isArray(body.contentBlocks) ? body.contentBlocks : null;
  const tags = parseTagsInput(body.tags);

  if (seriesId) {
    const series = await prisma.journalSeries.findFirst({
      where: { id: seriesId, campaignId },
      select: { id: true },
    });
    if (!series) {
      res.status(400).json({ error: 'Series not found in this campaign.' });
      return;
    }
  }

  const releaseNow = !!body.releaseNow;

  const created = await prisma.journalPublication.create({
    data: {
      campaignId,
      title,
      type,
      status: 'draft',
      seriesId,
      sourceKind,
      workshopDraftId,
      contentMarkdown,
      ...(contentBlocks ? { contentBlocks } : {}),
      linkedPageId,
      ...(tags !== undefined ? { tags: tags as unknown as Prisma.InputJsonValue } : {}),
      createdByUserId: req.user?.id ?? null,
    },
    select: { id: true },
  });

  if (releaseNow) {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      await releasePublicationManually({
        campaignId,
        publicationId: created.id,
        userId: req.user.id,
        triggerKind: 'manual',
      });
      const dto = await loadPublicationDTO(campaignId, created.id);
      res.status(201).json({ publication: dto });
      return;
    } catch (error) {
      if (error instanceof JournalReleaseError) {
        const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONTENT_NOT_READY' ? 422 : 409;
        res.status(status).json({ error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  }

  const dto = await loadPublicationDTO(campaignId, created.id);
  res.status(201).json({ publication: dto });
}

export async function updateJournalPublication(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const id = String(req.params.id);
  const existing = await prisma.journalPublication.findFirst({
    where: { id, campaignId },
    select: { id: true, status: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Publication not found.' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const data: Prisma.JournalPublicationUpdateInput = {};

  if (typeof body.title === 'string') data.title = body.title;
  const typeCandidate = strParam(body.type);
  if (isPublicationType(typeCandidate)) data.type = typeCandidate;
  if ('linkedPageId' in body) data.linkedPageId = strParam(body.linkedPageId) ?? null;
  if ('contentMarkdown' in body) {
    data.contentMarkdown = typeof body.contentMarkdown === 'string' ? body.contentMarkdown : null;
  }
  if ('contentBlocks' in body) {
    data.contentBlocks = Array.isArray(body.contentBlocks) ? body.contentBlocks : Prisma.JsonNull;
  }
  const sourceCandidate = strParam(body.sourceKind);
  if (isSourceKind(sourceCandidate)) data.sourceKind = sourceCandidate;
  if ('workshopDraftId' in body) data.workshopDraftId = strParam(body.workshopDraftId) ?? null;
  if ('seriesId' in body) {
    const nextSeriesId = strParam(body.seriesId) ?? null;
    if (nextSeriesId) {
      const series = await prisma.journalSeries.findFirst({
        where: { id: nextSeriesId, campaignId },
        select: { id: true },
      });
      if (!series) {
        res.status(400).json({ error: 'Series not found in this campaign.' });
        return;
      }
    }
    data.series = nextSeriesId
      ? { connect: { id: nextSeriesId } }
      : { disconnect: true };
  }
  if ('issueNumber' in body) {
    const rawIssue = body.issueNumber;
    if (rawIssue === null) {
      data.issueNumber = null;
    } else if (typeof rawIssue === 'number' && Number.isFinite(rawIssue)) {
      data.issueNumber = Math.max(1, Math.floor(rawIssue));
    }
  }
  if ('tags' in body) {
    const tags = parseTagsInput(body.tags);
    data.tags = (tags ?? []) as unknown as Prisma.InputJsonValue;
  }

  // Status here is limited to archive/unarchive; scheduling flows through /rule
  // and release flows through /release. `released` is never set from here.
  const statusCandidate = strParam(body.status);
  if (statusCandidate === 'archived' || statusCandidate === 'draft') {
    if (existing.status === 'released') {
      res.status(409).json({ error: 'A released publication cannot be moved back to the Planner.' });
      return;
    }
    data.status = statusCandidate;
  }

  await prisma.journalPublication.update({ where: { id }, data });

  const dto = await loadPublicationDTO(campaignId, id);
  res.json({ publication: dto });
}

export async function deleteJournalPublication(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const id = String(req.params.id);
  const existing = await prisma.journalPublication.findFirst({
    where: { id, campaignId },
    select: { id: true, status: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Publication not found.' });
    return;
  }
  const force = !!((req.body ?? {}) as Record<string, unknown>).force;
  if (existing.status === 'released' || existing.status === 'archived') {
    if (force && req.campaign?.isCampaignOwner) {
      // Campaign owners may force-delete released/archived publications.
      await prisma.journalPublication.deleteMany({ where: { id, campaignId } });
      res.status(204).end();
      return;
    }
    res.status(409).json({
      error: 'Released publications are canon and cannot be deleted; archive instead.',
    });
    return;
  }
  await prisma.journalPublication.deleteMany({ where: { id, campaignId } });
  res.status(204).end();
}

// ---------------------------------------------------------------------------
// Release orchestration (JOURNAL_PLANNER_ACCESS).
// ---------------------------------------------------------------------------

export async function updateJournalPublicationRule(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const id = String(req.params.id);
  const existing = await prisma.journalPublication.findFirst({
    where: { id, campaignId },
    select: { id: true, status: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Publication not found.' });
    return;
  }
  if (existing.status === 'released') {
    res.status(409).json({ error: 'A released publication cannot be rescheduled.' });
    return;
  }

  const rule = asReleaseNode((req.body ?? {}).releaseRule);
  await prisma.journalPublication.updateMany({
    where: { id, campaignId },
    data: {
      releaseRule: rule ? (rule as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      status: rule ? 'scheduled' : 'draft',
    },
  });

  const dto = await loadPublicationDTO(campaignId, id);
  res.json({ publication: dto });
}

export async function evaluateJournalPublication(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const id = String(req.params.id);
  const row = (await prisma.journalPublication.findFirst({
    where: { id, campaignId },
    select: DETAIL_SELECT,
  })) as DetailRow | null;
  if (!row) {
    res.status(404).json({ error: 'Publication not found.' });
    return;
  }

  const snapshot = await buildJournalReleaseSnapshot({
    campaignId,
    rules: [asReleaseNode(row.releaseRule)],
  });
  const evaluation = evaluatePublication(row, snapshot);
  await prisma.journalPublication.updateMany({
    where: { id, campaignId },
    data: { lastEvaluatedAt: new Date() },
  });

  res.json({
    planState: evaluation.planState,
    perceivedState: toPerceivedState({ planState: evaluation.planState }),
    contentReadiness: evaluation.contentReadiness,
    releasable: evaluation.releasable,
    diagnostics: evaluation.diagnostics,
  });
}

export async function releaseJournalPublication(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const id = String(req.params.id);
  const triggerKind = (req.body ?? {}).override === true ? 'override' : 'manual';

  try {
    await releasePublicationManually({
      campaignId,
      publicationId: id,
      userId,
      triggerKind,
    });
  } catch (error) {
    if (error instanceof JournalReleaseError) {
      const status =
        error.code === 'NOT_FOUND' ? 404 : error.code === 'CONTENT_NOT_READY' ? 422 : 409;
      res.status(status).json({ error: error.message, code: error.code });
      return;
    }
    throw error;
  }

  const dto = await loadPublicationDTO(campaignId, id);
  res.json({ publication: dto });
}
