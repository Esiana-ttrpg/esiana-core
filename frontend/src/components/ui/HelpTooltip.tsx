import { HelpCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const TOOLTIP_WIDTH = 288;
const VIEWPORT_PAD = 16;
const TOOLTIP_GAP = 8;
const HIDE_DELAY_MS = 120;

export function HelpTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<{
    top: number;
    left: number;
    visibility: 'hidden' | 'visible';
  } | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showHelp = useCallback(() => {
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer]);

  const hideHelp = useCallback(() => {
    clearHideTimer();
    setPinned(false);
    setOpen(false);
    setTooltipStyle(null);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    if (pinned) return;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setTooltipStyle(null);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer, pinned]);

  const updateTooltipPosition = useCallback(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;

    const rect = anchor.getBoundingClientRect();
    const tooltipHeight = tooltip.getBoundingClientRect().height;
    const maxLeft = window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PAD;
    const left = Math.min(Math.max(VIEWPORT_PAD, rect.left), maxLeft);

    let top = rect.bottom + TOOLTIP_GAP;
    const overflowsBottom = top + tooltipHeight > window.innerHeight - VIEWPORT_PAD;
    const fitsAbove = rect.top - TOOLTIP_GAP - tooltipHeight >= VIEWPORT_PAD;
    if (overflowsBottom && fitsAbove) {
      top = rect.top - TOOLTIP_GAP - tooltipHeight;
    }

    setTooltipStyle({ top, left, visibility: 'visible' });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setTooltipStyle(null);
      return;
    }
    setTooltipStyle({ top: 0, left: 0, visibility: 'hidden' });
    requestAnimationFrame(updateTooltipPosition);
  }, [open, children, updateTooltipPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateTooltipPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updateTooltipPosition]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideHelp();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || tooltipRef.current?.contains(target)) {
        return;
      }
      hideHelp();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, hideHelp]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const tooltipPortal =
    open && tooltipStyle
      ? createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              top: tooltipStyle.top,
              left: tooltipStyle.left,
              width: TOOLTIP_WIDTH,
              maxWidth: `min(18rem, calc(100vw - ${VIEWPORT_PAD * 2}px))`,
              visibility: tooltipStyle.visibility,
            }}
            className="fixed z-[100] space-y-2 whitespace-pre-wrap rounded-lg border border-border bg-elevated p-3 pb-4 text-xs leading-relaxed text-foreground shadow-lg"
            onMouseEnter={showHelp}
            onMouseLeave={scheduleHide}
          >
            {children}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex shrink-0 items-center"
        onMouseEnter={showHelp}
        onMouseLeave={scheduleHide}
      >
        <button
          type="button"
          className="inline-flex rounded-sm text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-expanded={open}
          aria-controls={tooltipId}
          aria-label={`More about ${label}`}
          onFocus={showHelp}
          onBlur={scheduleHide}
          onClick={() => {
            if (pinned) {
              hideHelp();
              return;
            }
            setPinned(true);
            showHelp();
          }}
        >
          <HelpCircle className="size-3.5" aria-hidden />
        </button>
      </span>
      {tooltipPortal}
    </>
  );
}
