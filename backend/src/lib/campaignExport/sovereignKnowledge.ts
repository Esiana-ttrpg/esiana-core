import { prisma } from '../prisma.js';
import { generateHandle } from '../handleUtils.js';
import {
  applyPackKnowledge,
  parsePackKnowledge,
  type PackKnowledge,
} from '../packKnowledgeImporter.js';

export const SOVEREIGN_KNOWLEDGE_PATH = 'sovereign/knowledge.json' as const;

export function resolveWikiPageSlug(
  page: { title: string; metadata: unknown },
  frontMatterSlug?: string | null,
): string {
  const fromFm = frontMatterSlug?.trim();
  if (fromFm) return fromFm;
  const meta = page.metadata as Record<string, unknown> | null;
  if (typeof meta?.packSlug === 'string' && meta.packSlug.trim()) {
    return meta.packSlug.trim();
  }
  if (typeof meta?.slug === 'string' && meta.slug.trim()) {
    return meta.slug.trim();
  }
  return generateHandle(page.title);
}

export async function buildKnowledgePayload(
  campaignId: string,
): Promise<PackKnowledge> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, metadata: true },
  });
  const slugByPageId = new Map(
    pages.map((page) => [page.id, resolveWikiPageSlug(page)]),
  );

  const [aliases, claims] = await Promise.all([
    prisma.entityHistoricalAlias.findMany({
      where: { campaignId },
      orderBy: [{ pageId: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.loreClaim.findMany({
      where: { campaignId },
      orderBy: [{ pageId: 'asc' }, { sortOrder: 'asc' }],
    }),
  ]);

  return {
    historicalAliases: aliases
      .map((alias) => {
        const pageSlug = slugByPageId.get(alias.pageId);
        if (!pageSlug) return null;
        return {
          pageSlug,
          name: alias.name,
          label: alias.label ?? undefined,
          context: alias.context ?? undefined,
          visibility: alias.visibility,
          isSecret: alias.isSecret,
          playerDiscoverable: alias.playerDiscoverable,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null),
    loreClaims: claims
      .map((claim) => {
        const pageSlug = slugByPageId.get(claim.pageId);
        if (!pageSlug) return null;
        return {
          pageSlug,
          statement: claim.statement,
          knowledgeState: claim.knowledgeState ?? undefined,
          visibility: claim.visibility,
          discoveredViaType: claim.discoveredViaType ?? undefined,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null),
  };
}

export async function restoreKnowledgePayload(
  campaignId: string,
  raw: unknown,
  slugToPageId: Map<string, string>,
): Promise<{ aliasCount: number; claimCount: number }> {
  const knowledge = parsePackKnowledge(raw);
  if (!knowledge) {
    return { aliasCount: 0, claimCount: 0 };
  }
  return applyPackKnowledge(campaignId, knowledge, slugToPageId);
}
