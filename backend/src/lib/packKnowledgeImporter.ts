import {
  createHistoricalAlias,
  createLoreClaim,
} from './loreKnowledgeService.js';

export interface PackKnowledgeHistoricalAlias {
  pageSlug: string;
  name: string;
  label?: string;
  context?: string;
  visibility?: string;
  isSecret?: boolean;
  playerDiscoverable?: boolean;
}

export interface PackKnowledgeLoreClaim {
  pageSlug: string;
  statement: string;
  knowledgeState?: string;
  visibility?: string;
  discoveredViaType?: string;
}

export interface PackKnowledge {
  historicalAliases?: PackKnowledgeHistoricalAlias[];
  loreClaims?: PackKnowledgeLoreClaim[];
}

export function parsePackKnowledge(raw: unknown): PackKnowledge | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as PackKnowledge;
  return {
    historicalAliases: Array.isArray(obj.historicalAliases)
      ? obj.historicalAliases
      : [],
    loreClaims: Array.isArray(obj.loreClaims) ? obj.loreClaims : [],
  };
}

export async function applyPackKnowledge(
  campaignId: string,
  knowledge: PackKnowledge,
  slugToPageId: Map<string, string>,
): Promise<{ aliasCount: number; claimCount: number }> {
  let aliasCount = 0;
  let claimCount = 0;

  for (const alias of knowledge.historicalAliases ?? []) {
    if (!alias.pageSlug || !alias.name?.trim()) continue;
    const pageId = slugToPageId.get(alias.pageSlug.trim());
    if (!pageId) continue;
    await createHistoricalAlias(campaignId, pageId, {
      name: alias.name.trim(),
      label: alias.label,
      context: alias.context,
      visibility: alias.visibility,
      isSecret: alias.isSecret,
      playerDiscoverable: alias.playerDiscoverable,
    });
    aliasCount += 1;
  }

  for (const claim of knowledge.loreClaims ?? []) {
    if (!claim.pageSlug || !claim.statement?.trim()) continue;
    const pageId = slugToPageId.get(claim.pageSlug.trim());
    if (!pageId) continue;
    await createLoreClaim(campaignId, pageId, {
      statement: claim.statement.trim(),
      knowledgeState: claim.knowledgeState,
      visibility: claim.visibility,
      discoveredViaType: claim.discoveredViaType,
    });
    claimCount += 1;
  }

  return { aliasCount, claimCount };
}
