import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import type {
  OrgRelationCategory,
  OrgRelationStance,
  RelationVisibility,
} from '@/lib/entityRelationTypes';
import {
  resolveNeutralEntityVisual,
  resolveStanceVisual,
  stanceBorderClassName,
} from '@/lib/stanceVisuals';
import type { EntityPreviewContext } from '@/lib/entityPreview';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { useEntityPreview } from '@/hooks/useEntityPreview';
import { EntityRelationPreviewPopover } from './EntityRelationPreviewPopover';

interface EntityRelationChipProps {
  campaignHandle: string;
  pageId: string;
  title: string;
  templateType: string;
  stance?: OrgRelationStance | null;
  relationType?: OrgRelationCategory;
  visibility?: RelationVisibility;
  subtitle?: string;
  flatPages?: readonly WikiPageLineageSnapshot[];
  previewContext?: EntityPreviewContext;
  compact?: boolean;
  showPreview?: boolean;
}

export function EntityRelationChip({
  campaignHandle,
  pageId,
  title,
  templateType,
  stance = null,
  relationType,
  visibility,
  subtitle,
  flatPages = [],
  previewContext,
  compact = false,
  showPreview = true,
}: EntityRelationChipProps) {
  const visual =
    stance !== null && stance !== undefined
      ? resolveStanceVisual(stance, relationType, visibility)
      : resolveNeutralEntityVisual(subtitle);

  const href = campaignCategoryChildPath(campaignHandle, templateType, pageId);
  const [hoverOpen, setHoverOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { base, projection } = useEntityPreview(
    pageId,
    flatPages,
    previewContext ?? null,
    hoverOpen && showPreview && flatPages.length > 0 && previewContext != null,
  );

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!showPreview || !previewContext) return;
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setHoverOpen(true), 200);
  }, [clearHoverTimer, previewContext, showPreview]);

  const handleMouseLeave = useCallback(() => {
    clearHoverTimer();
    setHoverOpen(false);
  }, [clearHoverTimer]);

  const CategoryIcon = visual.categoryIcon;
  const VisibilityIcon = visual.visibilityIcon;

  const chip = (
    <Link
      to={href}
      aria-label={`${title}, ${visual.ariaLabel}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={`relative inline-flex items-center gap-1.5 rounded-full border-2 bg-surface/80 px-2.5 py-1 text-xs transition-colors hover:bg-surface ${stanceBorderClassName(visual.borderStyle)} ${visual.accentClass} ${compact ? 'text-[11px] px-2 py-0.5' : ''}`}
    >
      {CategoryIcon ? <CategoryIcon className="size-3 shrink-0" aria-hidden /> : null}
      <span className="font-medium">{title}</span>
      {stance ? (
        <span className="rounded bg-surface/90 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
          {visual.label}
        </span>
      ) : subtitle ? (
        <span className="text-[10px] text-muted">({subtitle})</span>
      ) : null}
      {VisibilityIcon ? <VisibilityIcon className="size-3 shrink-0 opacity-70" aria-hidden /> : null}
    </Link>
  );

  if (!showPreview || !previewContext) {
    return chip;
  }

  return (
    <span className="relative inline-block">
      {chip}
      {hoverOpen ? (
        <EntityRelationPreviewPopover
          base={base}
          projection={projection}
          loading={base === null && hoverOpen}
        />
      ) : null}
    </span>
  );
}
