import type { BlockSemanticIndexAdapter } from '../types';
import {
  bracketLabels,
  extractWikiReferenceIds,
  joinIndexParts,
  markdownFromBlock,
  plainTextFromMarkdown,
} from '../utils';

export const proseBlockAdapter: BlockSemanticIndexAdapter = ({ block }) => {
  const rawMarkdown = markdownFromBlock(block);
  return {
    semanticIndexText: plainTextFromMarkdown(rawMarkdown),
    semanticKeywords: bracketLabels(rawMarkdown),
    semanticReferences: extractWikiReferenceIds(rawMarkdown),
  };
};
