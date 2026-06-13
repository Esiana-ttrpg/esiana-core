import { parseLocationMetadata } from '@/lib/locationMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const locationHeroAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const location = parseLocationMetadata(pageMetadata);

  return {
    semanticIndexText: joinIndexParts([
      location.locationType,
      location.region,
      location.rulerOrAuthority,
      location.population,
      location.climate,
      location.knownFor,
    ]),
    semanticKeywords: [
      location.locationType,
      location.region,
      location.climate,
      location.knownFor,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      location.regionPageId,
      location.mapPageId,
      ...location.relatedLocationIds,
    ].filter((id): id is string => Boolean(id)),
  };
};
