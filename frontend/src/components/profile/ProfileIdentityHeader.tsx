import { getUserDisplayName } from '@/utils/userDisplayName';
import { ProfileSocialLinks } from '@/components/profile/ProfileSocialLinks';
import type { UserSocialLinks } from '@/types/user';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ProfileIdentityHeaderProps {
  displayName: string | null;
  username: string;
  userId?: string | null;
  avatarUrl?: string | null;
  pronouns?: string | null;
  statusBlurb?: string | null;
  links: UserSocialLinks;
  nameClassName?: string;
  socialLinksStaticPreview?: boolean;
}

export function ProfileIdentityHeader({
  displayName,
  username,
  userId,
  avatarUrl,
  pronouns,
  statusBlurb,
  links,
  nameClassName = 'text-3xl font-bold tracking-tight text-foreground',
  socialLinksStaticPreview = false,
}: ProfileIdentityHeaderProps) {
  const name = getUserDisplayName({
    displayName,
    username,
    email: username,
  });

  const pronounLabel = pronouns?.trim();
  const blurb = statusBlurb?.trim();
  const hasSocials = [
    links.bluesky,
    links.discord,
    links.github,
    links.reddit,
    links.mastodon,
    links.otherLink,
  ].some((v) => v?.trim());

  return (
    <div className="flex items-start gap-3">
      <UserAvatar name={name} avatarUrl={avatarUrl} userId={userId} size="lg" />
      <div className="min-w-0 flex flex-wrap items-center gap-2">
        <h1 className={nameClassName}>{name}</h1>

        {pronounLabel && (
          <span className="text-xs font-normal text-muted">({pronounLabel})</span>
        )}

        {blurb && (
          <span className="inline-flex max-w-full flex-wrap items-center gap-2 text-xs font-medium italic tracking-wide text-muted">
            <span className="hidden text-muted sm:inline" aria-hidden>
              •
            </span>
            <span className="break-words">{blurb}</span>
          </span>
        )}

        {hasSocials && (
          <ProfileSocialLinks links={links} staticPreview={socialLinksStaticPreview} />
        )}
      </div>
    </div>
  );
}
