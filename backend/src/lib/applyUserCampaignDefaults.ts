import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  USER_TEMPLATE_RESOURCE_META,
  buildSafetyToolsFromDefaults,
  sanitizeUserCampaignDefaultsPrefs,
  type UserCampaignDefaultsPrefs,
  type UserDefaultsImportSelection,
  type UserTemplateResourceKind,
} from '../lib/userCampaignDefaults.js';
import { WikiVisibility } from '../types/domain.js';

function markdownWikiBlocks(markdown: string) {
  return [
    {
      id: randomUUID(),
      type: 'text-tiptap',
      x: 0,
      y: 0,
      w: 2,
      h: 2,
      content: { markdown },
      isPrivate: false,
    },
  ];
}

async function findRulesResourcesFolderId(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<string | null> {
  const folder = await tx.wikiPage.findFirst({
    where: { campaignId, title: 'Rules/Resources' },
    select: { id: true },
  });
  return folder?.id ?? null;
}

async function upsertTemplateWikiPage(
  tx: Prisma.TransactionClient,
  campaignId: string,
  parentId: string | null,
  kind: UserTemplateResourceKind,
  markdown: string,
): Promise<void> {
  const meta = USER_TEMPLATE_RESOURCE_META[kind];
  const existing = await tx.wikiPage.findFirst({
    where: { campaignId, title: meta.canonicalWikiTitle },
    select: { id: true },
  });

  const blocks = markdownWikiBlocks(markdown) as Prisma.InputJsonValue;

  if (existing) {
    await tx.wikiPage.update({
      where: { id: existing.id },
      data: { blocks, ...(parentId ? { parentId } : {}) },
    });
    return;
  }

  await tx.wikiPage.create({
    data: {
      campaignId,
      title: meta.canonicalWikiTitle,
      parentId,
      visibility: WikiVisibility.PARTY,
      blocks,
    },
  });
}

export async function applyUserCampaignDefaults(
  tx: Prisma.TransactionClient,
  userId: string,
  campaignId: string,
  selection: UserDefaultsImportSelection,
): Promise<void> {
  const [defaultsRow, templateResources, user] = await Promise.all([
    tx.userCampaignDefaults.findUnique({ where: { userId } }),
    tx.userTemplateResource.findMany({ where: { userId } }),
    tx.user.findUnique({
      where: { id: userId },
      select: { defaultPitch: true },
    }),
  ]);

  const prefs = sanitizeUserCampaignDefaultsPrefs(defaultsRow?.prefs ?? {});
  const parentId = await findRulesResourcesFolderId(tx, campaignId);
  const resourceByKind = new Map(templateResources.map((row) => [row.kind, row.markdown]));

  const campaignPatch: Record<string, unknown> = {};

  if (selection.recruitmentPreferences) {
    const recruitment = prefs.recruitmentPrefs ?? {};
    const safetyTools = buildSafetyToolsFromDefaults(prefs);
    if (recruitment.genreThemes?.length) {
      campaignPatch.genreThemes = recruitment.genreThemes;
    }
    if (safetyTools) {
      campaignPatch.safetyTools = safetyTools;
    }
    if (recruitment.externalTools?.length) {
      campaignPatch.externalTools = recruitment.externalTools;
    }
    if (recruitment.contentWarnings) {
      campaignPatch.contentWarnings = recruitment.contentWarnings;
    }
    if (recruitment.equipmentNeeded) {
      campaignPatch.equipmentNeeded = recruitment.equipmentNeeded;
    }
  }

  for (const kind of selection.docs ?? []) {
    const markdown = resourceByKind.get(kind)?.trim();
    if (!markdown) continue;

    await upsertTemplateWikiPage(tx, campaignId, parentId, kind, markdown);
    const includeField = USER_TEMPLATE_RESOURCE_META[kind].includeCampaignField;
    campaignPatch[includeField] = true;
  }

  if (Object.keys(campaignPatch).length > 0) {
    await tx.campaign.update({
      where: { id: campaignId },
      data: campaignPatch as Prisma.CampaignUpdateInput,
    });
  }

  void user;
}

export type { UserCampaignDefaultsPrefs };
