import { prisma } from '../prisma.js';
import { CampaignMemberRoles } from '../../types/domain.js';
import { CampaignDiscoverability } from '../../../../shared/campaignPolicy/discoverability.js';
import type { LinkableCampaign } from '../../../../shared/statsTypes.js';

/**
 * Campaigns that may be linked from a public profile.
 * Visibility gates links only — never used for attribution counts.
 */
export async function resolveLinkableCampaigns(
  profileUserId: string,
  viewerUserId?: string | null,
): Promise<LinkableCampaign[]> {
  const isOwner = viewerUserId != null && viewerUserId === profileUserId;

  if (isOwner) {
    const rows = await prisma.campaignMember.findMany({
      where: {
        userId: profileUserId,
        campaign: { archivedAt: null },
      },
      select: {
        campaign: {
          select: {
            id: true,
            name: true,
            handle: true,
            isLookingForGroup: true,
          },
        },
      },
      orderBy: { campaign: { name: 'asc' } },
    });
    return rows.map((row) => ({
      id: row.campaign.id,
      name: row.campaign.name,
      handle: row.campaign.handle,
      isLookingForGroup: row.campaign.isLookingForGroup,
    }));
  }

  const [publicHosted, viewerMemberships] = await Promise.all([
    prisma.campaignMember.findMany({
      where: {
        userId: profileUserId,
        role: CampaignMemberRoles.GAMEMASTER,
        campaign: {
          archivedAt: null,
          discoverability: CampaignDiscoverability.PUBLIC,
        },
      },
      select: {
        campaign: {
          select: {
            id: true,
            name: true,
            handle: true,
            isLookingForGroup: true,
          },
        },
      },
    }),
    viewerUserId
      ? prisma.campaignMember.findMany({
          where: {
            userId: viewerUserId,
            campaign: { archivedAt: null },
          },
          select: { campaignId: true },
        })
      : Promise.resolve([]),
  ]);

  const viewerCampaignIds = new Set(viewerMemberships.map((m) => m.campaignId));

  let memberVisible: LinkableCampaign[] = [];
  if (viewerUserId && viewerCampaignIds.size > 0) {
    const shared = await prisma.campaignMember.findMany({
      where: {
        userId: profileUserId,
        campaignId: { in: [...viewerCampaignIds] },
        campaign: { archivedAt: null },
      },
      select: {
        campaign: {
          select: {
            id: true,
            name: true,
            handle: true,
            isLookingForGroup: true,
          },
        },
      },
    });
    memberVisible = shared.map((row) => ({
      id: row.campaign.id,
      name: row.campaign.name,
      handle: row.campaign.handle,
      isLookingForGroup: row.campaign.isLookingForGroup,
    }));
  }

  const byId = new Map<string, LinkableCampaign>();
  for (const row of publicHosted) {
    byId.set(row.campaign.id, {
      id: row.campaign.id,
      name: row.campaign.name,
      handle: row.campaign.handle,
      isLookingForGroup: row.campaign.isLookingForGroup,
    });
  }
  for (const campaign of memberVisible) {
    byId.set(campaign.id, campaign);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
