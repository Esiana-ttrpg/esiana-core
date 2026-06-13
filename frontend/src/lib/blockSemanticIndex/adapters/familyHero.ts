import { parseFamilyMetadata } from '@/lib/familyMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const familyHeroAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const family = parseFamilyMetadata(pageMetadata);

  return {
    semanticIndexText: joinIndexParts([
      family.familyType,
      family.status,
      family.region,
      family.coatOfArms,
      family.houseBranch,
      ...family.inheritedTraits,
    ]),
    semanticKeywords: [
      family.familyType,
      family.status,
      family.region,
      family.houseBranch,
      ...family.inheritedTraits,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      family.headCharacterId,
      family.seatLocationId,
    ].filter((id): id is string => Boolean(id)),
  };
};
