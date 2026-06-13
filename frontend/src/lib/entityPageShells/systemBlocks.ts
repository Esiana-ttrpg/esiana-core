import type { WikiPageBlock } from '@/types/wiki';
import { createWikiBlock } from '@/utils/pageTemplates';
import type { EntityPageShell, SystemBlockDef } from './types';

export function isSystemBlock(
  shell: EntityPageShell | null,
  block: WikiPageBlock,
): boolean {
  if (!shell) return false;
  return shell.systemBlocks.some((def) => def.type === block.type);
}

export function getSystemBlockDef(
  shell: EntityPageShell | null,
  type: WikiPageBlock['type'],
): SystemBlockDef | undefined {
  if (!shell) return undefined;
  return shell.systemBlocks.find((def) => def.type === type);
}

export function ensureSystemBlocks(
  shell: EntityPageShell | null,
  blocks: WikiPageBlock[],
): WikiPageBlock[] {
  if (!shell || shell.systemBlocks.length === 0) return blocks;

  let next = [...blocks];
  for (const def of shell.systemBlocks) {
    if (!def.required) continue;
    if (next.some((b) => b.type === def.type)) continue;

    const maxY = next.reduce((max, b) => Math.max(max, b.y + b.h), 0);
    next = [...next, createWikiBlock(def.type, 0, maxY, 3, 1)];
  }
  return next;
}

export function filterShellLayoutBlocks(
  shell: EntityPageShell | null,
  blocks: WikiPageBlock[],
  options: { showGridLines: boolean },
): WikiPageBlock[] {
  if (!shell) return blocks;

  if (options.showGridLines) {
    return blocks;
  }

  return blocks.filter((block) => {
    const def = getSystemBlockDef(shell, block.type);
    return !def?.layoutHidden;
  });
}

export function canDeleteBlock(
  shell: EntityPageShell | null,
  block: WikiPageBlock,
): boolean {
  const def = getSystemBlockDef(shell, block.type);
  if (def?.deleteProtected) return false;
  return true;
}

export function systemBlockGhostLabel(
  shell: EntityPageShell | null,
  block: WikiPageBlock,
): string | null {
  const def = getSystemBlockDef(shell, block.type);
  if (!def?.layoutGridGhost) return null;
  return def.ghostLabel ?? def.role;
}
