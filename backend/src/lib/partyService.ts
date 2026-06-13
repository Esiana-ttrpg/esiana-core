import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function ensureDefaultPartyForCampaign(
  tx: Tx,
  campaignId: string,
  displayName: string,
): Promise<string> {
  const existing = await tx.party.findFirst({
    where: { campaignId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing.id;

  const party = await tx.party.create({
    data: {
      campaignId,
      displayName: displayName.trim() || 'The Party',
    },
    select: { id: true },
  });
  return party.id;
}

export async function linkCampaignMembersToDefaultParty(
  tx: Tx,
  campaignId: string,
  partyId: string,
): Promise<void> {
  await tx.campaignMember.updateMany({
    where: { campaignId, partyId: null },
    data: { partyId },
  });
}
