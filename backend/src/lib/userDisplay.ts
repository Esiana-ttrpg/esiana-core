import { isPasswordAuthEnabled } from './auth/passwordAuth.js';

export const DISPLAY_NAME_MAX_LENGTH = 64;
export const PRONOUNS_MAX_LENGTH = 48;
export const PUBLIC_BIO_MAX_LENGTH = 8000;
export const DEFAULT_PITCH_MAX_LENGTH = 2000;
export const STATUS_BLURB_MAX_LENGTH = 140;
export const SOCIAL_LINK_MAX_LENGTH = 500;

const SOCIAL_LINK_KEYS = [
  'bluesky',
  'discord',
  'github',
  'reddit',
  'mastodon',
  'otherLink',
] as const;

export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number];

// Text normalization is not URL or HTML sanitization. Render text through React
// escaping and Markdown through its default safe URL transform (no raw HTML).
export function sanitizeStatusBlurb(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;

  let value = raw.replace(/\s+/g, ' ').trim();
  if (!value) return null;

  value = value.replace(/<[^>]+>/g, '');

  if (value.length > STATUS_BLURB_MAX_LENGTH) {
    value = value.slice(0, STATUS_BLURB_MAX_LENGTH);
  }

  return value;
}

export function sanitizeSocialLink(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;

  const value = raw.trim();
  if (!value) return null;

  // Reject markup and controls rather than rewriting an untrusted URL.
  if (/[\u0000-\u001f\u007f<>]/.test(value)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);

  try {
    const parsed = new URL(hasScheme ? value : `https://${value}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const normalized = parsed.toString();
    // Truncation could change the destination or leave a malformed URL.
    return normalized.length <= SOCIAL_LINK_MAX_LENGTH ? normalized : null;
  } catch {
    return null;
  }
}

export function isSocialLinkKey(key: string): key is SocialLinkKey {
  return (SOCIAL_LINK_KEYS as readonly string[]).includes(key);
}

export const USER_SOCIAL_LINK_KEYS = SOCIAL_LINK_KEYS;

export function sanitizeDefaultPitch(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;

  let value = raw.replace(/\r\n/g, '\n').trim();
  if (!value) return null;

  value = value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  value = value.replace(/<script\b[^>]*\/?>/gi, '');

  if (value.length > DEFAULT_PITCH_MAX_LENGTH) {
    value = value.slice(0, DEFAULT_PITCH_MAX_LENGTH);
  }

  return value;
}

export function sanitizePublicBio(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;

  let value = raw.replace(/\r\n/g, '\n').trim();
  if (!value) return null;

  value = value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  value = value.replace(/<script\b[^>]*\/?>/gi, '');

  if (value.length > PUBLIC_BIO_MAX_LENGTH) {
    value = value.slice(0, PUBLIC_BIO_MAX_LENGTH);
  }

  return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function deriveUsername(email: string): string {
  const local = email.split('@')[0]?.trim();
  return local && local.length > 0 ? local : email;
}

/** Normalizes pronoun text and removes HTML tags. */
export function sanitizePronouns(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;

  let value = raw.replace(/\s+/g, ' ').trim();
  if (!value) return null;

  value = value.replace(/<[^>]+>/g, '');

  if (value.length > PRONOUNS_MAX_LENGTH) {
    value = value.slice(0, PRONOUNS_MAX_LENGTH);
  }

  return value;
}

export function sanitizeDisplayName(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;

  let value = raw.trim();
  if (!value) return null;

  value = value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  value = value.replace(/<script\b[^>]*\/?>/gi, '');
  value = value.replace(/<[^>]+>/g, '');
  value = value.trim();

  if (!value) return null;
  if (value.length > DISPLAY_NAME_MAX_LENGTH) {
    value = value.slice(0, DISPLAY_NAME_MAX_LENGTH);
  }

  return value;
}

export function resolveUserDisplayName(user: {
  displayName?: string | null;
  email: string;
}): string {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName;
  const username = deriveUsername(user.email);
  return username || user.email;
}

export function formatPlayerLabel(
  user: { email: string; displayName?: string | null },
  index: number,
): string {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName;

  const local = deriveUsername(user.email);
  if (local) {
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return `Player ${index + 1}`;
}

export function serializeUserIdentity(user: {
  id: string;
  email: string;
  role: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  campaignNavigationShortcutsEnabled?: boolean;
}) {
  const username = deriveUsername(user.email);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    username,
    passwordAuthEnabled: isPasswordAuthEnabled(user),
    campaignNavigationShortcutsEnabled:
      user.campaignNavigationShortcutsEnabled ?? false,
  };
}
