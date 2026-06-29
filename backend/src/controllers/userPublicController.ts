import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { avatarFilenameFromStoredUrl } from '../lib/avatarPaths.js';
import { streamFileWithCache, contentTypeForFilename } from '../lib/assetStreamHeaders.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { resolveUserDisplayName } from '../lib/userDisplay.js';
import {
  serializeUserPublicFields,
  userPublicFieldsSelect,
} from '../lib/userProfileSerialize.js';
import { CampaignDiscoverability } from '../../../shared/campaignPolicy/discoverability.js';

export async function getPublicUserProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = String(req.params.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userPublicFieldsSelect,
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const dmMemberships = await prisma.campaignMember.findMany({
    where: {
      userId,
      role: CampaignMemberRoles.GAMEMASTER,
      campaign: { discoverability: CampaignDiscoverability.PUBLIC },
    },
    select: {
      campaign: {
        select: {
          id: true,
          name: true,
          handle: true,
          createdAt: true,
          isLookingForGroup: true,
        },
      },
    },
    orderBy: { campaign: { name: 'asc' } },
  });

  res.json({
    profile: {
      id: user.id,
      label: resolveUserDisplayName(user),
      ...serializeUserPublicFields(user),
      hostedCampaigns: dmMemberships.map((row) => ({
        id: row.campaign.id,
        name: row.campaign.name,
        handle: row.campaign.handle,
        createdAt: row.campaign.createdAt.toISOString(),
        isLookingForGroup: row.campaign.isLookingForGroup,
      })),
    },
  });
}

/** Stream a user's profile avatar with private browser caching. */
export async function getUserAvatar(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.id ?? '').trim();
  if (!userId) {
    res.status(400).json({ error: 'User id is required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (!user?.avatarUrl) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }

  const filename = avatarFilenameFromStoredUrl(user.avatarUrl);
  if (!filename) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }

  const filePath = path.join(env.uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Avatar file is missing on disk' });
    return;
  }

  streamFileWithCache(req, res, filePath, contentTypeForFilename(filename));
}
