import type { Layout } from 'react-grid-layout';
import { getBlockDensityProfile } from '@/lib/surfaceDensityProfile';
import type { WikiPageBlock } from '@/types/wiki';
import { WIKI_GRID_COLS, WIKI_GRID_ROW_HEIGHT } from './wikiGrid';

/** Vertical gap between grid rows (matches RGL `margin[1]` and editorial grid gap). */
export const WIKI_LAYOUT_MARGIN_Y = 12;

/** Approximate layout-chrome header above the widget body. */
export const WIKI_LAYOUT_CHROME_HEADER_PX = 52;

/** Padding inside the widget body when layout chrome is visible. */
export const WIKI_LAYOUT_BODY_PADDING_PX = 24;

/** Read-mode block title above widget body. */
export const WIKI_LAYOUT_READ_TITLE_PX = 28;

export function pixelsToGridRows(contentPx: number, extraPx = 0): number {
  const total = Math.max(0, contentPx + extraPx);
  const rowUnit = WIKI_GRID_ROW_HEIGHT + WIKI_LAYOUT_MARGIN_Y;
  return Math.max(1, Math.ceil(total / rowUnit));
}

export function resolveRuntimeBlockHeight(
  block: WikiPageBlock,
  measuredPx: number | undefined,
  options: {
    showLayoutChrome?: boolean;
    showReadTitle?: boolean;
    minH?: number;
  } = {},
): number {
  const profile = getBlockDensityProfile(block.type);
  const minH = options.minH ?? profile.minH;
  let extra = 0;
  if (options.showLayoutChrome) {
    extra += WIKI_LAYOUT_CHROME_HEADER_PX + WIKI_LAYOUT_BODY_PADDING_PX;
  } else if (options.showReadTitle) {
    extra += WIKI_LAYOUT_READ_TITLE_PX;
  }
  if (measuredPx != null && measuredPx > 0) {
    return Math.max(minH, pixelsToGridRows(measuredPx, extra));
  }
  return Math.max(minH, 1);
}

/** Persisted blocks carry placeholder height; geometry is x, y, w only. */
export function stripHeightsForPersist(blocks: WikiPageBlock[]): WikiPageBlock[] {
  return blocks.map((block) => ({ ...block, h: 1 }));
}

export function mergeLayoutGeometryOnly(
  block: WikiPageBlock,
  layoutItem: Pick<Layout, 'x' | 'y' | 'w'>,
): WikiPageBlock {
  return {
    ...block,
    x: layoutItem.x,
    y: layoutItem.y,
    w: layoutItem.w,
  };
}

/** Reading order for layout reflow (persisted y/x, then stable id). */
export function sortBlocksByReadingOrder(blocks: WikiPageBlock[]): WikiPageBlock[] {
  return [...blocks].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
  );
}

/**
 * Expanded editing: single-column stack so measured heights never collide.
 * Active block keeps staged w/h from the expansion transition.
 */
export function buildExpandedStackLayout(
  blocks: WikiPageBlock[],
  activeId: string,
  runtimeHeights: Record<string, number>,
  resolveActiveWidth: (block: WikiPageBlock) => number,
  resolveActiveHeight: (blockId: string) => number,
): Layout[] {
  const sorted = sortBlocksByReadingOrder(blocks);
  let yAcc = 0;
  const items: Layout[] = [];

  for (const block of sorted) {
    if (block.id === activeId) {
      const h = resolveActiveHeight(block.id);
      const w = resolveActiveWidth(block);
      items.push({
        i: block.id,
        x: 0,
        y: yAcc,
        w,
        h,
        static: true,
      });
      yAcc += h;
      continue;
    }

    const h = runtimeHeights[block.id] ?? Math.max(1, block.h);
    items.push({
      i: block.id,
      x: 0,
      y: yAcc,
      w: WIKI_GRID_COLS,
      h,
      static: true,
    });
    yAcc += h;
  }

  return items;
}

/**
 * Compact/read grid: assign y positions using runtime heights so tiles do not overlap.
 */
export function buildMeasuredCompactLayout(
  blocks: WikiPageBlock[],
  runtimeHeights: Record<string, number>,
): Layout[] {
  const sorted = sortBlocksByReadingOrder(blocks);
  const placed: Layout[] = [];

  for (const block of sorted) {
    const h = runtimeHeights[block.id] ?? Math.max(1, block.h);
    const w = Math.min(block.w, WIKI_GRID_COLS);
    const x = Math.min(Math.max(0, block.x), WIKI_GRID_COLS - w);

    let y = Math.max(0, block.y);
    let collision = true;
    while (collision) {
      collision = false;
      for (const other of placed) {
        const overlapX = x < other.x + other.w && x + w > other.x;
        const overlapY = y < other.y + other.h && y + h > other.y;
        if (overlapX && overlapY) {
          y = other.y + other.h;
          collision = true;
          break;
        }
      }
    }

    placed.push({
      i: block.id,
      x,
      y,
      w,
      h,
      static: false,
    });
  }

  return placed;
}

/**
 * Editorial reflow: active block spans full width; siblings keep compact x/w.
 */
export function buildEditorialReflowLayout(
  blocks: WikiPageBlock[],
  activeId: string,
  runtimeHeights: Record<string, number>,
): Layout[] {
  const compact = buildMeasuredCompactLayout(blocks, runtimeHeights);
  return compact.map((item) =>
    item.i === activeId
      ? { ...item, x: 0, w: WIKI_GRID_COLS, static: true }
      : { ...item, static: true },
  );
}

/**
 * Editorial reflow with staged width on the active block (siblings unchanged).
 */
export function buildEditorialReflowLayoutStaged(
  blocks: WikiPageBlock[],
  activeId: string,
  runtimeHeights: Record<string, number>,
  resolveActiveWidth: (block: WikiPageBlock) => number,
): Layout[] {
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const compact = buildMeasuredCompactLayout(blocks, runtimeHeights);
  return compact.map((item) => {
    if (item.i !== activeId) {
      return { ...item, static: true };
    }
    const block = blockById.get(activeId);
    if (!block) return { ...item, static: true };
    const w = Math.min(resolveActiveWidth(block), WIKI_GRID_COLS);
    const atFullWidth = w >= WIKI_GRID_COLS;
    return {
      ...item,
      x: atFullWidth ? 0 : item.x,
      w,
      static: true,
    };
  });
}

/** Pixel height for RGL container from canonical runtime layout (not persisted h). */
export function computeGridContainerHeightPx(
  layout: Layout[],
  rowHeight = WIKI_GRID_ROW_HEIGHT,
  marginY = WIKI_LAYOUT_MARGIN_Y,
): number {
  if (layout.length === 0) return rowHeight;
  const bottomRow = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  return bottomRow * rowHeight + Math.max(0, bottomRow - 1) * marginY;
}
