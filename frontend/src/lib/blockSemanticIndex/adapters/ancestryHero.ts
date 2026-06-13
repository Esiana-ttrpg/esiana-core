import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const ancestryHeroAdapter: BlockSemanticIndexAdapter = ({ pageMetadata }) => {
  const ancestry = parseAncestryMetadata(pageMetadata);

  return {
    semanticIndexText: joinIndexParts([
      ancestry.identitySummary,
      ancestry.ancestryType,
      ancestry.homeland,
      ancestry.region,
      ancestry.knownFor,
      ancestry.traditions,
      ancestry.values,
      ancestry.reputation,
      ancestry.language,
      ...ancestry.baselineTraits,
      ...ancestry.addedTraits,
      ...ancestry.societies.map((s) => s.name),
      ...ancestry.societies.map((s) => s.summary),
    ]),
    semanticKeywords: [
      ancestry.ancestryType,
      ancestry.homeland,
      ancestry.region,
      ancestry.knownFor,
      ancestry.entityKind,
      ancestry.populationPresence,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      ancestry.parentAncestryId,
      ancestry.secondaryParentAncestryId,
      ...ancestry.homelandRegionIds,
      ...ancestry.communityRegionIds,
      ...ancestry.diasporaRegionIds,
      ...ancestry.relatedAncestryIds,
      ...ancestry.relatedLocationIds,
      ...ancestry.relatedOrganizationIds,
    ].filter((id): id is string => Boolean(id)),
  };
};
