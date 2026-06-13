import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { resolveUserDisplayName } from '../lib/userDisplay.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return parsed > 0 ? parsed : fallback;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  return fallback;
}

function clampLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

const activitySelect = {
  id: true,
  actionType: true,
  entityType: true,
  entityId: true,
  entityName: true,
  parentContext: true,
  pageSizeBytes: true,
  deltaBytes: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} as const;

type ActivityRow = {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  parentContext: string | null;
  pageSizeBytes: number | null;
  deltaBytes: number | null;
  createdAt: Date;
  user: { id: string; email: string; displayName: string | null; avatarUrl: string | null };
};

function serializeActivityRow(row: ActivityRow) {
  return {
    id: row.id,
    actionType: row.actionType,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: row.entityName,
    parentContext: row.parentContext,
    pageSizeBytes: row.pageSizeBytes,
    deltaBytes: row.deltaBytes,
    createdAt: row.createdAt.toISOString(),
    user: {
      id: row.user.id,
      label: resolveUserDisplayName(row.user),
      avatarUrl: row.user.avatarUrl ?? null,
    },
  };
}

export async function listCampaignActivity(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = clampLimit(req.query.limit);

  const where = { campaignId };

  const totalCount = await (prisma as any).campaignActivity.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = totalCount === 0 ? 1 : Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const rows = (await (prisma as any).campaignActivity.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    skip,
    take: limit,
    select: activitySelect,
  })) as ActivityRow[];

  res.json({
    activity: rows.map(serializeActivityRow),
    pagination: {
      currentPage: safePage,
      totalPages,
      totalCount,
      limit,
    },
  });
}
