import { apiFetch } from '@/lib/api';
import type {
  NotificationCapabilities,
  NotificationChannelPrefs,
  NotificationPreferenceGroup,
  NotificationRecord,
  NotificationType,
  OwnershipTransferStatus,
  SessionAttendanceStatus,
  SessionScheduleRecord,
} from '@/types/notifications';

export async function fetchNotifications(params?: {
  unreadOnly?: boolean;
  campaignId?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ notifications: NotificationRecord[]; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params?.unreadOnly) search.set('unreadOnly', 'true');
  if (params?.campaignId) search.set('campaignId', params.campaignId);
  if (params?.cursor) search.set('cursor', params.cursor);
  if (params?.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiFetch(`/user/notifications${qs ? `?${qs}` : ''}`);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>('/user/notifications/unread-count');
  return data.count ?? 0;
}

export async function fetchNotificationCapabilities(): Promise<NotificationCapabilities> {
  return apiFetch<NotificationCapabilities>('/user/notification-capabilities');
}

export async function markNotificationRead(id: string): Promise<NotificationRecord> {
  const data = await apiFetch<{ notification: NotificationRecord }>(
    `/user/notifications/${id}/read`,
    { method: 'PATCH' },
  );
  return data.notification;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/user/notifications/read-all', { method: 'POST' });
}

export async function dismissNotification(id: string): Promise<void> {
  await apiFetch(`/user/notifications/${id}`, { method: 'DELETE' });
}

export async function fetchNotificationPreferences(): Promise<{
  channels: Partial<Record<NotificationType, NotificationChannelPrefs>>;
  mutedUntil: string | null;
  groups: NotificationPreferenceGroup[];
}> {
  return apiFetch('/user/notification-preferences');
}

export async function patchNotificationPreferences(input: {
  channels?: Partial<Record<NotificationType, Partial<NotificationChannelPrefs>>>;
  mutedUntil?: string | null;
}): Promise<{
  channels: Partial<Record<NotificationType, NotificationChannelPrefs>>;
  mutedUntil: string | null;
}> {
  return apiFetch('/user/notification-preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function fetchSessionSchedule(
  campaignHandle: string,
  timelinePointId: string,
): Promise<{ schedule: SessionScheduleRecord | null; sessionTitle: string; sequenceOrder: number }> {
  return apiFetch(`/campaigns/${campaignHandle}/session-timeline/${timelinePointId}/schedule`);
}

export async function patchSessionSchedule(
  campaignHandle: string,
  timelinePointId: string,
  input: Partial<SessionScheduleRecord>,
): Promise<{ schedule: SessionScheduleRecord }> {
  return apiFetch(`/campaigns/${campaignHandle}/session-timeline/${timelinePointId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function publishSessionSchedule(
  campaignHandle: string,
  timelinePointId: string,
): Promise<{ schedule: SessionScheduleRecord }> {
  return apiFetch(
    `/campaigns/${campaignHandle}/session-timeline/${timelinePointId}/schedule/publish`,
    { method: 'POST' },
  );
}

export async function fetchNextPublishedSession(campaignHandle: string): Promise<{
  session: (SessionScheduleRecord & { sessionTitle: string; sequenceOrder: number }) | null;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/session-timeline/next-published`);
}

export async function patchMySessionAttendance(
  campaignHandle: string,
  timelinePointId: string,
  input: { status: SessionAttendanceStatus; note?: string | null },
): Promise<{ attendance: { status: string; note: string | null; updatedAt: string } }> {
  return apiFetch(
    `/campaigns/${campaignHandle}/session-timeline/${timelinePointId}/attendance/me`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export async function fetchOwnershipTransferStatus(
  campaignHandle: string,
): Promise<{ transfer: OwnershipTransferStatus | null }> {
  return apiFetch(`/campaigns/${campaignHandle}/transfer-ownership/status`);
}

export async function initiateOwnershipTransfer(
  campaignHandle: string,
  targetUserId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/transfer-ownership/initiate`, {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

export async function acceptOwnershipTransfer(campaignHandle: string): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/transfer-ownership/accept`, { method: 'POST' });
}

export async function declineOwnershipTransfer(campaignHandle: string): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/transfer-ownership/decline`, { method: 'POST' });
}

export async function cancelOwnershipTransfer(campaignHandle: string): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/transfer-ownership`, { method: 'DELETE' });
}

export async function startAsyncCampaignBackup(
  campaignHandle: string,
): Promise<{ taskId: string }> {
  return apiFetch(`/campaigns/${campaignHandle}/backup/async`, { method: 'POST' });
}

export async function leaveCampaign(campaignHandle: string): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/members/me`, { method: 'DELETE' });
}

export function resolveNotificationHref(linkUrl: string | null): string | null {
  if (!linkUrl) return null;
  if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) return linkUrl;
  if (linkUrl.startsWith('/api/')) {
    const apiBase = import.meta.env.VITE_API_BASE ?? '/api';
    return `${apiBase.replace(/\/$/, '')}${linkUrl.slice(4)}`;
  }
  return linkUrl;
}
