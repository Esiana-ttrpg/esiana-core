import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { CampaignMemberRoles } from '@/types/domain';
import type { SessionNotesAttendanceMember } from '@/types/wiki';

function roleFallbackLabel(role: string): string {
  if (role === CampaignMemberRoles.GAMEMASTER) return 'DM';
  if (role === CampaignMemberRoles.WRITER) return 'Writer';
  return '';
}

function IdentityPortrait({
  portraitUrl,
  sizeClass = 'size-6',
}: {
  portraitUrl: string | null;
  sizeClass?: string;
}) {
  if (portraitUrl) {
    return (
      <img
        src={portraitUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover object-top`}
      />
    );
  }
  return (
    <span
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-elevated/80 text-muted`}
      aria-hidden
    >
      <User className="size-3.5" strokeWidth={1.5} />
    </span>
  );
}

interface SessionNotesMemberIdentityProps {
  member: SessionNotesAttendanceMember;
  campaignHandle: string;
}

/**
 * Compact two-row player / character identity cell.
 * Reusable later by the Session Notes Players rail.
 */
export function SessionNotesMemberIdentity({
  member,
  campaignHandle,
}: SessionNotesMemberIdentityProps) {
  const { flatPages } = useWiki();
  const characterLabel = member.displayName ?? roleFallbackLabel(member.role);
  const identityHref =
    member.identityPageId != null
      ? campaignWikiPath(campaignHandle, member.identityPageId, flatPages)
      : null;

  return (
    <div className="flex min-w-[7.5rem] flex-col gap-1 py-0.5">
      <div className="flex items-center gap-2">
        <IdentityPortrait portraitUrl={member.identityPortrait} />
        <span className="truncate text-sm font-medium text-foreground">
          {member.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <IdentityPortrait portraitUrl={member.identityPortrait} />
        {characterLabel ? (
          identityHref ? (
            <Link
              to={identityHref}
              className="truncate text-sm text-foreground hover:text-primary"
            >
              {characterLabel}
            </Link>
          ) : (
            <span className="truncate text-sm text-foreground">{characterLabel}</span>
          )
        ) : (
          <span className="truncate text-sm text-muted">—</span>
        )}
      </div>
    </div>
  );
}
