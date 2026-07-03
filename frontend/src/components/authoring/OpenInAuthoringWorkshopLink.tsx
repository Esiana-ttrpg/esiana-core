import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import {
  buildAuthoringWorkshopHref,
  inferAuthoringKindFromMetadata,
  type AuthoringContextKind,
} from '@shared/authoringContext';
import { campaignWorkshopPath, campaignProgressionPath } from '@/lib/campaignPaths';
import { progressionSectionHref } from '@/lib/progressionLayout';
import { isAuthoringWorkshopEligible } from '@/lib/authoringEligibility';

interface OpenInAuthoringWorkshopLinkProps {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  metadata?: unknown;
  canEdit?: boolean;
  className?: string;
  compact?: boolean;
}

export function OpenInAuthoringWorkshopLink({
  campaignHandle,
  pageId,
  templateType,
  metadata,
  canEdit = true,
  className = '',
  compact = false,
}: OpenInAuthoringWorkshopLinkProps) {
  const kind: AuthoringContextKind =
    inferAuthoringKindFromMetadata(metadata) ?? 'narrative_workspace';

  if (kind === 'scene') {
    const href = `${progressionSectionHref(campaignProgressionPath(campaignHandle), 'scenes')}&anchors=${pageId}`;
    const label = compact ? 'Scenes' : 'Open in Scenes';
    return (
      <Link
        to={href}
        className={`inline-flex items-center gap-1.5 text-xs text-primary hover:underline ${className}`}
      >
        <PenLine className="h-3.5 w-3.5" aria-hidden />
        {label}
      </Link>
    );
  }

  if (!isAuthoringWorkshopEligible(templateType, metadata, canEdit)) {
    return null;
  }

  const href = buildAuthoringWorkshopHref(campaignWorkshopPath(campaignHandle), {
    kind,
    anchorEntityIds: [pageId],
  });

  const label =
    kind === 'chronicle'
      ? compact
        ? 'Workshop'
        : 'Draft continuation'
      : compact
        ? 'Workshop'
        : 'Open in Workshop';

  return (
    <Link
      to={href}
      className={`inline-flex items-center gap-1.5 text-xs text-primary hover:underline ${className}`}
    >
      <PenLine className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}
