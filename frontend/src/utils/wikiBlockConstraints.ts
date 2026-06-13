import type { WikiPageBlock } from '@/types/wiki';
import type { AppearanceMode } from '@/lib/entitySurfaceProfile';
import { getBlockDensityProfile } from '@/lib/surfaceDensityProfile';
import { WIKI_GRID_COLS } from './wikiGrid';

/** Apply semantic min dimensions without shrinking user-intentional w/h. */
export function applyBlockConstraints(block: WikiPageBlock): WikiPageBlock {
  const profile = getBlockDensityProfile(block.type);
  const w = Math.max(block.w, profile.minW);
  const h = Math.max(block.h, profile.minH);
  const x = Math.min(Math.max(0, block.x), WIKI_GRID_COLS - w);
  return { ...block, x, w, h };
}

/** Bump overlapping blocks downward (never change w). */
export function compactLayoutBlocks(blocks: WikiPageBlock[]): WikiPageBlock[] {
  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: WikiPageBlock[] = [];

  for (const block of sorted) {
    let y = block.y;
    let collision = true;
    while (collision) {
      collision = false;
      for (const other of placed) {
        const overlapX = block.x < other.x + other.w && block.x + block.w > other.x;
        const overlapY = y < other.y + other.h && y + block.h > other.y;
        if (overlapX && overlapY) {
          y = other.y + other.h;
          collision = true;
          break;
        }
      }
    }
    placed.push({ ...block, y });
  }
  return placed;
}

export interface LayoutLintIssue {
  id: string;
  severity: 'warning' | 'info';
  message: string;
  blockId?: string;
}

export function lintPageLayout(
  blocks: WikiPageBlock[],
  templateType: string,
  appearanceMode: AppearanceMode = 'none',
): LayoutLintIssue[] {
  const issues: LayoutLintIssue[] = [];
  const t = templateType.trim().toUpperCase();

  if (t === 'CHARACTER' && !blocks.some((b) => b.type === 'entity-hero')) {
    issues.push({
      id: 'missing-hero',
      severity: 'warning',
      message: 'Character pages benefit from a Character Overview block.',
    });
  }

  if (
    appearanceMode === 'full' &&
    !blocks.some((b) => b.type === 'entity-appearance')
  ) {
    issues.push({
      id: 'missing-appearance',
      severity: 'info',
      message: 'Add an Appearance block for summary, tags, and optional portrait.',
    });
  }

  const hasOverlap = (() => {
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        if (
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y
        ) {
          return true;
        }
      }
    }
    return false;
  })();

  if (hasOverlap) {
    issues.push({
      id: 'overlapping-blocks',
      severity: 'info',
      message: 'Some blocks overlap. Resolve overlapping blocks before saving or drag to separate.',
    });
  }

  return issues;
}
