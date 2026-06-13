import type { WikiPageBlock } from '@/types/wiki';

export const EVENT_LORE_DESCRIPTION_BLOCK_TITLE = 'Description';

export function findPrimaryDescriptionBlockId(
  blocks: WikiPageBlock[],
): string | null {
  let bestId: string | null = null;
  let bestRank = Number.POSITIVE_INFINITY;

  for (const block of blocks) {
    if (block.type !== 'text-tiptap') continue;
    const rank = block.y * 1000 + block.x;
    if (rank < bestRank) {
      bestRank = rank;
      bestId = block.id;
    }
  }

  return bestId;
}

export function isPrimaryDescriptionBlock(
  block: WikiPageBlock,
  blocks: WikiPageBlock[],
): boolean {
  return findPrimaryDescriptionBlockId(blocks) === block.id;
}
