import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { getOrCreateSystemSettings, DEFAULT_GLOBAL_TITLE } from '../systemSettings.js';
import {
  buildNotificationEmailHtml,
  isSmtpConfigured,
  sendMail,
} from '../mail/mailSender.js';
import {
  getUserNotificationPreferences,
  resolveChannelPrefs,
} from './preferences.js';
import type { NotificationTypeValue } from './types.js';
import { renderStoredNotification } from './templateCatalog.js';
import { buildNotifyUsersInput } from './notifyFromTemplate.js';
import type { NotifyFromTemplateInput } from './notifyFromTemplate.js';

export interface NotifyUsersInput {
  userIds: string[];
  type: NotificationTypeValue;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt?: Date | null;
}

function uniqueUserIds(userIds: string[]): string[] {
  return [...new Set(userIds.filter(Boolean))];
}

async function deliverToUser(
  userId: string,
  input: NotifyUsersInput,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, uiLocale: true },
  });
  if (!user) return;

  const prefs = await getUserNotificationPreferences(userId);
  if (prefs.mutedUntil && prefs.mutedUntil.getTime() > Date.now()) {
    return;
  }

  const channelPrefs = resolveChannelPrefs(prefs.channels, input.type);

  if (channelPrefs.inApp) {
    await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
        campaignId: input.campaignId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        expiresAt: input.expiresAt ?? null,
        isRead: false,
        readAt: null,
      },
    });
  }

  if (channelPrefs.email && (await isSmtpConfigured())) {
    const settings = await getOrCreateSystemSettings();
    const appTitle = settings.globalTitle ?? DEFAULT_GLOBAL_TITLE;
    const rendered = renderStoredNotification(
      input.type,
      input.metadata,
      { title: input.title, body: input.body },
      user.uiLocale ?? 'en',
    );
    const absoluteLink = input.linkUrl?.startsWith('http')
      ? input.linkUrl
      : input.linkUrl
        ? `${process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'}${input.linkUrl}`
        : null;
    await sendMail({
      to: user.email,
      subject: rendered.title,
      text: [rendered.body?.trim(), absoluteLink].filter(Boolean).join('\n\n'),
      html: buildNotificationEmailHtml({
        title: rendered.title,
        body: rendered.body,
        linkUrl: absoluteLink,
        appTitle,
      }),
    });
  }
}

export async function notifyUsers(input: NotifyUsersInput): Promise<void> {
  const userIds = uniqueUserIds(input.userIds);
  for (const userId of userIds) {
    try {
      await deliverToUser(userId, input);
    } catch (error) {
      console.error('[notificationService] Failed to notify user', {
        userId,
        type: input.type,
        error,
      });
    }
  }
}

export function notifyUsersAsync(input: NotifyUsersInput): void {
  queueMicrotask(() => {
    void notifyUsers(input);
  });
}

export function notifyUsersFromTemplateAsync(input: NotifyFromTemplateInput): void {
  notifyUsersAsync(buildNotifyUsersInput(input));
}

export type { NotifyFromTemplateInput } from './notifyFromTemplate.js';
export { buildNotifyUsersInput } from './notifyFromTemplate.js';

export async function getOperationalManagerUserIds(
  campaignId: string,
): Promise<string[]> {
  const members = await prisma.campaignMember.findMany({
    where: {
      campaignId,
      role: { in: ['GAMEMASTER', 'WRITER'] },
    },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

export async function getCampaignMemberUserIds(
  campaignId: string,
): Promise<string[]> {
  const members = await prisma.campaignMember.findMany({
    where: { campaignId },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

export async function getCampaignSlug(campaignId: string): Promise<string | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { handle: true },
  });
  return campaign?.handle ?? null;
}
