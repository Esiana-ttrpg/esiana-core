import type { WikiPageBlock } from '@/types/wiki';
import { findPrimaryProseBlockId } from '@/lib/workspaceOrchestration';

function stableBlockSnapshot(blocks: WikiPageBlock[]): string {
  return JSON.stringify(
    blocks.map((b) => ({
      id: b.id,
      type: b.type,
      content: b.content,
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
    })),
  );
}

function primaryProseMarkdown(blocks: WikiPageBlock[]): string {
  const proseId = findPrimaryProseBlockId(blocks);
  const block = proseId ? blocks.find((b) => b.id === proseId) : null;
  if (!block) {
    const bio = blocks.find((b) => b.type === 'text-biography');
    const md = (bio?.content as { markdown?: string })?.markdown ?? '';
    if (md.trim()) return md;
    const tiptap = blocks.find((b) => b.type === 'text-tiptap');
    return (tiptap?.content as { markdown?: string })?.markdown ?? '';
  }
  return (block.content as { markdown?: string })?.markdown ?? '';
}

export function shouldConfirmLeaveWikiForWorkshop(input: {
  isLayoutDirty: boolean;
  hasSemanticDirty: boolean;
  blocks: WikiPageBlock[];
  savedBlocks: WikiPageBlock[];
}): boolean {
  const { isLayoutDirty, hasSemanticDirty, blocks, savedBlocks } = input;

  if (!isLayoutDirty && !hasSemanticDirty) return false;

  if (hasSemanticDirty) return true;

  if (stableBlockSnapshot(blocks) === stableBlockSnapshot(savedBlocks)) {
    return false;
  }

  const prose = primaryProseMarkdown(blocks).trim();
  const savedProse = primaryProseMarkdown(savedBlocks).trim();
  if (!prose && !savedProse) {
    const withoutProseDiff =
      stableBlockSnapshot(blocks.filter((b) => b.type !== 'text-tiptap' && b.type !== 'text-biography')) ===
      stableBlockSnapshot(savedBlocks.filter((b) => b.type !== 'text-tiptap' && b.type !== 'text-biography'));
    if (withoutProseDiff) return false;
  }

  return isLayoutDirty;
}
