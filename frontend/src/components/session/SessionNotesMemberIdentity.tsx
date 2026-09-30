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

function IdentityPortrait({ portraitUrl }: { portraitUrl: string | null }) {
  if (portraitUrl) {
    return (
      <img
        src={portraitUrl}
        alt=""
        className="size-12 shrink-0 rounded-md object-cover object-top"
      />
    );
  }
  return (
    <span
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-elevated/80 text-muted"
      aria-hidden
    >
      <User className="size-5" strokeWidth={1.5} />
    </span>
  );
}

interface SessionNotesMemberIdentityProps {
  member: SessionNotesAttendanceMember;
  campaignHandle: string;
}

/**
 * Compact two-row player / character identity cell.
 * Character portrait is shown once, spanning both label rows as a 2×2 square.
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
    <div className="grid min-w-[7.5rem] grid-cols-[auto_minmax(0,1fr)] grid-rows-2 items-center gap-x-2 gap-y-0.5 py-0.5">
      <div className="row-span-2 self-center">
        <IdentityPortrait portraitUrl={member.identityPortrait} />
      </div>
      <span className="truncate text-sm font-medium text-foreground">
        {member.label}
      </span>
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
  );
}
