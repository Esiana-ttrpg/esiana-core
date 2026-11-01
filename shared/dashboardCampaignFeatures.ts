import { CampaignCapabilities as C, type CampaignCapability } from './campaignPolicy/capabilities.js';
import { normalizeDashboardExternalUrl } from './dashboardQuickLinkCatalog.js';
import type { MetricValue } from './metricValue.js';

export interface DashboardEligibility { member?: boolean; all?: readonly CampaignCapability[]; any?: readonly CampaignCapability[] }
export interface DashboardViewer { isMember: boolean; capabilities: CampaignCapability[]; eligibleWidgetIds: string[] }
export function meetsDashboardEligibility(requirement: DashboardEligibility | undefined, capabilities: ReadonlySet<CampaignCapability>, isMember: boolean) {
  return (!requirement?.member || isMember) && (requirement?.all ?? []).every(cap => capabilities.has(cap)) &&
    (!requirement?.any?.length || requirement.any.some(cap => capabilities.has(cap)));
}
export function initialDashboardWidgets(capabilities: ReadonlySet<CampaignCapability>, isMember: boolean): string[] {
  if (!isMember) return ['currentStory', 'pageSpotlight'];
  return capabilities.has(C.CAMPAIGN_SETTINGS_EDIT)
    ? ['currentStory', 'sessionSchedule', 'lastSessionNotes', 'needsAttention', 'campaignAnnouncements']
    : ['currentStory', 'sessionSchedule', 'partyRoster', 'lastSessionNotes', 'recentActivity'];
}
export function composeInitialDashboard<T extends { id: string; enabled: boolean; x: number; y: number; w: number; h: number }>(widgets: T[], capabilities: ReadonlySet<CampaignCapability>, isMember: boolean): T[] {
  const ids = initialDashboardWidgets(capabilities, isMember);
  const placements = [{ x: 0, y: 0, w: 7, h: 3 }, { x: 7, y: 0, w: 5, h: 2 }, { x: 7, y: 2, w: 5, h: 3 }, { x: 0, y: 3, w: 7, h: 3 }, { x: 7, y: 5, w: 5, h: 3 }];
  return widgets.map(widget => {
    const index = ids.indexOf(widget.id);
    return index >= 0 ? { ...widget, ...placements[index], enabled: true } : { ...widget, enabled: false };
  });
}
export interface DashboardPreview { id: string; title: string; type: string; href: string; imageUrl: string | null; excerpt: string | null }
export interface CampaignAnnouncement {
  id: string; title: string; message: string; style: 'information' | 'important' | 'update';
  link: string | null; expiresAt: string | null; createdAt: string; updatedAt: string;
}
export type AnnouncementInput = Pick<CampaignAnnouncement, 'title' | 'message' | 'style' | 'link' | 'expiresAt'>;
export const CAMPAIGN_ANNOUNCEMENT_RECORD = 'campaign-announcement-v1';
export function parseAnnouncement(raw: unknown): AnnouncementInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 120 ||
    typeof value.message !== 'string' || !value.message.trim() || value.message.length > 8000 ||
    !['information', 'important', 'update'].includes(String(value.style))) return null;
  const link = value.link == null || value.link === '' ? null : normalizeDashboardExternalUrl(value.link);
  if (value.link && !link) return null;
  const expiresAt = value.expiresAt == null || value.expiresAt === '' ? null : value.expiresAt;
  if (expiresAt !== null && (typeof expiresAt !== 'string' || !Number.isFinite(Date.parse(expiresAt)) || !/(Z|[+-]\d{2}:\d{2})$/.test(expiresAt))) return null;
  return { title: value.title.trim(), message: value.message, style: value.style as AnnouncementInput['style'], link,
    expiresAt: expiresAt ? new Date(expiresAt as string).toISOString() : null };
}
export interface DashboardAction { id: string; title: string; context: string; href: string; optional: boolean; deadline: string | null }
export interface CampaignStatistic {
  id: string; category: 'Sessions' | 'Participation' | 'Narrative' | 'Chronology' | 'World' | 'Activity' | 'Time';
  label: string; value: MetricValue; previous: MetricValue; explanation: string;
}
export interface CampaignStatistics {
  days: number; computedAt: string; from: string; to: string; comparisonFrom: string;
  metrics: CampaignStatistic[]; chronology: { major: MetricValue; minor: MetricValue; notice: MetricValue; label: string };
}
export interface DashboardCampaignFeatures {
  map: DashboardPreview | null; spotlight: DashboardPreview | null;
  mapOptions: Array<{ id: string; title: string }>;
  announcements: CampaignAnnouncement[]; actions: DashboardAction[]; statistics: CampaignStatistics | null;
}
