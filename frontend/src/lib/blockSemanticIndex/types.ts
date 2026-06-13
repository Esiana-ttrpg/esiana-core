import type { WikiPageBlock, WikiPageBlockType, WikiTreeNode } from '@/types/wiki';

export interface BlockSemanticIndex {
  semanticIndexText: string;
  semanticKeywords: string[];
  semanticReferences: string[];
}

/** Adapter output before central normalization. */
export interface RawBlockSemanticIndex {
  semanticIndexText?: string;
  semanticKeywords?: string[];
  semanticReferences?: string[];
}

export interface BlockSemanticIndexContext {
  block: WikiPageBlock;
  pageMetadata?: unknown;
  templateType?: string;
  /** Required for wiki-infobox projection only */
  flatPages?: WikiTreeNode[];
}

export type BlockSemanticIndexAdapter = (
  ctx: BlockSemanticIndexContext,
) => RawBlockSemanticIndex;

export interface PageBlockSemanticIndexEntry extends BlockSemanticIndex {
  blockId: string;
  blockType: WikiPageBlockType;
}

export interface GetBlockSemanticIndexOptions {
  templateType?: string;
  flatPages?: WikiTreeNode[];
  /** Page-level narrative status label merged into block keywords when set */
  narrativeStatusLabel?: string;
}
