import { apiFetch } from '@/lib/api';
import type {
  CampaignScheduleSummary,
  UpcomingSessionSummary,
} from '@/types/notifications';

export async function fetchCampaignSchedule(campaignHandle: string): Promise<{
  schedule: CampaignScheduleSummary;
  upcoming: UpcomingSessionSummary | null;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/schedule`);
}

export async function patchCampaignSchedule(
  campaignHandle: string,
  input: {
    scheduleFrequency?: string | null;
    scheduleDay?: string | null;
    scheduleTime?: string | null;
    scheduleTimezone?: string | null;
    schedulingEnabled?: boolean;
    autoScheduleUpcomingSession?: boolean;
  },
): Promise<{
  schedule: CampaignScheduleSummary;
  upcoming: UpcomingSessionSummary | null;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function postScheduleUpcoming(
  campaignHandle: string,
  input: {
    plannedStartAt: string;
    plannedEndAt?: string | null;
    timezone?: string | null;
    applyRecurrenceChange?: boolean;
    scheduleFrequency?: string | null;
    scheduleDay?: string | null;
    scheduleTime?: string | null;
    scheduleTimezone?: string | null;
    rescheduleExisting?: boolean;
    timelinePointId?: string;
    plannedWorldEpochMinute?: string | null;
  },
): Promise<{ upcoming: UpcomingSessionSummary }> {
  return apiFetch(`/campaigns/${campaignHandle}/schedule/upcoming`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function postSkipUpcomingSession(
  campaignHandle: string,
  input: {
    timelinePointId: string;
    reason?: string | null;
    scheduleNextAutomatically?: boolean;
  },
): Promise<{
  skipped: UpcomingSessionSummary;
  next: UpcomingSessionSummary | null;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/schedule/upcoming/skip`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
