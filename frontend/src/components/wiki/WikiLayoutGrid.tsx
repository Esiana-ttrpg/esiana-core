import type { ReactNode } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import {
  computeGridContainerHeightPx,
  WIKI_LAYOUT_MARGIN_Y,
} from '@/utils/wikiLayoutRuntime';
import { WIKI_GRID_COLS, WIKI_GRID_ROW_HEIGHT } from '@/utils/wikiGrid';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface WikiLayoutGridProps {
  layout: Layout[];
  gridWidth: number;
  layoutAnimating: boolean;
  isExpandedLayout: boolean;
  showLayoutChrome: boolean;
  onLayoutChange: (nextLayout: Layout[]) => void;
  children: ReactNode;
}

/** Dashboard-style grid for template layout authoring only. */
export function WikiLayoutGrid({
  layout,
  gridWidth,
  layoutAnimating,
  isExpandedLayout,
  showLayoutChrome,
  onLayoutChange,
  children,
}: WikiLayoutGridProps) {
  const containerHeightPx = computeGridContainerHeightPx(layout);

  return (
    <div
      className="wiki-layout-chrome-host w-full min-w-0"
      style={{ height: containerHeightPx, minHeight: containerHeightPx }}
    >
      <GridLayout
        className={`layout wiki-grid-3col wiki-layout-chrome-grid${layoutAnimating ? ' layout-animating' : ''}`}
        layout={layout}
        cols={WIKI_GRID_COLS}
        rowHeight={WIKI_GRID_ROW_HEIGHT}
        width={gridWidth}
        isDraggable={showLayoutChrome && !isExpandedLayout}
        isResizable={false}
        onLayoutChange={onLayoutChange}
        margin={[12, WIKI_LAYOUT_MARGIN_Y]}
        useCSSTransforms
        draggableHandle={showLayoutChrome ? '.widget-drag-handle' : undefined}
      >
        {children}
      </GridLayout>
    </div>
  );
}
