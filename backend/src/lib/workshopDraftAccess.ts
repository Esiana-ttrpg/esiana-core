import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { buildActorFromAclContext } from './acl.js';
import { canEditPage } from '../../../shared/campaignPolicy/policy.js';
import type { PageOwnerType } from '../../../shared/campaignPolicy/pageOwnership.js';
import { prisma } from './prisma.js';

export function buildActorFromCampaignRequest(
  req: CampaignScopedRequest,
  userId: string,
) {
  const campaign = req.campaign!;
  return buildActorFromAclContext({
    userId,
    membershipRole: campaign.role,
    campaignOwnerUserId: campaign.campaignOwnerUserId,
    discoverability: campaign.discoverability,
    allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
    chronologyContributor: campaign.chronologyContributor,
    partyId: campaign.partyId,
    roleCapabilityOverrides: campaign.roleCapabilityOverrides,
  });
}

export async function canEditWikiPageForActor(input: {
  campaignId: string;
  pageId: string;
  actor: ReturnType<typeof buildActorFromCampaignRequest>;
}): Promise<boolean> {
  const page = await prisma.wikiPage.findFirst({
    where: { id: input.pageId, campaignId: input.campaignId, deletedAt: null },
    select: {
      ownerType: true,
      ownerUserId: true,
      ownerPartyId: true,
    },
  });
  if (!page) return false;
  return canEditPage(input.actor, {
    ownerType: page.ownerType as PageOwnerType,
    ownerUserId: page.ownerUserId,
    ownerPartyId: page.ownerPartyId,
  });
}

export async function assertAnchorEditAccess(
  req: CampaignScopedRequest,
  userId: string,
  anchorEntityIds: string[] | undefined,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!anchorEntityIds?.length) return { ok: true };
  const actor = buildActorFromCampaignRequest(req, userId);
  for (const pageId of anchorEntityIds) {
    const allowed = await canEditWikiPageForActor({
      campaignId: req.campaign!.campaignId,
      pageId,
      actor,
    });
    if (!allowed) {
      return { ok: false, status: 403, error: 'Forbidden: cannot edit anchor page' };
    }
  }
  return { ok: true };
}
