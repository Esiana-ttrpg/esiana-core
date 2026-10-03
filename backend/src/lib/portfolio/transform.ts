import { prisma } from '../prisma.js';
import { CampaignWorkspace } from '../../../../shared/campaignWorkspaceRoutes.js';
import { WikiVisibility } from '../../types/domain.js';
import {
  assignPathKeyForNewPage,
  loadCampaignWikiPathKeyRows,
} from '../wikiPathKeyService.js';
import { canViewWikiPage } from '../wikiTree.js';
import {
  buildAdventureSnapshot,
  portfolioCharacterInclude,
  serializePortfolioCharacter,
  toPortfolioMetadata,
  normalizeNullableText,
} from './serialize.js';
import { parseCharacterMetadata } from '../characterMetadata.js';

async function findCharactersCategoryParent(campaignId: string): Promise<string | null> {
  const byWorkspace = await prisma.wikiPage.findFirst({
    where: {
      campaignId,
      deletedAt: null,
      workspace: CampaignWorkspace.CHARACTERS,
      parentId: null,
    },
    select: { id: true },
  });
  if (byWorkspace) return byWorkspace.id;

  const byTitle = await prisma.wikiPage.findFirst({
    where: {
      campaignId,
      deletedAt: null,
      title: 'Characters',
      parentId: null,
    },
    select: { id: true },
  });
  return byTitle?.id ?? null;
}

function biographyBlocks(biography: string): Array<Record<string, unknown>> {
  const text = biography.trim();
  if (!text) return [];
  return [
    {
      id: `bio-${Date.now().toString(36)}`,
      type: 'text-biography',
      title: 'Biography',
      x: 0,
      y: 0,
      w: 12,
      h: 6,
      content: { markdown: text },
      isPrivate: false,
      visibility: 'Public',
    },
  ];
}

function extractBiographyFromBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (b.type !== 'text-biography') continue;
    const content = b.content;
    if (content && typeof content === 'object' && !Array.isArray(content)) {
      const md = (content as Record<string, unknown>).markdown;
      if (typeof md === 'string') return md;
      const text = (content as Record<string, unknown>).text;
      if (typeof text === 'string') return text;
    }
  }
  return '';
}

function readImportedFromPortfolioCharacterId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).importedFromPortfolioCharacterId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Find a campaign Character page previously imported from this portfolio character. */
async function findPortfolioImportPage(
  campaignId: string,
  portfolioCharacterId: string,
): Promise<{ id: string } | null> {
  try {
    const matched = await prisma.wikiPage.findFirst({
      where: {
        campaignId,
        deletedAt: null,
        metadata: {
          path: ['importedFromPortfolioCharacterId'],
          equals: portfolioCharacterId,
        },
      },
      select: { id: true },
    });
    if (matched) return matched;
  } catch {
    // Engines without JSON path filters fall through to a scoped scan.
  }

  const candidates = await prisma.wikiPage.findMany({
    where: {
      campaignId,
      deletedAt: null,
      workspace: CampaignWorkspace.CHARACTERS,
    },
    select: { id: true, metadata: true },
  });
  for (const row of candidates) {
    if (readImportedFromPortfolioCharacterId(row.metadata) === portfolioCharacterId) {
      return { id: row.id };
    }
  }
  return null;
}

/**
 * Ensure TO_CAMPAIGN adventure provenance exists for an imported campaign Character page.
 * Does not create or delete wiki pages — provenance only.
 */
async function ensureImportAdventureProvenance(input: {
  portfolioCharacterId: string;
  campaignId: string;
  campaignCharacterPageId: string;
  snapshot: ReturnType<typeof buildAdventureSnapshot>;
}): Promise<string> {
  const existing = await prisma.portfolioCharacterAdventure.findFirst({
    where: {
      portfolioCharacterId: input.portfolioCharacterId,
      campaignId: input.campaignId,
      campaignCharacterPageId: input.campaignCharacterPageId,
    },
    select: { id: true, status: true },
  });
  if (existing) {
    if (existing.status !== 'CURRENT') {
      await prisma.portfolioCharacterAdventure.update({
        where: { id: existing.id },
        data: {
          status: 'CURRENT',
          direction: 'TO_CAMPAIGN',
          unlinkedAt: null,
          snapshot: input.snapshot as object,
        },
      });
    }
    return existing.id;
  }

  const created = await prisma.portfolioCharacterAdventure.create({
    data: {
      portfolioCharacterId: input.portfolioCharacterId,
      campaignId: input.campaignId,
      campaignCharacterPageId: input.campaignCharacterPageId,
      direction: 'TO_CAMPAIGN',
      status: 'CURRENT',
      snapshot: input.snapshot as object,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Import one portfolio character into a campaign as a new Character WikiPage.
 * The source PortfolioCharacter is unchanged; the campaign page is independently owned.
 * PortfolioCharacterAdventure records provenance for this import only — it is not
 * campaign cloning, and provenance failure must not roll back a successful page import.
 */
export async function transformPortfolioToCampaign(input: {
  userId: string;
  portfolioCharacterId: string;
  campaignId: string;
}): Promise<{
  portfolioCharacter: ReturnType<typeof serializePortfolioCharacter>;
  campaignCharacterPageId: string;
  adventureId: string;
}> {
  const character = await prisma.portfolioCharacter.findFirst({
    where: { id: input.portfolioCharacterId, userId: input.userId },
    include: portfolioCharacterInclude,
  });
  if (!character) {
    throw Object.assign(new Error('Portfolio character not found'), { status: 404 });
  }

  const membership = await prisma.campaignMember.findFirst({
    where: { campaignId: input.campaignId, userId: input.userId },
    select: { userId: true },
  });
  if (!membership) {
    throw Object.assign(new Error('Not a member of this campaign'), { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, name: true, handle: true, archivedAt: true },
  });
  if (!campaign || campaign.archivedAt) {
    throw Object.assign(new Error('Campaign not found'), { status: 404 });
  }

  const identity = parseCharacterMetadata(
    (character.metadata && typeof character.metadata === 'object'
      ? character.metadata
      : {}) as Record<string, unknown>,
  );

  const snapshot = buildAdventureSnapshot({
    campaignTitle: campaign.name,
    campaignHandle: campaign.handle,
    roleLabel: character.roleLabel ?? identity.profession,
    levelStart: character.levelLabel,
    levelEnd: character.levelLabel,
    startedAt: new Date().toISOString(),
  });

  // Idempotent recovery at the character-import boundary (not campaign-wide).
  const existingAdventure = await prisma.portfolioCharacterAdventure.findFirst({
    where: {
      portfolioCharacterId: character.id,
      campaignId: campaign.id,
      direction: 'TO_CAMPAIGN',
      status: 'CURRENT',
      campaignCharacterPageId: { not: null },
    },
    select: { id: true, campaignCharacterPageId: true },
  });
  if (existingAdventure?.campaignCharacterPageId) {
    const pageStillExists = await prisma.wikiPage.findFirst({
      where: {
        id: existingAdventure.campaignCharacterPageId,
        campaignId: campaign.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (pageStillExists) {
      const refreshed = await prisma.portfolioCharacter.findUniqueOrThrow({
        where: { id: character.id },
        include: portfolioCharacterInclude,
      });
      return {
        portfolioCharacter: serializePortfolioCharacter(refreshed),
        campaignCharacterPageId: pageStillExists.id,
        adventureId: existingAdventure.id,
      };
    }
  }

  let pageId: string | null = null;
  const priorImport = await findPortfolioImportPage(campaign.id, character.id);
  if (priorImport) {
    pageId = priorImport.id;
  } else {
    const parentId = await findCharactersCategoryParent(input.campaignId);

    const metadata: Record<string, unknown> = {
      entityCategory: 'characters',
      profession: character.roleLabel ?? identity.profession,
      title: identity.title,
      ancestry: identity.ancestry,
      status: identity.status,
      knownFor: identity.knownFor,
      activeArc: identity.activeArc,
      motivation: identity.motivation,
      appearance: identity.appearance,
      // Durable marker for per-character import recovery / idempotency.
      importedFromPortfolioCharacterId: character.id,
    };

    const existingRows = await loadCampaignWikiPathKeyRows(input.campaignId);
    const pathRouting = await assignPathKeyForNewPage(
      input.campaignId,
      {
        id: 'pending',
        title: character.name,
        parentId,
        templateType: 'DEFAULT',
        metadata,
      },
      existingRows,
    );

    // Character import commits independently of provenance.
    const page = await prisma.wikiPage.create({
      data: {
        campaignId: input.campaignId,
        title: character.name,
        parentId,
        visibility: WikiVisibility.PARTY,
        metadata: metadata as object,
        blocks: biographyBlocks(character.biography) as object,
        workspace: pathRouting.workspace,
        pathKey: pathRouting.pathKey,
        ownerType: 'USER',
        ownerUserId: input.userId,
        createdByUserId: input.userId,
      },
      select: { id: true },
    });
    pageId = page.id;
  }

  let adventureId: string;
  try {
    adventureId = await ensureImportAdventureProvenance({
      portfolioCharacterId: character.id,
      campaignId: campaign.id,
      campaignCharacterPageId: pageId,
      snapshot,
    });
  } catch (err) {
    // Page import already succeeded — do not roll it back. A retry of this same
    // character import will attach provenance to the existing page.
    throw Object.assign(
      new Error(
        err instanceof Error
          ? `Character imported but adventure provenance failed: ${err.message}`
          : 'Character imported but adventure provenance failed',
      ),
      {
        status: 500,
        campaignCharacterPageId: pageId,
        cause: err,
      },
    );
  }

  const refreshed = await prisma.portfolioCharacter.findUniqueOrThrow({
    where: { id: character.id },
    include: portfolioCharacterInclude,
  });

  return {
    portfolioCharacter: serializePortfolioCharacter(refreshed),
    campaignCharacterPageId: pageId,
    adventureId,
  };
}

/** Clone a campaign wiki character into the user's portfolio + adventure provenance. */
export async function transformCampaignToPortfolio(input: {
  userId: string;
  campaignId: string;
  campaignCharacterPageId: string;
}): Promise<{
  portfolioCharacter: ReturnType<typeof serializePortfolioCharacter>;
  adventureId: string;
}> {
  const membership = await prisma.campaignMember.findFirst({
    where: { campaignId: input.campaignId, userId: input.userId },
    select: { userId: true, role: true },
  });
  if (!membership) {
    throw Object.assign(new Error('Not a member of this campaign'), { status: 403 });
  }

  const page = await prisma.wikiPage.findFirst({
    where: {
      id: input.campaignCharacterPageId,
      campaignId: input.campaignId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      metadata: true,
      blocks: true,
      visibility: true,
      campaign: { select: { id: true, name: true, handle: true } },
    },
  });
  if (!page || !canViewWikiPage(page.visibility, membership.role)) {
    throw Object.assign(new Error('Character page not found'), { status: 404 });
  }

  const meta =
    page.metadata && typeof page.metadata === 'object' && !Array.isArray(page.metadata)
      ? (page.metadata as Record<string, unknown>)
      : {};
  const entityCategory = meta.entityCategory;
  if (entityCategory !== 'characters') {
    throw Object.assign(new Error('Page is not a character'), { status: 400 });
  }

  const identity = parseCharacterMetadata(meta);
  const portfolioMeta = toPortfolioMetadata(meta);
  const biography =
    extractBiographyFromBlocks(page.blocks) ||
    (typeof meta.description === 'string' ? meta.description : '');

  const snapshot = buildAdventureSnapshot({
    campaignTitle: page.campaign.name,
    campaignHandle: page.campaign.handle,
    roleLabel: identity.profession,
    startedAt: new Date().toISOString(),
  });

  const { characterId, adventureId } = await prisma.$transaction(async (tx) => {
    const character = await tx.portfolioCharacter.create({
      data: {
        userId: input.userId,
        name: page.title,
        biography,
        metadata: portfolioMeta as object,
        tagline: normalizeNullableText(identity.knownFor) ?? normalizeNullableText(identity.title),
        roleLabel: normalizeNullableText(identity.profession),
        levelLabel: null,
      },
    });

    const adventure = await tx.portfolioCharacterAdventure.create({
      data: {
        portfolioCharacterId: character.id,
        campaignId: page.campaign.id,
        campaignCharacterPageId: page.id,
        direction: 'FROM_CAMPAIGN',
        status: 'CURRENT',
        snapshot: snapshot as object,
      },
    });

    return { characterId: character.id, adventureId: adventure.id };
  });

  const refreshed = await prisma.portfolioCharacter.findUniqueOrThrow({
    where: { id: characterId },
    include: portfolioCharacterInclude,
  });

  return {
    portfolioCharacter: serializePortfolioCharacter(refreshed),
    adventureId,
  };
}

/** Mark a CURRENT adventure as PAST (explicit leave / unlink). */
export async function markAdventurePast(input: {
  userId: string;
  adventureId: string;
  levelEnd?: string | null;
}): Promise<ReturnType<typeof serializePortfolioCharacter>> {
  const adventure = await prisma.portfolioCharacterAdventure.findFirst({
    where: {
      id: input.adventureId,
      character: { userId: input.userId },
    },
    include: { character: { select: { id: true, levelLabel: true } } },
  });
  if (!adventure) {
    throw Object.assign(new Error('Adventure not found'), { status: 404 });
  }
  if (adventure.status !== 'CURRENT') {
    throw Object.assign(new Error('Adventure is not current'), { status: 400 });
  }

  const snapshot = parseSnapshotWithEnd(adventure.snapshot, {
    endedAt: new Date().toISOString(),
    levelEnd: input.levelEnd ?? adventure.character.levelLabel,
  });

  await prisma.portfolioCharacterAdventure.update({
    where: { id: adventure.id },
    data: {
      status: 'PAST',
      unlinkedAt: new Date(),
      snapshot: snapshot as object,
    },
  });

  const refreshed = await prisma.portfolioCharacter.findUniqueOrThrow({
    where: { id: adventure.character.id },
    include: portfolioCharacterInclude,
  });
  return serializePortfolioCharacter(refreshed);
}

function parseSnapshotWithEnd(
  raw: unknown,
  patch: { endedAt: string; levelEnd: string | null },
) {
  const base = buildAdventureSnapshot({
    campaignTitle: '',
  });
  const parsed =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...base, ...(raw as object) }
      : base;
  return {
    ...parsed,
    endedAt: patch.endedAt,
    levelEnd: patch.levelEnd ?? (parsed as { levelEnd?: string | null }).levelEnd ?? null,
  };
}

/** When campaign wiki character page(s) are deleted, detach portfolio adventures. */
export async function detachAdventuresForDeletedPage(
  pageIds: string | string[],
): Promise<void> {
  const ids = Array.isArray(pageIds) ? pageIds : [pageIds];
  if (ids.length === 0) return;

  const rows = await prisma.portfolioCharacterAdventure.findMany({
    where: { campaignCharacterPageId: { in: ids } },
    select: { id: true, status: true, snapshot: true },
  });
  if (rows.length === 0) return;

  const now = new Date();
  await Promise.all(
    rows.map((row) =>
      prisma.portfolioCharacterAdventure.update({
        where: { id: row.id },
        data: {
          campaignCharacterPageId: null,
          status: 'DETACHED',
          unlinkedAt: row.status === 'CURRENT' ? now : undefined,
          snapshot: {
            ...((row.snapshot && typeof row.snapshot === 'object'
              ? row.snapshot
              : {}) as object),
            endedAt:
              row.status === 'CURRENT'
                ? now.toISOString()
                : (row.snapshot as { endedAt?: string } | null)?.endedAt ?? null,
          },
        },
      }),
    ),
  );
}
