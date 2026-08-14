import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { HelpCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface AppearanceFieldLabelProps {
  label: string;
  htmlFor: string;
  guidance?: string;
}

const TOOLTIP_WIDTH = 288;
const VIEWPORT_PAD = 16;
const TOOLTIP_GAP = 8;
const HIDE_DELAY_MS = 120;

export function AppearanceFieldLabel({ label, htmlFor, guidance }: AppearanceFieldLabelProps) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
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

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setTooltipStyle(null);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

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
    if (!open || !guidance) {
      setTooltipStyle(null);
      return;
    }
    setTooltipStyle({ top: 0, left: 0, visibility: 'hidden' });
    requestAnimationFrame(updateTooltipPosition);
  }, [open, guidance, updateTooltipPosition]);

  useEffect(() => {
    if (!open || !guidance) return;
    const onScrollOrResize = () => updateTooltipPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, guidance, updateTooltipPosition]);

  useEffect(() => {
    if (!guidance) return;
    const control = document.getElementById(htmlFor);
    if (!control) return;
    if (open) {
      control.setAttribute('aria-describedby', tooltipId);
    } else {
      control.removeAttribute('aria-describedby');
    }
    return () => control.removeAttribute('aria-describedby');
  }, [open, guidance, htmlFor, tooltipId]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  if (!guidance) {
    return (
      <label htmlFor={htmlFor} className={META_FIELD_LABEL_CLASS}>
        {label}
      </label>
    );
  }

  const tooltipPortal =
    open && guidance && tooltipStyle
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
            className="fixed z-[100] whitespace-pre-wrap rounded-lg border border-border bg-elevated p-3 pb-4 text-xs leading-relaxed text-foreground shadow-lg"
            onMouseEnter={showHelp}
            onMouseLeave={scheduleHide}
          >
            {guidance}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex max-w-full items-center gap-1"
        onMouseEnter={showHelp}
        onMouseLeave={scheduleHide}
      >
        <label htmlFor={htmlFor} className={META_FIELD_LABEL_CLASS}>
          {label}
        </label>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-sm text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-expanded={open}
          aria-controls={tooltipId}
          aria-label={`Writing guidance for ${label}`}
          onFocus={showHelp}
          onBlur={scheduleHide}
        >
          <HelpCircle className="size-3.5" aria-hidden />
        </button>
      </span>
      {tooltipPortal}
    </>
  );
}
