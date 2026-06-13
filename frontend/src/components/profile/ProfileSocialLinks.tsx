import {
  Bird,
  ExternalLink,
  Github,
  MessageCircle,
  Rss,
  Smile,
} from 'lucide-react';
import type { UserSocialLinks } from '@/types/user';

type SocialKey = keyof UserSocialLinks;

const SOCIAL_CONFIG: Array<{
  key: SocialKey;
  label: string;
  Icon: typeof Github;
}> = [
  { key: 'bluesky', label: 'Bluesky', Icon: Bird },
  { key: 'discord', label: 'Discord', Icon: MessageCircle },
  { key: 'github', label: 'GitHub', Icon: Github },
  { key: 'reddit', label: 'Reddit', Icon: Smile },
  { key: 'mastodon', label: 'Mastodon', Icon: Rss },
  { key: 'otherLink', label: 'Link', Icon: ExternalLink },
];

interface ProfileSocialLinksProps {
  links: UserSocialLinks;
  size?: 'sm' | 'md';
  /** When true, icons are decorative only (e.g. inside a parent profile link). */
  staticPreview?: boolean;
}

export function ProfileSocialLinks({
  links,
  size = 'sm',
  staticPreview = false,
}: ProfileSocialLinksProps) {
  const active = SOCIAL_CONFIG.filter(({ key }) => {
    const value = links[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  if (active.length === 0) return null;

  const iconClass = size === 'md' ? 'size-4' : 'size-3.5';
  const buttonClass =
    size === 'md'
      ? 'inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:border-primary/50 hover:text-primary'
      : 'inline-flex size-7 items-center justify-center rounded-md border border-border/80 bg-surface/80 text-muted hover:border-border hover:text-primary';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map(({ key, label, Icon }) =>
        staticPreview ? (
          <span
            key={key}
            title={label}
            aria-hidden
            className={`${buttonClass} pointer-events-none`}
          >
            <Icon className={iconClass} aria-hidden />
          </span>
        ) : (
          <a
            key={key}
            href={links[key]!.trim()}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
            className={buttonClass}
          >
            <Icon className={iconClass} aria-hidden />
          </a>
        ),
      )}
    </div>
  );
}
