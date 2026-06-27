import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import {
  formatDowntimeAnnotationRoleLabel,
  type DowntimeAnnotation,
  type DowntimeLocationMention,
} from '@shared/downtimeAnnotations';
import { ChronologyDomainKind } from '@shared/chronologyDomainKinds';
import type { DowntimePeriodPayload } from '@shared/chronologyTypes';
import type { ConvergenceTimelineEntry } from '@/lib/chronologyOverlayApi';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

export function parseDowntimePeriodPayload(
  entry: ConvergenceTimelineEntry,
): DowntimePeriodPayload | null {
  const payload = entry.domainPayload as {
    domain?: string;
    payload?: DowntimePeriodPayload;
  };
  if (payload?.domain !== ChronologyDomainKind.DOWNTIME_PERIOD) return null;
  return payload.payload ?? null;
}

function formatAnnotationLine(annotation: DowntimeAnnotation): string {
  const title = annotation.entityTitle?.trim() || 'Unknown';
  const roleLabel = formatDowntimeAnnotationRoleLabel(annotation.role);
  if (annotation.note?.trim()) {
    if (roleLabel === 'absent' && !annotation.note.toLowerCase().includes('absent')) {
      return `${title} — ${annotation.note.trim()}`;
    }
    return annotation.note.trim();
  }
  if (roleLabel) return `${title} (${roleLabel})`;
  return title;
}

function formatLocationMentionLine(mention: DowntimeLocationMention): string {
  return mention.note.trim();
}

export function downtimePeriodAffectedCount(payload: DowntimePeriodPayload | null): number {
  if (!payload) return 0;
  return (payload.annotations?.length ?? 0) + (payload.locationMentions?.length ?? 0);
}

export function downtimePeriodHasAffected(payload: DowntimePeriodPayload | null): boolean {
  return downtimePeriodAffectedCount(payload) > 0;
}

export function shouldShowDowntimeAffectedInline(
  payload: DowntimePeriodPayload | null,
  expanded: boolean,
): boolean {
  const count = downtimePeriodAffectedCount(payload);
  if (count === 0) return false;
  if (count <= 3) return true;
  return expanded;
}

interface DowntimePeriodAffectedListProps {
  campaignHandle: string;
  payload: DowntimePeriodPayload;
  compact?: boolean;
}

export function DowntimePeriodAffectedList({
  campaignHandle,
  payload,
  compact = false,
}: DowntimePeriodAffectedListProps) {
  const { flatPages } = useWiki();
  const annotations = payload.annotations ?? [];
  const mentions = payload.locationMentions ?? [];
  if (annotations.length === 0 && mentions.length === 0) return null;

  return (
    <div className={compact ? 'mt-1' : 'mt-2'}>
      <p className={META_SECTION_LABEL_CLASS}>
        Affected
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {mentions.map((mention, index) => (
          <li key={`mention-${index}`} className="flex flex-wrap items-baseline gap-1">
            <span aria-hidden>•</span>
            {mention.locationPageId ? (
              <Link
                to={campaignWikiPath(campaignHandle, mention.locationPageId, flatPages)}
                className="text-foreground hover:text-primary hover:underline"
              >
                {formatLocationMentionLine(mention)}
              </Link>
            ) : (
              <span>{formatLocationMentionLine(mention)}</span>
            )}
          </li>
        ))}
        {annotations.map((annotation) => (
          <li
            key={annotation.entityPageId}
            className="flex flex-wrap items-baseline gap-1"
          >
            <span aria-hidden>•</span>
            <Link
              to={campaignWikiPath(campaignHandle, annotation.entityPageId, flatPages)}
              className="text-foreground hover:text-primary hover:underline"
            >
              {formatAnnotationLine(annotation)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
