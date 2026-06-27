import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { ProfileIdentityHeader } from '@/components/profile/ProfileIdentityHeader';
import type { UserProfileUpdateInput } from '@/types/user';

interface ProfileHeaderPreviewProps {
  userId: string;
  username: string;
  draft: Pick<
    UserProfileUpdateInput,
    | 'displayName'
    | 'pronouns'
    | 'statusBlurb'
    | 'bluesky'
    | 'discord'
    | 'github'
    | 'reddit'
    | 'mastodon'
    | 'otherLink'
  >;
}

export function ProfileHeaderPreview({ userId, username, draft }: ProfileHeaderPreviewProps) {
  return (
    <Link
      to={`/users/${userId}`}
      className="group block cursor-pointer rounded-xl border border-border bg-background p-4 transition-all duration-200 hover:border-indigo-500/50 hover:bg-background/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className={META_FIELD_LABEL_CLASS}>
          Live profile header preview
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted transition-colors group-hover:text-indigo-400">
          <ExternalLink size={14} className="text-muted transition-colors group-hover:text-indigo-400" />
          View Live Profile
        </span>
      </div>
      <ProfileIdentityHeader
        displayName={draft.displayName || null}
        username={username}
        avatarUrl={null}
        pronouns={draft.pronouns}
        statusBlurb={draft.statusBlurb}
        links={{
          bluesky: draft.bluesky || null,
          discord: draft.discord || null,
          github: draft.github || null,
          reddit: draft.reddit || null,
          mastodon: draft.mastodon || null,
          otherLink: draft.otherLink || null,
        }}
        nameClassName="text-xl font-bold tracking-tight text-foreground"
        socialLinksStaticPreview
      />
      <p className="mt-2 text-xs text-muted">@{username}</p>
    </Link>
  );
}
