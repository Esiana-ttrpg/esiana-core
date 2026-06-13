import { useMemo, useState } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface UserAvatarProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  /** When set, local `/uploads/*` avatar paths are served via the ACL avatar endpoint. */
  userId?: string | null;
  size?: AvatarSize;
}

/** Browser-safe avatar URL (ACL proxy); exported for raw `<img>` tags. */
export function resolveAvatarSrc(
  avatarUrl: string,
  userId?: string | null,
): string {
  if (avatarUrl.startsWith('/api/users/') && avatarUrl.includes('/avatar')) {
    return avatarUrl;
  }
  if (userId && (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('uploads/'))) {
    return `/api/users/${userId}/avatar`;
  }
  return avatarUrl;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

const COLOR_CLASSES = [
  'bg-rose-600/30 text-rose-200 border-rose-500/40',
  'bg-fuchsia-600/30 text-fuchsia-200 border-fuchsia-500/40',
  'bg-indigo-600/30 text-indigo-200 border-indigo-500/40',
  'bg-cyan-600/30 text-cyan-200 border-cyan-500/40',
  'bg-emerald-600/30 text-emerald-200 border-emerald-500/40',
  'bg-primary/30 text-primary border-primary/40',
];

function getInitials(name: string | null | undefined): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function UserAvatar({ name, avatarUrl, userId, size = 'md' }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const colorClass = useMemo(() => {
    const index = hashString(name ?? initials) % COLOR_CLASSES.length;
    return COLOR_CLASSES[index] ?? COLOR_CLASSES[0];
  }, [name, initials]);

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={resolveAvatarSrc(avatarUrl, userId)}
        alt={name?.trim() ? `${name} avatar` : 'User avatar'}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full border border-border object-cover`}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      aria-label={name?.trim() ? `${name} initials avatar` : 'Initials avatar'}
      className={`${SIZE_CLASSES[size]} inline-flex shrink-0 items-center justify-center rounded-full border font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {initials}
    </span>
  );
}
