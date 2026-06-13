export function campaignPath(handle: string, ...segments: string[]): string {
  const suffix = segments.filter(Boolean).join('/');
  return suffix ? `/campaigns/${handle}/${suffix}` : `/campaigns/${handle}`;
}

export function campaignDashboardPath(handle: string): string {
  return campaignPath(handle, 'dashboard');
}

export function campaignSettingsPath(handle: string, tab?: string): string {
  const base = campaignPath(handle, 'settings');
  return tab ? `${base}?tab=${encodeURIComponent(tab)}` : base;
}

export function campaignNotePath(handle: string, timelinePointId: string): string {
  return campaignPath(handle, 'notes', timelinePointId);
}

export function campaignDowntimeHubPath(handle: string): string {
  return campaignPath(handle, 'downtime');
}

export function campaignProgressionDevelopmentsPath(handle: string): string {
  return `${campaignPath(handle, 'progression')}?section=developments`;
}

export function campaignThreadsHubPath(handle: string): string {
  return campaignPath(handle, 'threads');
}

export function campaignWikiMaintenancePath(handle: string): string {
  return campaignPath(handle, 'wiki', 'maintenance');
}

export function campaignTransferOwnershipPath(handle: string): string {
  return campaignPath(handle, 'transfer-ownership');
}

export function hubPath(): string {
  return '/hub';
}

export function userNotificationsPath(): string {
  return '/notifications';
}

export function userSettingsNotificationsPath(): string {
  return '/settings?tab=notifications';
}
