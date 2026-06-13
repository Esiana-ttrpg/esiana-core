import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const bestiaryHeroAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const bestiary = parseBestiaryMetadata(pageMetadata);

  return {
    semanticIndexText: joinIndexParts([
      bestiary.creatureType,
      bestiary.habitat,
      bestiary.region,
      bestiary.knownFor,
      bestiary.alsoKnownAs,
      bestiary.temperament,
      bestiary.encounterConditions,
      bestiary.behaviorSummary,
      ...bestiary.weaknesses,
      ...bestiary.resistances,
    ]),
    semanticKeywords: [
      bestiary.creatureType,
      bestiary.habitat,
      bestiary.region,
      bestiary.threatLevel,
      bestiary.temperament,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      ...bestiary.relatedCreatureIds,
      ...bestiary.relatedLocationIds,
    ].filter((id): id is string => Boolean(id)),
  };
};
