/** Minimal shape — callers pass only what they selected. */
export type PasswordAuthUser = {
  passwordHash?: string | null;
};

/** True when this user can sign in or manage access via email+password. */
export function isPasswordAuthEnabled(user: PasswordAuthUser): boolean {
  return Boolean(user.passwordHash?.length);
}
