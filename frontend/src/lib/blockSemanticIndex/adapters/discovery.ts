import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

/** Sync-only: block title; lore claims are async and excluded in P1. */
export const discoveryAdapter: BlockSemanticIndexAdapter = ({ block }) => ({
  semanticIndexText: joinIndexParts([block.title]),
});
