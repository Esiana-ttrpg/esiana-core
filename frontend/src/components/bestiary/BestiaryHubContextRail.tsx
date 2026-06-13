import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { GripVertical, X } from 'lucide-react';
import type { CategoryIndexChild } from '@/lib/wiki';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { CreatureSelectedPreview } from './CreatureSelectedPreview';
import {
  clampBestiaryHubRailWidth,
  BESTIARY_HUB_RAIL_WIDTH_EVENT,
  BESTIARY_HUB_RAIL_WIDTH_MAX,
  BESTIARY_HUB_RAIL_WIDTH_MIN,
  loadBestiaryHubRailWidth,
  saveBestiaryHubRailWidth,
} from '@/lib/bestiaryHubRailWidthPreference';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  SURFACE_CONTEXTUAL_CLASS,
  SURFACE_CONTEXTUAL_INLINE_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

export type BestiaryHubContextRailLayout = 'inline' | 'overlay';

export interface BestiaryHubRailContentProps {
  campaignHandle: string;
  children: CategoryIndexChild[];
  selectedCreatureId: string | null;
  snapshots: readonly WikiPageLineageSnapshot[];
  isDMUser?: boolean;
}

interface BestiaryHubContextRailProps extends BestiaryHubRailContentProps {
  layout: BestiaryHubContextRailLayout;
  open?: boolean;
  onClose?: () => void;
  onWidthChange?: (width: number) => void;
}

function RailHeader({ onClose }: { onClose?: () => void }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2.5">
      <div>
        <h2 className="text-sm font-semibold text-contextual-foreground/85">
          Field Intel
        </h2>
        <p className={`${TYPE_META_CLASS} normal-case tracking-normal opacity-75`}>
          Scout selected creature
        </p>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted/80 hover:bg-[rgb(var(--color-focal-rgb)/0.06)] hover:text-foreground/90"
          aria-label="Close field intel rail"
        >
          <X className="size-5" />
        </button>
      ) : null}
    </header>
  );
}

function ResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Resize field intel rail"
      className="absolute left-0 top-0 z-[60] hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize md:flex"
      onMouseDown={onMouseDown}
    >
      <GripVertical className="size-3 text-muted" />
    </button>
  );
}

function BestiaryHubRailContent({
  campaignHandle,
  children: catalogChildren,
  selectedCreatureId,
  snapshots,
  isDMUser: isDMUserProp,
}: BestiaryHubRailContentProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const selectedChild =
    catalogChildren.find((c) => c.id === selectedCreatureId) ?? null;

  return (
    <CreatureSelectedPreview
      campaignHandle={campaignHandle}
      child={selectedChild}
      snapshots={snapshots}
      embedded
    />
  );
}

export function BestiaryHubContextRail({
  layout,
  open = true,
  onClose,
  onWidthChange,
  ...contentProps
}: BestiaryHubContextRailProps) {
  const [panelWidth, setPanelWidth] = useState(loadBestiaryHubRailWidth);

  useBodyScrollLock(layout === 'overlay' && open);

  useEffect(() => {
    const onWidthEvent = () => setPanelWidth(loadBestiaryHubRailWidth());
    window.addEventListener(BESTIARY_HUB_RAIL_WIDTH_EVENT, onWidthEvent);
    return () => window.removeEventListener(BESTIARY_HUB_RAIL_WIDTH_EVENT, onWidthEvent);
  }, []);

  useEffect(() => {
    onWidthChange?.(panelWidth);
  }, [panelWidth, onWidthChange]);

  const startResize = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const onMove = (moveEvent: MouseEvent) => {
      const next = clampBestiaryHubRailWidth(window.innerWidth - moveEvent.clientX);
      setPanelWidth(next);
      saveBestiaryHubRailWidth(next);
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
  }, []);

  if (!open) return null;

  const scrollBody = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <BestiaryHubRailContent {...contentProps} />
    </div>
  );

  const widthStyle: CSSProperties = {
    width: layout === 'inline' ? '100%' : `min(${panelWidth}px, 92vw)`,
    maxWidth: `${BESTIARY_HUB_RAIL_WIDTH_MAX}px`,
    minWidth: `${BESTIARY_HUB_RAIL_WIDTH_MIN}px`,
    ['--bestiary-hub-rail-width' as string]: `${panelWidth}px`,
  };

  if (layout === 'inline') {
    return (
      <aside
        className={`${SURFACE_CONTEXTUAL_INLINE_CLASS} relative flex max-h-[calc(100dvh-var(--workspace-sticky-top,5rem))] w-full min-w-0 flex-col self-start lg:sticky lg:top-[var(--workspace-sticky-top,5rem)]`}
        style={widthStyle}
        aria-label="Field intel"
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
        aria-label="Close field intel backdrop"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside
        className={`${SURFACE_CONTEXTUAL_CLASS} fixed inset-y-0 right-0 z-50 flex max-h-[100dvh] flex-col overflow-hidden rounded-none shadow-xl`}
        style={widthStyle}
        aria-label="Field intel"
      >
        <ResizeHandle onMouseDown={startResize} />
        <RailHeader onClose={onClose} />
        {scrollBody}
      </aside>
    </>
  );
}
