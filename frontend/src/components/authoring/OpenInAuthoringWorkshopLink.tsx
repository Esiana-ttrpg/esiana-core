import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import {
  buildAuthoringWorkshopHref,
  inferAuthoringKindFromMetadata,
  type AuthoringContextKind,
} from '@shared/authoringContext';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import { isAuthoringWorkshopEligible } from '@/lib/authoringEligibility';

interface OpenInAuthoringWorkshopLinkProps {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  metadata?: unknown;
  className?: string;
  compact?: boolean;
}

export function OpenInAuthoringWorkshopLink({
  campaignHandle,
  pageId,
  templateType,
  metadata,
  className = '',
  compact = false,
}: OpenInAuthoringWorkshopLinkProps) {
  if (!isAuthoringWorkshopEligible(templateType, metadata)) {
    return null;
  }

  const kind: AuthoringContextKind =
    inferAuthoringKindFromMetadata(metadata) ?? 'narrative_workspace';

  const href = buildAuthoringWorkshopHref(campaignProgressionPath(campaignHandle), {
    kind,
    anchorEntityIds: [pageId],
  });

  const label =
    kind === 'scene'
      ? compact
        ? 'Scenes'
        : 'Open in Scenes'
      : kind === 'chronicle'
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
