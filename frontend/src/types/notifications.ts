export type NotificationType =
  | 'JOIN_REQUEST_ACCEPTED'
  | 'JOIN_REQUEST_DENIED'
  | 'JOIN_REQUEST_RECEIVED'
  | 'ROLE_CHANGED'
  | 'OWNERSHIP_TRANSFER_OFFERED'
  | 'OWNERSHIP_TRANSFER_COMPLETED'
  | 'OWNERSHIP_TRANSFER_DECLINED'
  | 'OWNERSHIP_TRANSFER_EXPIRED'
  | 'MEMBER_DEPARTED'
  | 'SESSION_PUBLISHED'
  | 'SESSION_CHANGED'
  | 'SESSION_CANCELLED'
  | 'SESSION_REMINDER_24H'
  | 'RSVP_UPDATED'
  | 'EXPORT_READY'
  | 'EXPORT_FAILED'
  | 'IMPORT_COMPLETE'
  | 'IMPORT_FAILED'
  | 'GENERIC'
  | 'MENTION_IN_PAGE'
  | 'CHARACTER_REFERENCED_IN_PAGE';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  typeLabel: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: string | null;
  linkUrl: string | null;
  campaignId: string | null;
  metadata: Record<string, unknown> | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface NotificationChannelPrefs {
  inApp: boolean;
  email: boolean;
}

export interface NotificationPreferenceGroup {
  id: string;
  label: string;
  types: Array<{
    type: NotificationType;
    label: string;
    channels: NotificationChannelPrefs;
  }>;
}

export interface NotificationCapabilities {
  pollIntervalSeconds: number;
  emailAvailable: boolean;
  minPollIntervalSeconds: number;
  maxPollIntervalSeconds: number;
  defaultTimezone: string;
  effectiveTimezone: string;
}

export interface SessionScheduleRecord {
  timelinePointId: string;
  status: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  timezone: string | null;
  venueType: string | null;
  venueLabel: string | null;
  venueUrl: string | null;
  locationPageId: string | null;
  reminderSentAt: string | null;
  publishedAt: string | null;
}

export type SessionAttendanceStatus = 'ATTENDING' | 'ABSENT' | 'LATE' | 'MAYBE';

export interface OwnershipTransferStatus {
  id: string;
  status: string;
  expiresAt: string;
  campaignName: string;
  fromUser: { id: string; label: string } | null;
  toUser: { id: string; label: string } | null;
}
