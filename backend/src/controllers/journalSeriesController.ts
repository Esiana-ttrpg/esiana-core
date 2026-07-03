import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { asReleaseNode } from '../lib/journalReleaseService.js';
import {
  generateNextIssueNow,
  JournalSeriesError,
} from '../lib/journalSeriesService.js';
import { buildSeriesDTOs } from '../lib/journalPresentation.js';
import {
  DEFAULT_JOURNAL_PUBLICATION_TYPE,
  JOURNAL_PUBLICATION_TYPES,
  JOURNAL_SERIES_MODES,
  type JournalPublicationType,
  type JournalSeriesMode,
} from '../../../shared/journalPublication.js';

function strParam(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPublicationType(value: string | undefined): value is JournalPublicationType {
  return value !== undefined && (JOURNAL_PUBLICATION_TYPES as readonly string[]).includes(value);
}

function isSeriesMode(value: string | undefined): value is JournalSeriesMode {
  return value !== undefined && (JOURNAL_SERIES_MODES as readonly string[]).includes(value);
}

async function findSeriesDTO(campaignId: string, id: string) {
  const all = await buildSeriesDTOs(campaignId);
  return all.find((series) => series.id === id) ?? null;
}

export async function listJournalSeries(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const series = await buildSeriesDTOs(campaignId);
  res.json({ series });
}

export async function createJournalSeries(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = (req.body ?? {}) as Record<string, unknown>;

  const name = strParam(body.name);
  if (!name) {
    res.status(400).json({ error: 'A series name is required.' });
    return;
  }
  const typeCandidate = strParam(body.defaultType);
  const defaultType = isPublicationType(typeCandidate)
    ? typeCandidate
    : DEFAULT_JOURNAL_PUBLICATION_TYPE;
  const modeCandidate = strParam(body.seriesMode);
  const seriesMode = isSeriesMode(modeCandidate) ? modeCandidate : 'live';
  const rule = asReleaseNode(body.nextIssueRule);

  const created = await prisma.journalSeries.create({
    data: {
      campaignId,
      name,
      description: strParam(body.description) ?? null,
      defaultType,
      linkedPageId: strParam(body.linkedPageId) ?? null,
      templateWorkshopDraftId: strParam(body.templateWorkshopDraftId) ?? null,
      namingScheme: strParam(body.namingScheme) ?? null,
      seriesMode,
      ...(rule ? { nextIssueRule: rule as unknown as Prisma.InputJsonValue } : {}),
    },
    select: { id: true },
  });

  const series = await findSeriesDTO(campaignId, created.id);
  res.status(201).json({ series });
}

export async function updateJournalSeries(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const id = String(req.params.id);
  const existing = await prisma.journalSeries.findFirst({
    where: { id, campaignId },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Series not found.' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const data: Prisma.JournalSeriesUpdateInput = {};

  const name = strParam(body.name);
  if (name) data.name = name;
  if ('description' in body) data.description = strParam(body.description) ?? null;
  const typeCandidate = strParam(body.defaultType);
  if (isPublicationType(typeCandidate)) data.defaultType = typeCandidate;
  if ('linkedPageId' in body) data.linkedPageId = strParam(body.linkedPageId) ?? null;
  if ('templateWorkshopDraftId' in body) {
    data.templateWorkshopDraftId = strParam(body.templateWorkshopDraftId) ?? null;
  }
  if ('namingScheme' in body) data.namingScheme = strParam(body.namingScheme) ?? null;
  const modeCandidate = strParam(body.seriesMode);
  if (isSeriesMode(modeCandidate)) data.seriesMode = modeCandidate;
  if ('nextIssueRule' in body) {
    const rule = asReleaseNode(body.nextIssueRule);
    data.nextIssueRule = rule ? (rule as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
  }

  await prisma.journalSeries.updateMany({ where: { id, campaignId }, data });

  const series = await findSeriesDTO(campaignId, id);
  res.json({ series });
}

export async function deleteJournalSeries(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const id = String(req.params.id);
  const existing = await prisma.journalSeries.findFirst({
    where: { id, campaignId },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Series not found.' });
    return;
  }
  // Existing issues detach (seriesId -> null) via the schema onDelete: SetNull.
  await prisma.journalSeries.deleteMany({ where: { id, campaignId } });
  res.status(204).end();
}

export async function generateNextSeriesIssue(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const seriesId = String(req.params.id);

  try {
    const result = await generateNextIssueNow({ campaignId, seriesId, userId });
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    if (error instanceof JournalSeriesError) {
      res.status(404).json({ error: error.message, code: error.code });
      return;
    }
    throw error;
  }
}
