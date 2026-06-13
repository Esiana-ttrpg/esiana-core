import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { GripVertical, X } from 'lucide-react';
import {
  CharacterHubRailContent,
  type CharacterHubRailContentProps,
} from '@/components/character/CharacterHubRail';
import {
  clampCharacterHubRailWidth,
  CHARACTER_HUB_RAIL_WIDTH_EVENT,
  CHARACTER_HUB_RAIL_WIDTH_MAX,
  CHARACTER_HUB_RAIL_WIDTH_MIN,
  loadCharacterHubRailWidth,
  saveCharacterHubRailWidth,
} from '@/lib/characterHubRailWidthPreference';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  SURFACE_CONTEXTUAL_CLASS,
  SURFACE_CONTEXTUAL_INLINE_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';

export type CharacterHubContextRailLayout = 'inline' | 'overlay';

interface CharacterHubContextRailProps extends CharacterHubRailContentProps {
  layout: CharacterHubContextRailLayout;
  open?: boolean;
  onClose?: () => void;
  onWidthChange?: (width: number) => void;
}

function RailHeader({ onClose }: { onClose?: () => void }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2.5">
      <div>
        <h2 className="text-sm font-semibold text-contextual-foreground/85">
          Campaign Context
        </h2>
        <p className={`${TYPE_META_CLASS} normal-case tracking-normal opacity-75`}>
          Session presence & cast preview
        </p>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted/80 hover:bg-[rgb(var(--color-focal-rgb)/0.06)] hover:text-foreground/90"
          aria-label="Close campaign context rail"
        >
          <X className="size-5" />
        </button>
      ) : null}
    </header>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      aria-label="Resize campaign context rail"
      className="absolute left-0 top-0 z-[60] hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize md:flex"
      onMouseDown={onMouseDown}
    >
      <GripVertical className="size-3 text-muted" />
    </button>
  );
}

export function CharacterHubContextRail({
  layout,
  open = true,
  onClose,
  onWidthChange,
  ...contentProps
}: CharacterHubContextRailProps) {
  const [panelWidth, setPanelWidth] = useState(loadCharacterHubRailWidth);

  useBodyScrollLock(layout === 'overlay' && open);

  useEffect(() => {
    const onWidthEvent = () => setPanelWidth(loadCharacterHubRailWidth());
    window.addEventListener(CHARACTER_HUB_RAIL_WIDTH_EVENT, onWidthEvent);
    return () => window.removeEventListener(CHARACTER_HUB_RAIL_WIDTH_EVENT, onWidthEvent);
  }, []);

  useEffect(() => {
    onWidthChange?.(panelWidth);
  }, [panelWidth, onWidthChange]);

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const onMove = (moveEvent: MouseEvent) => {
        const next = clampCharacterHubRailWidth(window.innerWidth - moveEvent.clientX);
        setPanelWidth(next);
        saveCharacterHubRailWidth(next);
      };
      const onUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [],
  );

  if (!open) return null;

  const scrollBody = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <CharacterHubRailContent {...contentProps} />
    </div>
  );

  const widthStyle: CSSProperties = {
    width:
      layout === 'inline'
        ? '100%'
        : `min(${panelWidth}px, 92vw)`,
    maxWidth: `${CHARACTER_HUB_RAIL_WIDTH_MAX}px`,
    minWidth: `${CHARACTER_HUB_RAIL_WIDTH_MIN}px`,
    ['--character-hub-rail-width' as string]: `${panelWidth}px`,
  };

  if (layout === 'inline') {
    return (
      <aside
        className={`${SURFACE_CONTEXTUAL_INLINE_CLASS} relative flex max-h-[calc(100dvh-var(--workspace-sticky-top,5rem))] w-full min-w-0 flex-col self-start lg:sticky lg:top-[var(--workspace-sticky-top,5rem)]`}
        style={widthStyle}
        aria-label="Campaign context"
      >
        <ResizeHandle onMouseDown={startResize} />
        <RailHeader />
        {scrollBody}
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close campaign context backdrop"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside
        className={`${SURFACE_CONTEXTUAL_CLASS} fixed inset-y-0 right-0 z-50 flex max-h-[100dvh] flex-col overflow-hidden rounded-none shadow-xl`}
        style={widthStyle}
        aria-label="Campaign context"
      >
        <ResizeHandle onMouseDown={startResize} />
        <RailHeader onClose={onClose} />
        {scrollBody}
      </aside>
    </>
  );
}
