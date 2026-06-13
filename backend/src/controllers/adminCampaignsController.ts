import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { deleteCampaignAssetFiles } from '../lib/assetFiles.js';
import { buildFullCampaignBundle } from '../lib/campaignBackup.js';
import { buildSovereignExport } from '../lib/campaignExport/buildSovereignExport.js';
import { buildCampaignBackupZip } from '../lib/campaignExport/buildCampaignBackupZip.js';
import {
  buildFileSizeFields,
  sumAssetUrlBytes,
} from '../lib/campaignMediaSize.js';
import { appendSystemLog } from '../lib/systemLogBuffer.js';
import { CampaignMemberRoles } from '../types/domain.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const SORT_BY_VALUES = ['title', 'createdAt', 'fileSize'] as const;
type SortBy = (typeof SORT_BY_VALUES)[number];
type SortOrder = 'asc' | 'desc';

type CampaignListRow = {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{ role: string; user: { email: string } }>;
  assets: Array<{ url: string }>;
};

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

function resolveOwnerEmail(
  members: Array<{ role: string; user: { email: string } }>,
): string | null {
  const dm = members.find((m) => m.role === CampaignMemberRoles.GAMEMASTER);
  if (dm) return dm.user.email;
  return members[0]?.user.email ?? null;
}

function parseSearchQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseSortParams(query: AuthenticatedRequest['query']): {
  sortBy: SortBy;
  sortOrder: SortOrder;
} {
  const hasSortConfig =
    typeof query.sortBy === 'string' || typeof query.sortOrder === 'string';

  if (!hasSortConfig) {
    return { sortBy: 'fileSize', sortOrder: 'desc' };
  }

  const sortByRaw = typeof query.sortBy === 'string' ? query.sortBy : '';
  const sortBy = SORT_BY_VALUES.includes(sortByRaw as SortBy)
    ? (sortByRaw as SortBy)
    : 'fileSize';

  const sortOrder: SortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
}

function buildSearchWhere(search: string): Prisma.CampaignWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { name: { contains: search } },
      {
        members: {
          some: {
            user: { email: { contains: search } },
          },
        },
      },
    ],
  };
}

function matchesSearchCaseInsensitive(
  row: CampaignListRow,
  search: string,
): boolean {
  const needle = search.toLowerCase();
  const titleMatch = row.name.toLowerCase().includes(needle);
  const emailMatch = row.members.some((member) =>
    member.user.email.toLowerCase().includes(needle),
  );
  return titleMatch || emailMatch;
}

function serializeCampaignRow(row: CampaignListRow) {
  const bytes = sumAssetUrlBytes(row.assets.map((a) => a.url));
  const sizeFields = buildFileSizeFields(bytes);
  return {
    id: row.id,
    title: row.name,
    slug: row.handle,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerEmail: resolveOwnerEmail(row.members),
    ...sizeFields,
  };
}

type SerializedCampaign = ReturnType<typeof serializeCampaignRow>;

function sortCampaignRows(
  rows: SerializedCampaign[],
  sortBy: SortBy,
  sortOrder: SortOrder,
): SerializedCampaign[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'fileSize') {
      cmp = a.fileSize - b.fileSize;
    } else if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    } else {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (cmp === 0) {
      cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    }
    return cmp * direction;
  });
}

export async function listAdminCampaigns(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;
  const search = parseSearchQuery(req.query.search);
  const { sortBy, sortOrder } = parseSortParams(req.query);

  const campaignSelect = {
    id: true,
    name: true,
    handle: true,
    createdAt: true,
    updatedAt: true,
    members: {
      select: {
        role: true,
        user: { select: { email: true } },
      },
    },
    assets: { select: { url: true } },
  } satisfies Prisma.CampaignSelect;

  const where = buildSearchWhere(search);

  const rows = await prisma.campaign.findMany({
    where,
    select: campaignSelect,
  });

  const filtered = search
    ? rows.filter((row) => matchesSearchCaseInsensitive(row, search))
    : rows;

  const serialized = filtered.map(serializeCampaignRow);
  const sorted = sortCampaignRows(serialized, sortBy, sortOrder);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = totalCount === 0 ? 1 : Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * limit, safePage * limit);

  res.json({
    totalCount,
    campaigns: paged,
    pagination: {
      currentPage: safePage,
      totalPages,
      totalCount,
      limit,
    },
    filters: {
      search,
      sortBy,
      sortOrder,
    },
  });
}

export async function downloadAdminCampaignBackup(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.params.campaignId;
  if (!campaignId || typeof campaignId !== 'string') {
    res.status(400).json({ error: 'Campaign id is required' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, handle: true },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const sovereignExport = await buildSovereignExport(campaignId, 'full');
  if (!sovereignExport) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const fullBundle = await buildFullCampaignBundle(campaignId);
  if (!fullBundle) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const files = [
    ...sovereignExport.files,
    {
      path: 'esiana/campaign.json',
      content: JSON.stringify(fullBundle, null, 2),
    },
  ];

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeSlug = campaign.handle.replace(/[^a-z0-9-]+/gi, '-');
  const filename = `esiana-campaign-${safeSlug}-${stamp}.zip`;

  appendSystemLog(
    'info',
    `Campaign full backup started: ${campaign.name} (${campaign.id})`,
  );

  try {
    const zipBuffer = await buildCampaignBackupZip(files);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (err) {
    appendSystemLog(
      'error',
      `Campaign backup stream failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to generate campaign backup' });
    }
  }
}

export async function deleteAdminCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.params.campaignId;
  if (!campaignId || typeof campaignId !== 'string') {
    res.status(400).json({ error: 'Campaign id is required' });
    return;
  }

  const body = req.body as { confirmTitle?: unknown };
  const confirmTitle =
    typeof body.confirmTitle === 'string' ? body.confirmTitle.trim() : '';

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  if (confirmTitle !== campaign.name) {
    res.status(400).json({
      error: 'Confirmation title must exactly match the campaign name',
    });
    return;
  }

  await deleteCampaignAssetFiles(campaignId);
  await prisma.campaign.delete({ where: { id: campaignId } });

  appendSystemLog(
    'warn',
    `Admin deleted campaign "${campaign.name}" (${campaign.id})`,
  );

  res.json({ ok: true, deletedId: campaignId });
}
