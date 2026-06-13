import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const orgHeroAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const org = parseOrganizationMetadata(pageMetadata);

  return {
    semanticIndexText: joinIndexParts([
      org.orgType,
      org.motto,
      org.publicPurpose,
      org.publicReputation,
      org.methods,
      org.region,
      org.worldState,
      org.statusReason,
      ...org.currentPressures,
    ]),
    semanticKeywords: [
      org.orgType,
      org.region,
      org.worldState,
      org.influenceMode,
      org.organizationalVisibility,
      org.organizationStatus,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      org.leaderId,
      org.headquartersId,
      org.parentOrgId,
      ...org.strongholdLocationIds,
      ...org.influenceRegionIds,
      ...org.activeTerritoryIds,
      ...org.relations.map((r) => r.targetOrgId),
    ].filter((id): id is string => Boolean(id)),
  };
};
