import type { BlockSemanticIndexAdapter } from '../types';
import { collectStringContentFields, joinIndexParts } from '../utils';

export const genericAdapter: BlockSemanticIndexAdapter = ({ block }) => ({
  semanticIndexText: joinIndexParts([
    block.title,
    ...collectStringContentFields(block.content),
  ]),
});
