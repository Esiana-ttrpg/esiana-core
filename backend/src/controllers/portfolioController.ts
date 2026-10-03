import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  normalizeNullableText,
  portfolioCharacterInclude,
  resolvePortraitUrl,
  serializePortfolioCharacter,
  toPortfolioMetadata,
} from '../lib/portfolio/serialize.js';
import {
  markAdventurePast,
  transformCampaignToPortfolio,
  transformPortfolioToCampaign,
} from '../lib/portfolio/transform.js';
import {
  buildPublicPortfolioProjection,
  derivePortfolioFilter,
  isPortfolioMediaKind,
  parseAdventureSnapshot,
  type PortfolioDerivedFilter,
} from '../../../shared/portfolioCharacter.js';
import { resolveLinkableCampaigns } from '../lib/stats/resolveLinkableCampaigns.js';
import { env } from '../config/env.js';
import path from 'node:path';
import fs from 'node:fs';
import { assertImageFile, UploadValidationError } from '../lib/uploadValidation.js';
import { deleteUploadedFile } from '../lib/assetFiles.js';
import { streamFileWithCache, contentTypeForFilename } from '../lib/assetStreamHeaders.js';

function statusFromError(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return 500;
}

async function loadOwnedCharacter(userId: string, id: string) {
  return prisma.portfolioCharacter.findFirst({
    where: { id, userId },
    include: portfolioCharacterInclude,
  });
}

export async function listPortfolioCharacters(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const filter = String(req.query.filter ?? 'all').toLowerCase();
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const includeArchived = req.query.includeArchived === '1' || req.query.includeArchived === 'true';
  const favoritesOnly = req.query.favorite === '1' || req.query.favorite === 'true';
  const showcasedOnly = req.query.showcased === '1' || req.query.showcased === 'true';

  const rows = await prisma.portfolioCharacter.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(favoritesOnly ? { favoritedAt: { not: null } } : {}),
      ...(showcasedOnly ? { isShowcased: true } : {}),
    },
    include: portfolioCharacterInclude,
    orderBy: [{ favoritedAt: 'desc' }, { updatedAt: 'desc' }],
  });

  let list = rows.map((row) => serializePortfolioCharacter(row));

  if (filter === 'active' || filter === 'past' || filter === 'unassigned') {
    const want = filter.toUpperCase() as PortfolioDerivedFilter;
    list = list.filter((c) => c.derivedFilter === want);
  }

  if (q) {
    list = list.filter((c) => {
      const hay = [c.name, c.tagline, c.roleLabel, c.levelLabel, c.biography]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  const counts = {
    all: rows.filter((r) => includeArchived || r.archivedAt == null).length,
    active: 0,
    past: 0,
    unassigned: 0,
  };
  for (const row of rows) {
    if (!includeArchived && row.archivedAt) continue;
    const d = derivePortfolioFilter(row.adventures);
    if (d === 'ACTIVE') counts.active += 1;
    else if (d === 'PAST') counts.past += 1;
    else counts.unassigned += 1;
  }

  res.json({ characters: list, counts });
}

export async function createPortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const body = req.body as Record<string, unknown>;
  const name = normalizeNullableText(body.name, 200);
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const created = await prisma.portfolioCharacter.create({
    data: {
      userId,
      name,
      biography: typeof body.biography === 'string' ? body.biography : '',
      metadata: toPortfolioMetadata(body.metadata) as object,
      tagline: normalizeNullableText(body.tagline, 200),
      roleLabel: normalizeNullableText(body.roleLabel, 120),
      levelLabel: normalizeNullableText(body.levelLabel, 60),
    },
    include: portfolioCharacterInclude,
  });

  res.status(201).json({ character: serializePortfolioCharacter(created) });
}

export async function getPortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const row = await loadOwnedCharacter(req.user!.id, String(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  res.json({ character: serializePortfolioCharacter(row) });
}

export async function updatePortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const id = String(req.params.id);
  const existing = await prisma.portfolioCharacter.findFirst({
    where: { id, userId },
    select: { id: true, metadata: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = normalizeNullableText(body.name, 200);
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    data.name = name;
  }
  if (typeof body.biography === 'string') data.biography = body.biography;
  if (body.tagline !== undefined) data.tagline = normalizeNullableText(body.tagline, 200);
  if (body.roleLabel !== undefined) data.roleLabel = normalizeNullableText(body.roleLabel, 120);
  if (body.levelLabel !== undefined) data.levelLabel = normalizeNullableText(body.levelLabel, 60);
  if (body.metadata !== undefined) {
    data.metadata = toPortfolioMetadata(body.metadata) as object;
  }

  const updated = await prisma.portfolioCharacter.update({
    where: { id },
    data,
    include: portfolioCharacterInclude,
  });
  res.json({ character: serializePortfolioCharacter(updated) });
}

export async function deletePortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const id = String(req.params.id);
  const existing = await prisma.portfolioCharacter.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  // Clear portrait FK first to avoid circular delete issues.
  await prisma.portfolioCharacter.update({
    where: { id },
    data: { portraitMediaId: null },
  });
  await prisma.portfolioCharacter.delete({ where: { id } });
  res.json({ ok: true });
}

export async function duplicatePortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const source = await loadOwnedCharacter(userId, String(req.params.id));
  if (!source) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  const copyMedia = req.body?.copyMedia === true;

  const created = await prisma.portfolioCharacter.create({
    data: {
      userId,
      name: `${source.name} (Copy)`,
      biography: source.biography,
      metadata: toPortfolioMetadata(source.metadata) as object,
      tagline: source.tagline,
      roleLabel: source.roleLabel,
      levelLabel: source.levelLabel,
      // Do not copy favorite/showcase/archive or adventures.
    },
  });

  if (copyMedia && source.media.length > 0) {
    for (const m of source.media) {
      const media = await prisma.portfolioCharacterMedia.create({
        data: {
          portfolioCharacterId: created.id,
          userAssetId: m.userAsset.id,
          kind: m.kind,
          caption: m.caption,
          sortOrder: m.sortOrder,
        },
      });
      if (m.kind === 'PORTRAIT' && source.portraitMediaId === m.id) {
        await prisma.portfolioCharacter.update({
          where: { id: created.id },
          data: { portraitMediaId: media.id },
        });
      }
    }
  }

  const refreshed = await loadOwnedCharacter(userId, created.id);
  res.status(201).json({ character: serializePortfolioCharacter(refreshed!) });
}

export async function toggleFavoritePortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const id = String(req.params.id);
  const existing = await prisma.portfolioCharacter.findFirst({
    where: { id, userId },
    select: { id: true, favoritedAt: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  const favorited = req.body?.favorite === true || (req.body?.favorite == null && !existing.favoritedAt);
  const updated = await prisma.portfolioCharacter.update({
    where: { id },
    data: { favoritedAt: favorited ? new Date() : null },
    include: portfolioCharacterInclude,
  });
  res.json({ character: serializePortfolioCharacter(updated) });
}

export async function archivePortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const id = String(req.params.id);
  const existing = await prisma.portfolioCharacter.findFirst({
    where: { id, userId },
    select: { id: true, archivedAt: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  const archive = req.body?.archive !== false;
  const updated = await prisma.portfolioCharacter.update({
    where: { id },
    data: { archivedAt: archive ? new Date() : null },
    include: portfolioCharacterInclude,
  });
  res.json({ character: serializePortfolioCharacter(updated) });
}

/** Explicit showcase membership change — not order-nulling. */
export async function setShowcasePortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const id = String(req.params.id);
  const existing = await prisma.portfolioCharacter.findFirst({
    where: { id, userId },
    select: { id: true, isShowcased: true, showcaseOrder: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  const showcased = req.body?.showcased === true;
  if (showcased) {
    const max = await prisma.portfolioCharacter.aggregate({
      where: { userId, isShowcased: true },
      _max: { showcaseOrder: true },
    });
    const nextOrder = (max._max.showcaseOrder ?? -1) + 1;
    const updated = await prisma.portfolioCharacter.update({
      where: { id },
      data: { isShowcased: true, showcaseOrder: nextOrder },
      include: portfolioCharacterInclude,
    });
    res.json({ character: serializePortfolioCharacter(updated) });
    return;
  }

  const updated = await prisma.portfolioCharacter.update({
    where: { id },
    data: { isShowcased: false, showcaseOrder: null },
    include: portfolioCharacterInclude,
  });
  res.json({ character: serializePortfolioCharacter(updated) });
}

export async function reorderShowcasePortfolioCharacters(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const orderedIds = Array.isArray(req.body?.orderedIds)
    ? (req.body.orderedIds as unknown[]).map(String)
    : null;
  if (!orderedIds || orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds is required' });
    return;
  }

  const showcased = await prisma.portfolioCharacter.findMany({
    where: { userId, isShowcased: true },
    select: { id: true },
  });
  const showcasedSet = new Set(showcased.map((r) => r.id));
  for (const id of orderedIds) {
    if (!showcasedSet.has(id)) {
      res.status(400).json({ error: 'All orderedIds must be showcased characters you own' });
      return;
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.portfolioCharacter.update({
        where: { id },
        data: { showcaseOrder: index },
      }),
    ),
  );

  const rows = await prisma.portfolioCharacter.findMany({
    where: { userId, isShowcased: true },
    include: portfolioCharacterInclude,
    orderBy: { showcaseOrder: 'asc' },
  });
  res.json({ characters: rows.map((r) => serializePortfolioCharacter(r)) });
}

export async function bulkPortfolioCharacterActions(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).map(String) : [];
  const action = String(req.body?.action ?? '');
  if (ids.length === 0) {
    res.status(400).json({ error: 'ids required' });
    return;
  }

  const owned = await prisma.portfolioCharacter.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  const ownedIds = owned.map((r) => r.id);
  if (ownedIds.length !== ids.length) {
    res.status(404).json({ error: 'One or more characters not found' });
    return;
  }

  if (action === 'favorite') {
    await prisma.portfolioCharacter.updateMany({
      where: { userId, id: { in: ownedIds } },
      data: { favoritedAt: new Date() },
    });
  } else if (action === 'unfavorite') {
    await prisma.portfolioCharacter.updateMany({
      where: { userId, id: { in: ownedIds } },
      data: { favoritedAt: null },
    });
  } else if (action === 'archive') {
    await prisma.portfolioCharacter.updateMany({
      where: { userId, id: { in: ownedIds } },
      data: { archivedAt: new Date() },
    });
  } else if (action === 'unarchive') {
    await prisma.portfolioCharacter.updateMany({
      where: { userId, id: { in: ownedIds } },
      data: { archivedAt: null },
    });
  } else if (action === 'showcase') {
    const max = await prisma.portfolioCharacter.aggregate({
      where: { userId, isShowcased: true },
      _max: { showcaseOrder: true },
    });
    let next = (max._max.showcaseOrder ?? -1) + 1;
    for (const id of ownedIds) {
      await prisma.portfolioCharacter.update({
        where: { id },
        data: { isShowcased: true, showcaseOrder: next },
      });
      next += 1;
    }
  } else if (action === 'unshowcase') {
    await prisma.portfolioCharacter.updateMany({
      where: { userId, id: { in: ownedIds } },
      data: { isShowcased: false, showcaseOrder: null },
    });
  } else {
    res.status(400).json({ error: 'Unknown action' });
    return;
  }

  const rows = await prisma.portfolioCharacter.findMany({
    where: { userId, id: { in: ownedIds } },
    include: portfolioCharacterInclude,
  });
  res.json({ characters: rows.map((r) => serializePortfolioCharacter(r)) });
}

export async function addPortfolioCharacterToCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const campaignId = String(req.body?.campaignId ?? '').trim();
    if (!campaignId) {
      res.status(400).json({ error: 'campaignId is required' });
      return;
    }
    const result = await transformPortfolioToCampaign({
      userId: req.user!.id,
      portfolioCharacterId: String(req.params.id),
      campaignId,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(statusFromError(err)).json({
      error: err instanceof Error ? err.message : 'Transform failed',
    });
  }
}

export async function addCampaignCharacterToPortfolio(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const campaignId = String(req.params.campaignId ?? req.body?.campaignId ?? '').trim();
    const pageId = String(req.params.pageId ?? '').trim();
    if (!campaignId || !pageId) {
      res.status(400).json({ error: 'campaignId and pageId are required' });
      return;
    }
    const result = await transformCampaignToPortfolio({
      userId: req.user!.id,
      campaignId,
      campaignCharacterPageId: pageId,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(statusFromError(err)).json({
      error: err instanceof Error ? err.message : 'Transform failed',
    });
  }
}

export async function endPortfolioAdventure(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const character = await markAdventurePast({
      userId: req.user!.id,
      adventureId: String(req.params.adventureId),
      levelEnd: normalizeNullableText(req.body?.levelEnd, 60),
    });
    res.json({ character });
  } catch (err) {
    res.status(statusFromError(err)).json({
      error: err instanceof Error ? err.message : 'Failed to end adventure',
    });
  }
}

export async function uploadPortfolioMedia(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const characterId = String(req.params.id);
  const kindRaw = String(req.body?.kind ?? 'GALLERY');
  if (!isPortfolioMediaKind(kindRaw)) {
    res.status(400).json({ error: 'kind must be PORTRAIT or GALLERY' });
    return;
  }

  const character = await prisma.portfolioCharacter.findFirst({
    where: { id: characterId, userId },
    select: { id: true },
  });
  if (!character) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: 'Image file is required' });
    return;
  }

  try {
    const diskPath = path.join(env.uploadsDir, file.filename);
    await assertImageFile(diskPath, file.mimetype, path.extname(file.originalname));
  } catch (err) {
    deleteUploadedFile(file.filename);
    if (err instanceof UploadValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const url = `/uploads/${file.filename}`;
  const asset = await prisma.userAsset.create({
    data: {
      userId,
      url,
      type: 'image',
      displayName: normalizeNullableText(req.body?.displayName, 200),
    },
  });

  const maxOrder = await prisma.portfolioCharacterMedia.aggregate({
    where: { portfolioCharacterId: characterId, kind: kindRaw },
    _max: { sortOrder: true },
  });

  const media = await prisma.portfolioCharacterMedia.create({
    data: {
      portfolioCharacterId: characterId,
      userAssetId: asset.id,
      kind: kindRaw,
      caption: normalizeNullableText(req.body?.caption, 500),
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  if (kindRaw === 'PORTRAIT') {
    await prisma.portfolioCharacter.update({
      where: { id: characterId },
      data: { portraitMediaId: media.id },
    });
  }

  const refreshed = await loadOwnedCharacter(userId, characterId);
  res.status(201).json({ character: serializePortfolioCharacter(refreshed!) });
}

export async function deletePortfolioMedia(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const characterId = String(req.params.id);
  const mediaId = String(req.params.mediaId);

  const media = await prisma.portfolioCharacterMedia.findFirst({
    where: {
      id: mediaId,
      portfolioCharacterId: characterId,
      character: { userId },
    },
    select: { id: true },
  });
  if (!media) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  await prisma.portfolioCharacter.updateMany({
    where: { id: characterId, portraitMediaId: mediaId },
    data: { portraitMediaId: null },
  });
  await prisma.portfolioCharacterMedia.delete({ where: { id: mediaId } });

  const refreshed = await loadOwnedCharacter(userId, characterId);
  res.json({ character: serializePortfolioCharacter(refreshed!) });
}

export async function exportPortfolioCharacter(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const row = await loadOwnedCharacter(req.user!.id, String(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  const character = serializePortfolioCharacter(row);
  res.json({
    format: 'esiana-portfolio-character-v1',
    exportedAt: new Date().toISOString(),
    character: {
      name: character.name,
      biography: character.biography,
      metadata: character.metadata,
      tagline: character.tagline,
      roleLabel: character.roleLabel,
      levelLabel: character.levelLabel,
    },
  });
}

/** Build showcased public projections for a profile user, gated by viewer linkability. */
export async function listShowcasedPublicProjections(
  profileUserId: string,
  viewerUserId?: string | null,
) {
  const rows = await prisma.portfolioCharacter.findMany({
    where: { userId: profileUserId, isShowcased: true, archivedAt: null },
    include: portfolioCharacterInclude,
    orderBy: { showcaseOrder: 'asc' },
  });

  const linkable = await resolveLinkableCampaigns(profileUserId, viewerUserId);
  const linkableIds = new Set(linkable.map((c) => c.id));

  return rows
    .map((row) => {
      const current = (row.adventures ?? []).find((a) => a.status === 'CURRENT') ?? null;
      return buildPublicPortfolioProjection({
        id: row.id,
        userId: row.userId,
        name: row.name,
        tagline: row.tagline,
        roleLabel: row.roleLabel,
        levelLabel: row.levelLabel,
        biography: row.biography,
        isShowcased: row.isShowcased,
        metadata: row.metadata,
        portraitUrl: resolvePortraitUrl(row),
        currentAdventure: current
          ? {
              snapshot: (() => {
                const snap = parseAdventureSnapshot(current.snapshot);
                if (!snap.campaignTitle && current.campaign) {
                  snap.campaignTitle = current.campaign.name;
                  snap.campaignHandle = current.campaign.handle;
                }
                return snap;
              })(),
              campaignLinkable: linkableIds.has(current.campaignId),
            }
          : null,
      });
    })
    .filter((p): p is NonNullable<typeof p> => p != null);
}

export async function getPublicPortfolioCharacter(
  req: Request,
  res: Response,
): Promise<void> {
  const profileUserId = String(req.params.id);
  const characterId = String(req.params.characterId);
  const viewerUserId =
    (req as AuthenticatedRequest).user?.id ?? null;

  const row = await prisma.portfolioCharacter.findFirst({
    where: { id: characterId, userId: profileUserId },
    include: portfolioCharacterInclude,
  });
  if (!row) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  const isOwner = viewerUserId === profileUserId;
  if (!row.isShowcased && !isOwner) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  if (isOwner && !row.isShowcased) {
    // Owner may view management payload.
    res.json({
      character: serializePortfolioCharacter(row),
      public: false,
    });
    return;
  }

  const linkable = await resolveLinkableCampaigns(profileUserId, viewerUserId);
  const linkableIds = new Set(linkable.map((c) => c.id));
  const current = (row.adventures ?? []).find((a) => a.status === 'CURRENT') ?? null;

  const projection = buildPublicPortfolioProjection({
    id: row.id,
    userId: row.userId,
    name: row.name,
    tagline: row.tagline,
    roleLabel: row.roleLabel,
    levelLabel: row.levelLabel,
    biography: row.biography,
    isShowcased: row.isShowcased,
    metadata: row.metadata,
    portraitUrl: resolvePortraitUrl(row),
    currentAdventure: current
      ? {
          snapshot: {
            campaignTitle: current.campaign?.name ?? '',
            campaignHandle: current.campaign?.handle ?? null,
            roleLabel: null,
            levelStart: null,
            levelEnd: null,
            startedAt: null,
            endedAt: null,
            sessionCount: null,
            oneShot: false,
            visibilityHint: null,
          },
          campaignLinkable: linkableIds.has(current.campaignId),
        }
      : null,
  });

  // Richer public editorial payload (still allowlisted — no full metadata dump).
  const publicAdventures = (row.adventures ?? []).map((a) => {
    const linkableCampaign = linkableIds.has(a.campaignId);
    const snap =
      a.snapshot && typeof a.snapshot === 'object' && !Array.isArray(a.snapshot)
        ? (a.snapshot as Record<string, unknown>)
        : {};
    return {
      id: a.id,
      status: a.status === 'CURRENT' ? 'CURRENT' : 'PAST',
      campaignTitle: linkableCampaign
        ? a.campaign?.name ?? (typeof snap.campaignTitle === 'string' ? snap.campaignTitle : null)
        : null,
      campaignHandle: linkableCampaign ? a.campaign?.handle ?? null : null,
      roleLabel: typeof snap.roleLabel === 'string' ? snap.roleLabel : null,
      levelStart: typeof snap.levelStart === 'string' ? snap.levelStart : null,
      levelEnd: typeof snap.levelEnd === 'string' ? snap.levelEnd : null,
      startedAt: typeof snap.startedAt === 'string' ? snap.startedAt : a.linkedAt.toISOString(),
      endedAt: typeof snap.endedAt === 'string' ? snap.endedAt : a.unlinkedAt?.toISOString() ?? null,
      sessionCount: typeof snap.sessionCount === 'number' ? snap.sessionCount : null,
      oneShot: snap.oneShot === true,
      genericLabel: linkableCampaign
        ? null
        : a.status === 'CURRENT'
          ? 'Currently adventuring'
          : 'Past adventure',
    };
  });

  const publicMedia = (row.media ?? []).map((m) => ({
    id: m.id,
    kind: m.kind,
    caption: m.caption,
    sortOrder: m.sortOrder,
    url: m.userAsset.url,
    thumbnailUrl: m.userAsset.thumbnailUrl ?? m.userAsset.url,
  }));

  res.json({
    character: projection,
    biography: row.biography,
    adventures: publicAdventures,
    media: publicMedia,
    public: true,
  });
}

/** Optional: stream user asset if owner or showcased character references it. */
export async function getUserAssetFile(req: Request, res: Response): Promise<void> {
  const assetId = String(req.params.assetId);
  const asset = await prisma.userAsset.findUnique({
    where: { id: assetId },
    select: { url: true, userId: true },
  });
  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  const viewerId = (req as AuthenticatedRequest).user?.id ?? null;
  if (viewerId !== asset.userId) {
    // Allow if referenced by a showcased character of this user.
    const referenced = await prisma.portfolioCharacterMedia.findFirst({
      where: {
        userAssetId: assetId,
        character: { userId: asset.userId, isShowcased: true },
      },
      select: { id: true },
    });
    if (!referenced) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
  }

  const filename = asset.url.replace(/^\/uploads\//, '');
  const filePath = path.join(env.uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File missing' });
    return;
  }
  streamFileWithCache(req, res, filePath, contentTypeForFilename(filename));
}
