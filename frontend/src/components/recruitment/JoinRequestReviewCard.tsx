import { Link } from 'react-router-dom';
import type { CampaignJoinRequestRow } from '@/types/recruitment';
import { formatScheduleOverlapLabel } from '@shared/recruitmentContinuity';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getGmStyleTagLabel } from '@shared/gmStyleTags';

interface JoinRequestReviewCardProps {
  request: CampaignJoinRequestRow;
  acting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function JoinRequestReviewCard({
  request,
  acting,
  onAccept,
  onDecline,
}: JoinRequestReviewCardProps) {
  const styleTags = (request.user.gmStyleTags ?? []).slice(0, 4);
  const overlap = request.scheduleOverlap
    ? formatScheduleOverlapLabel(request.scheduleOverlap)
    : null;

  return (
    <article className="rounded-lg border border-border/80 bg-background/40 p-4">
      <div className="flex items-start gap-3">
        <UserAvatar
          name={request.user.label}
          avatarUrl={request.user.avatarUrl ?? null}
          userId={request.user.id}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={`/users/${request.user.id}`}
              className="font-semibold text-primary hover:text-primary-hover"
            >
              {request.user.label}
            </Link>
            {request.user.pronouns?.trim() ? (
              <span className="text-xs text-muted">{request.user.pronouns}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {[
              request.user.timezone?.trim() ? request.user.timezone : null,
              ...styleTags.map((tag) => getGmStyleTagLabel(tag)),
            ]
              .filter(Boolean)
              .join(' • ') || request.user.email}
          </p>
          {overlap ? (
            <p className="mt-1 text-xs text-foreground">
              Schedule overlap: <span className="font-medium">{overlap}</span>
            </p>
          ) : null}
          {request.user.publicBioExcerpt ? (
            <p className="mt-2 text-sm italic text-muted">“{request.user.publicBioExcerpt}”</p>
          ) : null}
          <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm text-foreground">
            {request.message}
          </blockquote>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acting}
              onClick={onAccept}
              className="rounded bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={onDecline}
              className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-elevated disabled:opacity-50"
            >
              Decline…
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
