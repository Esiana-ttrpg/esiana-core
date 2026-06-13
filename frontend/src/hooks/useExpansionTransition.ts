import { useEffect, useMemo, useRef, useState } from 'react';
import type { Layout } from 'react-grid-layout';
import type { WikiPageBlock } from '@/types/wiki';
import type { BlockDisplayState } from '@/lib/blockDisplayState';
import { buildExpandedStackLayout } from '@/utils/wikiLayoutRuntime';
import { WIKI_GRID_COLS } from '@/utils/wikiGrid';

export type ExpansionPhase = 'idle' | 'width' | 'height';

const WIDTH_MS = 180;
const HEIGHT_MS = 220;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface UseExpansionTransitionArgs {
  blocks: WikiPageBlock[];
  runtimeHeights: Record<string, number>;
  displayState: BlockDisplayState;
  useStackedMobileLayout: boolean;
}

interface UseExpansionTransitionResult {
  phase: ExpansionPhase;
  layoutAnimating: boolean;
  getExpandedWidth: (block: WikiPageBlock) => number;
  getExpandedHeight: (blockId: string) => number;
}

/**
 * Staged expand/collapse: width first, then height (reverse on collapse).
 */
export function useExpansionTransition({
  blocks,
  runtimeHeights,
  displayState,
  useStackedMobileLayout,
}: UseExpansionTransitionArgs): UseExpansionTransitionResult {
  const [phase, setPhase] = useState<ExpansionPhase>('idle');
  const [layoutAnimating, setLayoutAnimating] = useState(false);
  const prevScaleRef = useRef(displayState.scale);
  const prevBlockRef = useRef(displayState.activeBlockId);
  const collapseRef = useRef(false);

  const activeId = displayState.activeBlockId;
  const isExpanded =
    displayState.scale === 'expanded' && activeId != null && !useStackedMobileLayout;

  useEffect(() => {
    const prevScale = prevScaleRef.current;
    const prevBlock = prevBlockRef.current;
    prevScaleRef.current = displayState.scale;
    prevBlockRef.current = displayState.activeBlockId;

    if (useStackedMobileLayout || prefersReducedMotion()) {
      setPhase('idle');
      setLayoutAnimating(false);
      return;
    }

    const enteringExpanded =
      displayState.scale === 'expanded' &&
      activeId != null &&
      (prevScale !== 'expanded' || prevBlock !== activeId);
    const leavingExpanded =
      prevScale === 'expanded' &&
      (displayState.scale !== 'expanded' || prevBlock !== activeId);

    if (!enteringExpanded && !leavingExpanded) {
      if (displayState.scale !== 'expanded') {
        setPhase('idle');
        setLayoutAnimating(false);
      }
      return;
    }

    collapseRef.current = leavingExpanded;
    setLayoutAnimating(true);

    if (leavingExpanded) {
      setPhase('height');
      const t1 = window.setTimeout(() => {
        setPhase('width');
        const t2 = window.setTimeout(() => {
          setPhase('idle');
          setLayoutAnimating(false);
        }, WIDTH_MS);
        return () => window.clearTimeout(t2);
      }, HEIGHT_MS);
      return () => window.clearTimeout(t1);
    }

    setPhase('width');
    const t1 = window.setTimeout(() => {
      setPhase('height');
      const t2 = window.setTimeout(() => {
        setPhase('idle');
        setLayoutAnimating(false);
      }, HEIGHT_MS);
      return () => window.clearTimeout(t2);
    }, WIDTH_MS);
    return () => window.clearTimeout(t1);
  }, [displayState.scale, displayState.activeBlockId, activeId, useStackedMobileLayout]);

  const blockById = useMemo(() => {
    const map = new Map<string, WikiPageBlock>();
    for (const b of blocks) map.set(b.id, b);
    return map;
  }, [blocks]);

  function getExpandedWidth(block: WikiPageBlock): number {
    if (!isExpanded || block.id !== activeId) return block.w;
    if (collapseRef.current && phase === 'width') return block.w;
    return WIKI_GRID_COLS;
  }

  function getExpandedHeight(blockId: string): number {
    const full = runtimeHeights[blockId] ?? blockById.get(blockId)?.h ?? 1;
    if (!isExpanded || blockId !== activeId) return full;
    if (collapseRef.current) {
      if (phase === 'height') return blockById.get(blockId)?.h ?? 1;
      return full;
    }
    if (phase === 'width') return blockById.get(blockId)?.h ?? 1;
    return full;
  }

  return {
    phase,
    layoutAnimating,
    getExpandedWidth,
    getExpandedHeight,
  };
}

export function buildExpandedLayoutItems(
  blocks: WikiPageBlock[],
  runtimeHeights: Record<string, number>,
  displayState: BlockDisplayState,
  expansion: UseExpansionTransitionResult,
): Layout[] {
  const activeId = displayState.activeBlockId;
  const isExpanded =
    displayState.scale === 'expanded' && activeId != null;

  if (!isExpanded || !blocks.some((b) => b.id === activeId)) {
    return blocks.map((block) => ({
      i: block.id,
      x: block.x,
      y: block.y,
      w: block.w,
      h: runtimeHeights[block.id] ?? block.h,
      static: false,
    }));
  }

  return buildExpandedStackLayout(
    blocks,
    activeId,
    runtimeHeights,
    (block) => expansion.getExpandedWidth(block),
    (blockId) => expansion.getExpandedHeight(blockId),
  );
}
