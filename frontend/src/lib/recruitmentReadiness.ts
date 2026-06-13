export function isCampaignScheduleConfigured(campaign: {
  scheduleFrequency?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
}): boolean {
  return (
    (campaign.scheduleFrequency?.trim().length ?? 0) > 0 &&
    (campaign.scheduleDay?.trim().length ?? 0) > 0 &&
    (campaign.scheduleTime?.trim().length ?? 0) > 0
  );
}
