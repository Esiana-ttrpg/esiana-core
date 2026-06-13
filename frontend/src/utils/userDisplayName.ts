export interface UserLabelSource {
  displayName?: string | null;
  username?: string | null;
  email: string;
}

export function deriveUsername(email: string): string {
  const local = email.split('@')[0]?.trim();
  return local && local.length > 0 ? local : email;
}

/** Public label: displayName → username → email */
export function getUserDisplayName(user: UserLabelSource): string {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName;

  const username = user.username?.trim() || deriveUsername(user.email);
  if (username) return username;

  return user.email;
}
