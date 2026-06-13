import type { Layout } from 'react-grid-layout';
import type { ReactNode } from 'react';
import {
  sortBlocksByReadingOrder,
  WIKI_LAYOUT_MARGIN_Y,
} from '@/utils/wikiLayoutRuntime';
import { WIKI_GRID_COLS } from '@/utils/wikiGrid';
import type { WikiPageBlock } from '@/types/wiki';
import type { ExpandedLayoutBehavior } from '@/lib/workspaceOrchestration';
import type { ExpansionPhase } from '@/hooks/useExpansionTransition';
import { SURFACE_SILENT_CLASS } from '@/lib/surfaceLayout';

interface WikiEditorialSurfaceProps {
  blocks: WikiPageBlock[];
  layout: Layout[];
  /** Full-width vertical stack (expanded / mobile reader). */
  stackVertically: boolean;
  /** Reading-mode typography rhythm (focused / immersive / stacked). */
  readerProse?: boolean;
  expandedLayoutBehavior?: ExpandedLayoutBehavior;
  layoutPhase?: ExpansionPhase;
  activeBlockId?: string | null;
  layoutAnimating?: boolean;
  dimInactiveBlocks?: boolean;
  /** Flat quiet work surface — no glow, haze, or compose fades */
  silentWorkSurface?: boolean;
  renderBlock: (block: WikiPageBlock) => ReactNode;
}

function layoutIndex(layout: Layout[]): Map<string, Layout> {
  return new Map(layout.map((item) => [item.i, item]));
}

function blockSectionClass(
  blockId: string,
  activeBlockId: string | null | undefined,
  dimInactiveBlocks: boolean,
  layoutAnimating: boolean,
): string {
  const parts = ['wiki-editorial-block', 'w-full', 'min-w-0'];
  if (blockId === activeBlockId) parts.push('wiki-editorial-block--active');
  if (dimInactiveBlocks && activeBlockId && blockId !== activeBlockId) {
    parts.push('wiki-editorial-block--dimmed');
  }
  if (layoutAnimating) parts.push('wiki-editorial-block--animating');
  return parts.join(' ');
}

/**
 * Document-flow block surface. Vertical sizing comes from content (min-content rows),
 * not react-grid-layout row units. Uses runtime layout only for x/y/w placement.
 */
export function WikiEditorialSurface({
  blocks,
  layout,
  stackVertically,
  readerProse = false,
  silentWorkSurface = false,
  expandedLayoutBehavior = 'editorial-reflow',
  layoutPhase = 'idle',
  activeBlockId = null,
  layoutAnimating = false,
  dimInactiveBlocks = false,
  renderBlock,
}: WikiEditorialSurfaceProps) {
  const byId = layoutIndex(layout);
  const useSilent = silentWorkSurface || readerProse;
  const flowClass = `wiki-editorial-flow flex w-full min-w-0 flex-col gap-3${
    layoutAnimating ? ' wiki-editorial-flow--animating' : ''
  }${readerProse ? ' wiki-reader-prose' : ''}${useSilent ? ` ${SURFACE_SILENT_CLASS}` : ''}`;

  if (stackVertically) {
    const ordered = sortBlocksByReadingOrder(blocks);
    return (
      <div
        className={flowClass}
        data-expand-behavior="prose-stack"
        data-layout-phase={layoutPhase}
      >
        {ordered.map((block) => (
          <section
            key={block.id}
            id={`codex-block-${block.id}`}
            className={`${blockSectionClass(
              block.id,
              activeBlockId,
              dimInactiveBlocks,
              layoutAnimating,
            )} scroll-mt-20`}
            data-codex-block-id={block.id}
          >
            {renderBlock(block)}
          </section>
        ))}
      </div>
    );
  }

  const gridBehavior =
    expandedLayoutBehavior === 'dense-grid'
      ? 'dense-grid'
      : expandedLayoutBehavior;

  return (
    <div
      className={`wiki-editorial-grid w-full min-w-0${
        layoutAnimating ? ' wiki-editorial-grid--animating' : ''
      }${readerProse ? ' wiki-reader-prose' : ''}${useSilent ? ` ${SURFACE_SILENT_CLASS}` : ''}`}
      data-expand-behavior={gridBehavior}
      data-layout-phase={layoutPhase}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${WIKI_GRID_COLS}, minmax(0, 1fr))`,
        gap: `${WIKI_LAYOUT_MARGIN_Y}px`,
        gridAutoRows: 'min-content',
        alignContent: 'start',
      }}
    >
      {blocks.map((block) => {
        const item = byId.get(block.id);
        const x = item?.x ?? block.x;
        const w = item?.w ?? block.w;
        const y = item?.y ?? block.y;
        return (
          <section
            key={block.id}
            id={`codex-block-${block.id}`}
            className={`${blockSectionClass(
              block.id,
              activeBlockId,
              dimInactiveBlocks,
              layoutAnimating,
            )} scroll-mt-20`}
            style={{
              gridColumn: `${x + 1} / span ${Math.min(w, WIKI_GRID_COLS)}`,
              gridRow: y + 1,
            }}
            data-codex-block-id={block.id}
          >
            {renderBlock(block)}
          </section>
        );
      })}
    </div>
  );
}
