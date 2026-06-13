import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const characterHeroAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const identity = parseCharacterMetadata(pageMetadata);
  const lineage = parseCharacterLineageMetadata(pageMetadata);

  return {
    semanticIndexText: joinIndexParts([
      identity.title,
      identity.profession,
      identity.knownFor,
      identity.activeArc,
      identity.motivation,
      identity.ancestry,
      identity.appearance.pronouns,
      identity.appearance.gender,
      identity.appearance.presentation,
      identity.appearance.summary,
      ...identity.appearance.appearanceTags,
    ]),
    semanticKeywords: [
      identity.profession,
      identity.ancestry,
      identity.status,
      identity.appearance.pronouns,
      identity.appearance.gender,
      identity.appearance.presentation,
      ...identity.appearance.appearanceTags,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      identity.primaryAffiliationId,
      identity.currentLocationId,
      lineage.familyId,
      ...lineage.parentLinks.map((l) => l.targetCharacterId),
      ...lineage.spouseLinks.map((l) => l.targetCharacterId),
      ...lineage.orgAffiliations.map((a) => a.orgId),
    ].filter((id): id is string => Boolean(id)),
  };
};
