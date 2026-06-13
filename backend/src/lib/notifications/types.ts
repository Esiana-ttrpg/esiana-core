export const NotificationType = {
  JOIN_REQUEST_ACCEPTED: 'JOIN_REQUEST_ACCEPTED',
  JOIN_REQUEST_DENIED: 'JOIN_REQUEST_DENIED',
  JOIN_REQUEST_RECEIVED: 'JOIN_REQUEST_RECEIVED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  OWNERSHIP_TRANSFER_OFFERED: 'OWNERSHIP_TRANSFER_OFFERED',
  OWNERSHIP_TRANSFER_COMPLETED: 'OWNERSHIP_TRANSFER_COMPLETED',
  OWNERSHIP_TRANSFER_DECLINED: 'OWNERSHIP_TRANSFER_DECLINED',
  OWNERSHIP_TRANSFER_EXPIRED: 'OWNERSHIP_TRANSFER_EXPIRED',
  MEMBER_DEPARTED: 'MEMBER_DEPARTED',
  SESSION_PUBLISHED: 'SESSION_PUBLISHED',
  SESSION_CHANGED: 'SESSION_CHANGED',
  SESSION_CANCELLED: 'SESSION_CANCELLED',
  SESSION_REMINDER_24H: 'SESSION_REMINDER_24H',
  RSVP_UPDATED: 'RSVP_UPDATED',
  EXPORT_READY: 'EXPORT_READY',
  EXPORT_FAILED: 'EXPORT_FAILED',
  IMPORT_COMPLETE: 'IMPORT_COMPLETE',
  IMPORT_FAILED: 'IMPORT_FAILED',
  GENERIC: 'GENERIC',
  MENTION_IN_PAGE: 'MENTION_IN_PAGE',
  CHARACTER_REFERENCED_IN_PAGE: 'CHARACTER_REFERENCED_IN_PAGE',
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeValue, string> = {
  JOIN_REQUEST_ACCEPTED: 'Join request accepted',
  JOIN_REQUEST_DENIED: 'Join request denied',
  JOIN_REQUEST_RECEIVED: 'New join request',
  ROLE_CHANGED: 'Role changed',
  OWNERSHIP_TRANSFER_OFFERED: 'Ownership transfer offered',
  OWNERSHIP_TRANSFER_COMPLETED: 'Ownership transfer completed',
  OWNERSHIP_TRANSFER_DECLINED: 'Ownership transfer declined',
  OWNERSHIP_TRANSFER_EXPIRED: 'Ownership transfer expired',
  MEMBER_DEPARTED: 'Member left campaign',
  SESSION_PUBLISHED: 'Session scheduled',
  SESSION_CHANGED: 'Session details changed',
  SESSION_CANCELLED: 'Session cancelled',
  SESSION_REMINDER_24H: 'Session reminder (24 hours)',
  RSVP_UPDATED: 'RSVP update',
  EXPORT_READY: 'Export ready',
  EXPORT_FAILED: 'Export failed',
  IMPORT_COMPLETE: 'Import complete',
  IMPORT_FAILED: 'Import failed',
  GENERIC: 'Notification',
  MENTION_IN_PAGE: 'Mentioned in a page',
  CHARACTER_REFERENCED_IN_PAGE: 'Your character was referenced',
};

export type NotificationChannelPrefs = {
  inApp: boolean;
  email: boolean;
};

export type NotificationPreferenceMap = Partial<
  Record<NotificationTypeValue, NotificationChannelPrefs>
>;

export const NOTIFICATION_TYPE_GROUPS: Array<{
  id: string;
  label: string;
  types: NotificationTypeValue[];
}> = [
  {
    id: 'recruitment',
    label: 'Recruitment',
    types: [
      NotificationType.JOIN_REQUEST_ACCEPTED,
      NotificationType.JOIN_REQUEST_DENIED,
      NotificationType.JOIN_REQUEST_RECEIVED,
    ],
  },
  {
    id: 'membership',
    label: 'Campaign membership',
    types: [
      NotificationType.ROLE_CHANGED,
      NotificationType.OWNERSHIP_TRANSFER_OFFERED,
      NotificationType.OWNERSHIP_TRANSFER_COMPLETED,
      NotificationType.OWNERSHIP_TRANSFER_DECLINED,
      NotificationType.OWNERSHIP_TRANSFER_EXPIRED,
      NotificationType.MEMBER_DEPARTED,
    ],
  },
  {
    id: 'sessions',
    label: 'Sessions',
    types: [
      NotificationType.SESSION_PUBLISHED,
      NotificationType.SESSION_CHANGED,
      NotificationType.SESSION_CANCELLED,
      NotificationType.SESSION_REMINDER_24H,
    ],
  },
  {
    id: 'rsvp',
    label: 'RSVP (DM)',
    types: [NotificationType.RSVP_UPDATED],
  },
  {
    id: 'data',
    label: 'Data & system',
    types: [
      NotificationType.EXPORT_READY,
      NotificationType.EXPORT_FAILED,
      NotificationType.IMPORT_COMPLETE,
      NotificationType.IMPORT_FAILED,
    ],
  },
  {
    id: 'mentions',
    label: 'Mentions & references',
    types: [
      NotificationType.MENTION_IN_PAGE,
      NotificationType.CHARACTER_REFERENCED_IN_PAGE,
    ],
  },
];

/** DM-facing types default email on when SMTP is available. */
export const EMAIL_DEFAULT_ON_TYPES = new Set<NotificationTypeValue>([
  NotificationType.JOIN_REQUEST_RECEIVED,
  NotificationType.OWNERSHIP_TRANSFER_OFFERED,
  NotificationType.MEMBER_DEPARTED,
  NotificationType.RSVP_UPDATED,
  NotificationType.EXPORT_READY,
  NotificationType.EXPORT_FAILED,
]);

export const SessionScheduleStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export const SessionAttendanceStatus = {
  ATTENDING: 'ATTENDING',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  MAYBE: 'MAYBE',
} as const;

export const OwnershipTransferStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
