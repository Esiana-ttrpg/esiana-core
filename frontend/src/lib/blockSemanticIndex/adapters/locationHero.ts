import { parseLocationMetadata } from '@/lib/locationMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const locationHeroAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const location = parseLocationMetadata(pageMetadata);
  const knownForText =
    location.knownFor.length > 0 ? location.knownFor.join(' ') : null;
  const threatsText = location.threats.length > 0 ? location.threats.join(' ') : null;

  return {
    semanticIndexText: joinIndexParts([
      location.locationType,
      location.region,
      location.rulerOrAuthority,
      location.population,
      location.climate,
      knownForText,
      threatsText,
    ]),
    semanticKeywords: [
      location.locationType,
      location.region,
      location.climate,
      knownForText,
      threatsText,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      location.regionPageId,
      location.mapPageId,
      ...location.relatedLocationIds,
    ].filter((id): id is string => Boolean(id)),
  };
};
