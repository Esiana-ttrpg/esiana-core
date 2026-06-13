import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const infoboxAdapter: BlockSemanticIndexAdapter = ({
  pageMetadata,
  templateType = '',
  flatPages = [],
}) => {
  const fields = buildInfoboxProjection(templateType, pageMetadata, flatPages);
  return {
    semanticIndexText: joinIndexParts(fields.map((f) => f.value)),
    semanticKeywords: fields
      .map((f) => f.key)
      .filter((k): k is string => Boolean(k?.trim())),
  };
};
