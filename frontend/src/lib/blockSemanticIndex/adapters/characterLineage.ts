import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const characterLineageAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const lineage = parseCharacterLineageMetadata(pageMetadata);

  return {
    semanticIndexText: joinIndexParts([
      lineage.familyId,
      ...lineage.orgAffiliations.map((a) => a.role ?? a.orgId),
    ]),
    semanticReferences: [
      ...lineage.parentLinks.map((l) => l.targetCharacterId),
      ...lineage.spouseLinks.map((l) => l.targetCharacterId),
      ...lineage.orgAffiliations.map((a) => a.orgId),
      ...(lineage.familyId ? [lineage.familyId] : []),
    ].filter((id): id is string => Boolean(id)),
  };
};
