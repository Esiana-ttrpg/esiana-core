export type {
  BlockSemanticIndex,
  BlockSemanticIndexAdapter,
  BlockSemanticIndexContext,
  GetBlockSemanticIndexOptions,
  PageBlockSemanticIndexEntry,
  RawBlockSemanticIndex,
} from './types';

export {
  SEMANTIC_INDEX_TEXT_CAP,
  SEMANTIC_KEYWORD_MAX_COUNT,
  SEMANTIC_KEYWORD_MAX_LENGTH,
  SEMANTIC_REFERENCE_MAX_COUNT,
  joinIndexParts,
  normalizeWhitespace,
  markdownFromBlock,
  plainTextFromMarkdown,
  extractWikiReferenceIds,
  bracketLabels,
  normalizeKeywords,
  normalizeReferences,
  normalizeIndexText,
  normalizeBlockSemanticIndex,
} from './utils';

export {
  getBlockSemanticIndex,
  buildBlockSemanticIndex,
  buildPageSemanticIndex,
  semanticAdapterRegistry,
  blockSemanticAdapterRegistry,
} from './registry';
