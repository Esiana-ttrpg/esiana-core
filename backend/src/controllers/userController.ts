import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { toInputJsonValue } from '../lib/inputJsonValue.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  clearAuthCookie,
  setAuthCookie,
  signAuthToken,
} from '../middleware/auth.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  deriveUsername,
  normalizeEmail,
  sanitizeDefaultPitch,
  sanitizeDisplayName,
  sanitizePronouns,
  sanitizePublicBio,
  sanitizeSocialLink,
  sanitizeStatusBlurb,
  USER_SOCIAL_LINK_KEYS,
} from '../lib/userDisplay.js';
import { userPublicFieldsSelect } from '../lib/userProfileSerialize.js';
import {
  deleteUploadedFile,
  deleteUploadedFileFromUrl,
} from '../lib/assetFiles.js';
import path from 'node:path';
import { env } from '../config/env.js';
import {
  assertImageFile,
  UploadValidationError,
} from '../lib/uploadValidation.js';
import {
  sanitizeAppearanceProfile,
  serializeAppearanceProfileForApi,
} from '../lib/appearanceProfile.js';
import {
  getOrCreateSystemSettings,
} from '../lib/systemSettings.js';
import {
  resolveEffectiveTimezone,
  sanitizeTimezone,
} from '../lib/timezone.js';
import { sanitizeUiLocale } from '../lib/uiLocale.js';
import { isPasswordAuthEnabled } from '../lib/auth/passwordAuth.js';

const MIN_PASSWORD_LENGTH = 8;

const PROFILE_UPDATE_KEYS = [
  'displayName',
  'avatarUrl',
  'pronouns',
  'email',
  'publicBio',
  'defaultPitch',
  'statusBlurb',
  'timezone',
  'uiLocale',
  ...USER_SOCIAL_LINK_KEYS,
] as const;

const profileSelect = {
  ...userPublicFieldsSelect,
  defaultPitch: true,
  appearanceProfile: true,
  allowCampaignSystemOverride: true,
  timezone: true,
  uiLocale: true,
  createdAt: true,
  campaignMembers: {
    select: {
      role: true,
      createdAt: true,
      campaign: {
        select: {
          id: true,
          name: true,
          handle: true,
          archivedAt: true,
        },
      },
    },
    orderBy: { campaign: { name: 'asc' as const } },
  },
} as const;

function serializeProfile(
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    pronouns: string | null;
    publicBio: string | null;
    defaultPitch: string | null;
    statusBlurb: string | null;
    bluesky: string | null;
    discord: string | null;
    github: string | null;
    reddit: string | null;
    mastodon: string | null;
    otherLink: string | null;
    appearanceProfile: unknown;
    allowCampaignSystemOverride: boolean;
    timezone: string | null;
    uiLocale: string | null;
    createdAt: Date;
    campaignMembers: Array<{
      role: string;
      createdAt: Date;
      campaign: { id: string; name: string; handle: string; archivedAt: Date | null };
    }>;
  },
  systemDefaultTimezone: string,
) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    pronouns: user.pronouns,
    publicBio: user.publicBio,
    defaultPitch: user.defaultPitch,
    statusBlurb: user.statusBlurb,
    bluesky: user.bluesky,
    discord: user.discord,
    github: user.github,
    reddit: user.reddit,
    mastodon: user.mastodon,
    otherLink: user.otherLink,
    appearanceProfile: serializeAppearanceProfileForApi(
      sanitizeAppearanceProfile(user.appearanceProfile) ?? null,
    ),
    allowCampaignSystemOverride: user.allowCampaignSystemOverride,
    timezone: user.timezone,
    uiLocale: user.uiLocale,
    effectiveTimezone: resolveEffectiveTimezone({
      userTimezone: user.timezone,
      systemDefaultTimezone,
    }),
    username: deriveUsername(user.email),
    createdAt: user.createdAt.toISOString(),
    campaigns: user.campaignMembers.map((membership) => ({
      id: membership.campaign.id,
      name: membership.campaign.name,
      slug: membership.campaign.handle,
      role: membership.role as CampaignMemberRole,
      joinedAt: membership.createdAt.toISOString(),
      isArchived: membership.campaign.archivedAt != null,
    })),
  };
}

/** Global account profile (display name, email, campaign memberships). */
export async function getUserProfile(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.user!.id },
      select: profileSelect,
    }),
    getOrCreateSystemSettings(),
  ]);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    profile: serializeProfile(user, settings.defaultTimezone),
  });
}

/** @alias Global profile fetch — same handler as {@link getUserProfile}. */
export const getUserGlobalProfile = getUserProfile;

export async function updateUserProfile(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const hasAppearanceField =
    Object.prototype.hasOwnProperty.call(body, 'appearanceProfile') ||
    Object.prototype.hasOwnProperty.call(body, 'allowCampaignSystemOverride');
  const hasAnyField =
    PROFILE_UPDATE_KEYS.some((key) =>
      Object.prototype.hasOwnProperty.call(body, key),
    ) || hasAppearanceField;

  if (!hasAnyField) {
    res.status(400).json({
      error: 'At least one profile field must be provided',
    });
    return;
  }

  const updateData: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
    const { displayName } = body;
    if (displayName !== null && typeof displayName !== 'string') {
      res.status(400).json({ error: 'Display name must be a string' });
      return;
    }

    const sanitized = sanitizeDisplayName(displayName);
    if (
      typeof displayName === 'string' &&
      displayName.trim().length > 0 &&
      sanitized === null
    ) {
      res.status(400).json({
        error: 'Display name is invalid or empty after sanitization',
      });
      return;
    }

    updateData.displayName = sanitized;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'avatarUrl')) {
    const { avatarUrl } = body;
    if (avatarUrl !== null && typeof avatarUrl !== 'string') {
      res.status(400).json({ error: 'avatarUrl must be a string or null' });
      return;
    }
    if (avatarUrl === null || avatarUrl.trim() === '') {
      updateData.avatarUrl = null;
    } else {
      const sanitized = sanitizeSocialLink(avatarUrl);
      if (!sanitized && !avatarUrl.startsWith('/uploads/')) {
        res.status(400).json({ error: 'avatarUrl must be a valid URL or /uploads/* path' });
        return;
      }
      updateData.avatarUrl = avatarUrl.startsWith('/uploads/')
        ? avatarUrl.trim()
        : (sanitized as string);
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'pronouns')) {
    if (body.pronouns !== null && typeof body.pronouns !== 'string') {
      res.status(400).json({ error: 'pronouns must be a string' });
      return;
    }

    updateData.pronouns =
      body.pronouns === null || body.pronouns === ''
        ? null
        : sanitizePronouns(body.pronouns);
  }

  let emailChanged = false;

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    if (typeof body.email !== 'string') {
      res.status(400).json({ error: 'Email must be a string' });
      return;
    }

    const normalized = normalizeEmail(body.email);
    if (!normalized) {
      res.status(400).json({ error: 'A valid email address is required' });
      return;
    }

    const current = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true },
    });

    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (normalized !== current.email) {
      const existing = await prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true },
      });

      if (existing && existing.id !== req.user!.id) {
        res.status(409).json({
          error: 'That email address is already registered to another account',
        });
        return;
      }

      updateData.email = normalized;
      emailChanged = true;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'publicBio')) {
    if (body.publicBio !== null && typeof body.publicBio !== 'string') {
      res.status(400).json({ error: 'publicBio must be a string' });
      return;
    }

    updateData.publicBio =
      body.publicBio === null || body.publicBio === ''
        ? null
        : sanitizePublicBio(body.publicBio);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'defaultPitch')) {
    if (body.defaultPitch !== null && typeof body.defaultPitch !== 'string') {
      res.status(400).json({ error: 'defaultPitch must be a string' });
      return;
    }

    updateData.defaultPitch =
      body.defaultPitch === null || body.defaultPitch === ''
        ? null
        : sanitizeDefaultPitch(body.defaultPitch);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'statusBlurb')) {
    if (body.statusBlurb !== null && typeof body.statusBlurb !== 'string') {
      res.status(400).json({ error: 'statusBlurb must be a string' });
      return;
    }

    updateData.statusBlurb =
      body.statusBlurb === null || body.statusBlurb === ''
        ? null
        : sanitizeStatusBlurb(body.statusBlurb);
  }

  for (const key of USER_SOCIAL_LINK_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;

    const raw = body[key];
    if (raw !== null && typeof raw !== 'string') {
      res.status(400).json({ error: `${key} must be a string` });
      return;
    }

    if (raw === null || raw === '') {
      updateData[key] = null;
      continue;
    }

    const sanitized = sanitizeSocialLink(raw);
    if (!sanitized) {
      res.status(400).json({ error: `Invalid URL for ${key}` });
      return;
    }

    updateData[key] = sanitized;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'appearanceProfile')) {
    const sanitized = sanitizeAppearanceProfile(body.appearanceProfile);
    if (body.appearanceProfile !== null && sanitized === undefined) {
      res.status(400).json({ error: 'appearanceProfile must be a valid object or null' });
      return;
    }
    updateData.appearanceProfile =
      sanitized === null || sanitized === undefined
        ? Prisma.JsonNull
        : toInputJsonValue(sanitized);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'allowCampaignSystemOverride')) {
    if (typeof body.allowCampaignSystemOverride !== 'boolean') {
      res.status(400).json({
        error: 'allowCampaignSystemOverride must be a boolean',
      });
      return;
    }
    updateData.allowCampaignSystemOverride = body.allowCampaignSystemOverride;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'timezone')) {
    if (body.timezone !== null && typeof body.timezone !== 'string') {
      res.status(400).json({ error: 'timezone must be a string or null' });
      return;
    }
    if (body.timezone === null || body.timezone === '') {
      updateData.timezone = null;
    } else {
      const sanitized = sanitizeTimezone(body.timezone);
      if (!sanitized) {
        res.status(400).json({ error: 'timezone must be a valid IANA timezone' });
        return;
      }
      updateData.timezone = sanitized;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'uiLocale')) {
    if (body.uiLocale !== null && typeof body.uiLocale !== 'string') {
      res.status(400).json({ error: 'uiLocale must be a string or null' });
      return;
    }
    if (body.uiLocale === null || body.uiLocale === '') {
      updateData.uiLocale = null;
    } else {
      const sanitized = sanitizeUiLocale(body.uiLocale);
      if (!sanitized) {
        res.status(400).json({ error: 'uiLocale must be a valid BCP 47 language tag' });
        return;
      }
      updateData.uiLocale = sanitized;
    }
  }

  const [user, settings] = await Promise.all([
    prisma.user.update({
      where: { id: req.user!.id },
      data: updateData as Prisma.UserUpdateInput,
      select: profileSelect,
    }),
    getOrCreateSystemSettings(),
  ]);

  if (emailChanged) {
    const token = signAuthToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);
  }

  res.json({ profile: serializeProfile(user, settings.defaultTimezone) });
}

/** @alias Global profile update — same handler as {@link updateUserProfile}. */
export const updateUserGlobalProfile = updateUserProfile;

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({
      error: 'Current password and new password are required',
    });
    return;
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!isPasswordAuthEnabled(user)) {
    res.status(400).json({
      error:
        'This account uses external sign-in only. Use your identity provider to manage access.',
    });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash!);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash!);
  if (sameAsCurrent) {
    res.status(400).json({
      error: 'New password must be different from your current password',
    });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  res.json({ ok: true });
}

/** Uploads a profile avatar image and stores `/uploads/<filename>` on user.avatarUrl. */
export async function uploadUserAvatar(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: 'Avatar image file is required' });
    return;
  }

  try {
    const diskPath = path.join(env.uploadsDir, file.filename);
    await assertImageFile(
      diskPath,
      file.mimetype,
      path.extname(file.originalname),
    );
  } catch (err) {
    deleteUploadedFile(file.filename);
    if (err instanceof UploadValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { avatarUrl: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Remove previous local avatar file if present.
  deleteUploadedFileFromUrl(user.avatarUrl);

  const avatarUrl = `/uploads/${file.filename}`;
  const [updated, settings] = await Promise.all([
    prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl },
      select: profileSelect,
    }),
    getOrCreateSystemSettings(),
  ]);

  res.json({ profile: serializeProfile(updated, settings.defaultTimezone) });
}

/** Permanently deletes the signed-in account and disposes uploaded avatar asset. */
export async function deleteUserAccount(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, avatarUrl: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Step B: purge avatar file first so no orphaned upload remains.
  deleteUploadedFileFromUrl(user.avatarUrl);

  // Step C: remove account row (relations cascade in schema).
  await prisma.user.delete({ where: { id: user.id } });
  clearAuthCookie(res);
  res.json({ ok: true });
}
