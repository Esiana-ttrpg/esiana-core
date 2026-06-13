import { prisma } from './prisma.js';
import { normalizeEnsembleConfig, type EnsembleConfig } from './ensembleConfig.js';
import { resolveMemberIdentityDisplay } from './memberIdentity.js';
import { resolveUserDisplayName } from './userDisplay.js';
import { canViewWikiPage } from './wikiTree.js';
import { buildContentSnippet } from './wikiCategories.js';
import { parseQuestMetadata } from './questMetadata.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';

export type EnsembleBundleMember = {
  userId: string;
  playerLabel: string;
  identityPageId: string | null;
};

export type EnsembleBundleQuestPursuit = {
  id: string;
  title: string;
  questStatus: string;
  snippet: string | null;
};

export type EnsembleBundle = {
  config: EnsembleConfig;
  members: EnsembleBundleMember[];
  pursuits: EnsembleBundleQuestPursuit[];
  campaignName: string;
};

function isPlayerRole(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.PARTICIPANT ||
    role === CampaignMemberRoles.OBSERVER ||
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  );
}

export async function buildEnsembleBundle(
  campaignId: string,
  role: CampaignMemberRole | null,
): Promise<EnsembleBundle | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      name: true,
      ensembleConfig: true,
    },
  });

  if (!campaign) return null;

  const config = normalizeEnsembleConfig(campaign.ensembleConfig);

  const [memberships, questPages] = await Promise.all([
    prisma.campaignMember.findMany({
      where: { campaignId },
      select: {
        userId: true,
        role: true,
        identityPageId: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        identityPage: {
          select: {
            id: true,
            title: true,
            visibility: true,
            templateType: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    config.featuredQuestIds.length > 0
      ? prisma.wikiPage.findMany({
          where: {
            campaignId,
            id: { in: config.featuredQuestIds },
          },
          select: {
            id: true,
            title: true,
            visibility: true,
            metadata: true,
            blocks: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const rosterMembers: EnsembleBundleMember[] = [];

  for (const [index, member] of memberships.entries()) {
    if (!isPlayerRole(member.role as CampaignMemberRole)) continue;

    const identity = resolveMemberIdentityDisplay({
      user: member.user,
      identityPage: member.identityPage,
      index,
    });

    rosterMembers.push({
      userId: member.userId,
      playerLabel: resolveUserDisplayName(member.user),
      identityPageId: identity.identityPageId,
    });
  }

  const pursuits: EnsembleBundleQuestPursuit[] = [];
  const questById = new Map(questPages.map((page) => [page.id, page]));

  for (const questId of config.featuredQuestIds) {
    const page = questById.get(questId);
    if (!page) continue;
    if (!canViewWikiPage(page.visibility, role)) continue;
    const questMeta = parseQuestMetadata(page.metadata);
    pursuits.push({
      id: page.id,
      title: page.title,
      questStatus: questMeta.questStatus,
      snippet: buildContentSnippet(page.blocks as never) || null,
    });
  }

  return {
    config,
    members: rosterMembers,
    pursuits,
    campaignName: campaign.name,
  };
}
