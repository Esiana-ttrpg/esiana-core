declare module 'react-grid-layout' {
  import React from 'react';

  export interface Layout {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    static?: boolean;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    moved?: boolean;
    placeholder?: boolean;
  }

  export interface GridLayoutProps {
    layout: Layout[];
    cols: number;
    rowHeight: number;
    width: number;
    isDraggable?: boolean;
    isResizable?: boolean;
    containerPadding?: [number, number];
    margin?: [number, number];
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStop?: (layout: Layout[]) => void;
    onResizeStop?: (layout: Layout[]) => void;
    draggableHandle?: string;
    useCSSTransforms?: boolean;
    className?: string;
    children?: React.ReactNode;
  }

  const GridLayout: React.FC<GridLayoutProps>;
  export default GridLayout;
}

declare module 'react-resizable' {
  import React from 'react';

  export interface ResizeCallbackData {
    node: HTMLElement;
    size: { width: number; height: number };
    handle: string;
  }

  export interface ResizeableProps {
    width: number;
    height: number;
    onResize?: (event: React.SyntheticEvent, data: ResizeCallbackData) => void;
    children?: React.ReactNode;
    minConstraints?: [number, number];
    maxConstraints?: [number, number];
    draggableOpts?: Record<string, unknown>;
    resizeHandles?: string[];
    handle?: React.ReactNode;
  }

  export const Resizable: React.FC<ResizeableProps>;
}
