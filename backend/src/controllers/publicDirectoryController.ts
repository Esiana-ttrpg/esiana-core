import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { CampaignMemberRoles, JoinRequestStatus } from '../types/domain.js';
import { deriveUsername, resolveUserDisplayName } from '../lib/userDisplay.js';
import { CampaignDiscoverability } from '../../../shared/campaignPolicy/discoverability.js';

export async function getPublicDirectory(
  _req: Request,
  res: Response,
): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      discoverability: CampaignDiscoverability.PUBLIC,
      isLookingForGroup: true,
    },
    select: {
      id: true,
      name: true,
      handle: true,
      createdAt: true,
      scheduleFrequency: true,
      scheduleDay: true,
      scheduleTime: true,
      currentSession: true,
      sessionDuration: true,
      estimatedLength: true,
      maxSeats: true,
      followers: true,
      _count: {
        select: {
          members: true,
          joinRequests: {
            where: { status: JoinRequestStatus.ACCEPTED },
          },
        },
      },
      members: {
        select: {
          role: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
              publicBio: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json({
    campaigns: campaigns.map((campaign) => {
      const filledSeats = campaign.members.filter(
        (m) =>
          m.role === CampaignMemberRoles.PARTICIPANT ||
          m.role === CampaignMemberRoles.PARTICIPANT,
      ).length;
      const maxSeats = campaign.maxSeats;
      const acceptedMemberCount = campaign._count.members;
      const acceptedJoinRequestCount = campaign._count.joinRequests;
      const followerCount = campaign.followers;
      const seatFillRatio =
        maxSeats > 0 ? Math.min(1, filledSeats / maxSeats) : null;
      const isFull = maxSeats > 0 && filledSeats >= maxSeats;

      const dmRecord = campaign.members.find(
        (m) => m.role === CampaignMemberRoles.GAMEMASTER,
      )?.user;
      const host = dmRecord
        ? {
            id: dmRecord.id,
            displayName: dmRecord.displayName,
            username: deriveUsername(dmRecord.email),
            label: resolveUserDisplayName(dmRecord),
            avatarUrl: dmRecord.avatarUrl,
            publicBio: dmRecord.publicBio,
          }
        : null;

      return {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.handle,
        createdAt: campaign.createdAt.toISOString(),
        host,
        recruitment: {
          scheduleFrequency: campaign.scheduleFrequency,
          scheduleDay: campaign.scheduleDay,
          scheduleTime: campaign.scheduleTime,
          currentSession: campaign.currentSession,
          sessionDuration: campaign.sessionDuration,
          estimatedLength: campaign.estimatedLength,
          maxSeats,
          filledSeats,
          seatFillRatio,
          isFull,
          acceptedMemberCount,
          acceptedJoinRequestCount,
          followerCount,
        },
      };
    }),
  });
}
