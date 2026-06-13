/** Strip legacy `/uploads/` prefix from stored avatar URLs before disk lookup. */
export function avatarFilenameFromStoredUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.trim()) return null;
  const trimmed = avatarUrl.trim();
  const withoutPrefix = trimmed.startsWith('/uploads/')
    ? trimmed.slice('/uploads/'.length)
    : trimmed.startsWith('uploads/')
      ? trimmed.slice('uploads/'.length)
      : trimmed;
  const base = withoutPrefix.split('/').pop() ?? '';
  if (!base || base === '.' || base.includes('..')) return null;
  return base;
}

export function avatarApiUrl(userId: string): string {
  return `/api/users/${userId}/avatar`;
}
