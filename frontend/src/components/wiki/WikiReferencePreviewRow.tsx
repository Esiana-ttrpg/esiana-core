import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  fetchMentionSnippet,
  fetchWikiPagePreview,
  type WikiPagePreview,
} from '@/lib/wikiLoreGraph';
import { formatWikiTemplateType } from '@/lib/formatWikiTemplateType';

interface WikiReferencePreviewRowProps {
  campaignHandle: string;
  /** Source page where the mention appears (backlink row id). */
  sourcePageId: string;
  /** Target page being viewed (current page) — used for lazy snippet extraction. */
  targetPageId?: string;
  title: string;
  href: string;
  breadcrumbLabel?: string;
  icon: LucideIcon;
}

export function WikiReferencePreviewRow({
  campaignHandle,
  sourcePageId,
  targetPageId,
  title,
  href,
  breadcrumbLabel,
  icon: Icon,
}: WikiReferencePreviewRowProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [preview, setPreview] = useState<WikiPagePreview | null>(null);
  const [snippet, setSnippet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const loadPreviewData = useCallback(async () => {
    if (!campaignHandle || !sourcePageId) return;
    setLoading(true);
    try {
      const tasks: Promise<void>[] = [
        fetchWikiPagePreview(campaignHandle, sourcePageId).then(setPreview),
      ];
      if (targetPageId) {
        tasks.push(
          fetchMentionSnippet(campaignHandle, sourcePageId, targetPageId).then(
            (s) => setSnippet(s),
          ),
        );
      }
      await Promise.all(tasks);
    } catch {
      setPreview(null);
      setSnippet(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, sourcePageId, targetPageId]);

  const handleMouseEnter = useCallback(() => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => {
      setHoverOpen(true);
      void loadPreviewData();
    }, 200);
  }, [clearHoverTimer, loadPreviewData]);

  const handleMouseLeave = useCallback(() => {
    clearHoverTimer();
    setHoverOpen(false);
    setPreview(null);
    setSnippet(null);
    setLoading(false);
  }, [clearHoverTimer]);

  const handleFocus = useCallback(() => {
    setHoverOpen(true);
    void loadPreviewData();
  }, [loadPreviewData]);

  const handleBlur = useCallback(() => {
    setHoverOpen(false);
    setPreview(null);
    setSnippet(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hoverOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setHoverOpen(false);
        setPreview(null);
        setSnippet(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hoverOpen]);

  const excerpt = snippet?.trim() || preview?.summary?.trim() || null;
  const typeLabel =
    preview?.codexType && preview.codexType !== 'DEFAULT'
      ? formatWikiTemplateType(preview.codexType)
      : preview?.templateType
        ? formatWikiTemplateType(preview.templateType)
        : null;

  return (
    <div className="relative">
      <RouterLink
        to={href}
        className="block rounded-md border border-border bg-surface/70 px-2.5 py-2 hover:border-primary/60 hover:bg-surface"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <span className="inline-flex max-w-full items-center gap-1 text-[11px] font-medium text-foreground">
          <Icon className="size-3 shrink-0 text-primary" />
          <span className="truncate">{title}</span>
        </span>
        {breadcrumbLabel ? (
          <span className="mt-0.5 block truncate text-[10px] text-muted">
            {breadcrumbLabel}
          </span>
        ) : null}
      </RouterLink>

      {hoverOpen ? (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-background p-3 text-xs shadow-lg"
        >
          {breadcrumbLabel ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Appears in: {breadcrumbLabel}
            </p>
          ) : null}
          <p className="mt-1 font-medium text-foreground">{title}</p>
          {loading ? (
            <p className="mt-1 text-muted">Loading…</p>
          ) : excerpt ? (
            <p className="mt-1 line-clamp-3 text-muted">&ldquo;{excerpt}&rdquo;</p>
          ) : null}
          {typeLabel || preview?.inboundLinkCount !== undefined ? (
            <p className="mt-2 text-[10px] text-muted/80">
              {[typeLabel, preview?.inboundLinkCount !== undefined ? `${preview.inboundLinkCount} inbound` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
