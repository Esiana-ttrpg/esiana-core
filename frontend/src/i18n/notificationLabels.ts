import { i18n } from '@/i18n/initI18n';
import type { NotificationType } from '@/types/notifications';

const NOTIFICATION_TYPE_KEYS: Record<NotificationType, string> = {
  JOIN_REQUEST_ACCEPTED: 'profile.notifications.typeJoinRequestAccepted',
  JOIN_REQUEST_DENIED: 'profile.notifications.typeJoinRequestDenied',
  JOIN_REQUEST_RECEIVED: 'profile.notifications.typeJoinRequestReceived',
  ROLE_CHANGED: 'profile.notifications.typeRoleChanged',
  OWNERSHIP_TRANSFER_OFFERED: 'profile.notifications.typeOwnershipTransferOffered',
  OWNERSHIP_TRANSFER_COMPLETED: 'profile.notifications.typeOwnershipTransferCompleted',
  OWNERSHIP_TRANSFER_DECLINED: 'profile.notifications.typeOwnershipTransferDeclined',
  OWNERSHIP_TRANSFER_EXPIRED: 'profile.notifications.typeOwnershipTransferExpired',
  MEMBER_DEPARTED: 'profile.notifications.typeMemberDeparted',
  SESSION_PUBLISHED: 'profile.notifications.typeSessionPublished',
  SESSION_CHANGED: 'profile.notifications.typeSessionChanged',
  SESSION_CANCELLED: 'profile.notifications.typeSessionCancelled',
  SESSION_REMINDER_24H: 'profile.notifications.typeSessionReminder24h',
  RSVP_UPDATED: 'profile.notifications.typeRsvpUpdated',
  EXPORT_READY: 'profile.notifications.typeExportReady',
  EXPORT_FAILED: 'profile.notifications.typeExportFailed',
  IMPORT_COMPLETE: 'profile.notifications.typeImportComplete',
  IMPORT_FAILED: 'profile.notifications.typeImportFailed',
  GENERIC: 'profile.notifications.typeGeneric',
};

const NOTIFICATION_GROUP_KEYS: Record<string, string> = {
  recruitment: 'profile.notifications.groupRecruitment',
  membership: 'profile.notifications.groupMembership',
  sessions: 'profile.notifications.groupSessions',
  rsvp: 'profile.notifications.groupRsvp',
  data: 'profile.notifications.groupData',
  mentions: 'profile.notifications.groupMentions',
};

export function translateNotificationTypeLabel(
  type: NotificationType,
  fallback: string,
): string {
  const key = NOTIFICATION_TYPE_KEYS[type];
  if (key && i18n.exists(key)) return i18n.t(key);
  return fallback;
}

export function translateNotificationGroupLabel(groupId: string, fallback: string): string {
  const key = NOTIFICATION_GROUP_KEYS[groupId];
  if (key && i18n.exists(key)) return i18n.t(key);
  return fallback;
}
