import { prisma } from './prisma.js';
import { CAMPAIGN_ANNOUNCEMENT_RECORD, parseAnnouncement, type CampaignAnnouncement, type AnnouncementInput } from '../../../shared/dashboardCampaignFeatures.js';

export async function campaignAnnouncements(campaignId: string, includeExpired = false): Promise<CampaignAnnouncement[]> {
  const records = await prisma.dashboardWidget.findMany({ where: { campaignId, widgetType: CAMPAIGN_ANNOUNCEMENT_RECORD }, orderBy: { createdAt: 'desc' }, take: 100 });
  return records.flatMap(row => {
    let value: AnnouncementInput | null = null;
    try { value = parseAnnouncement(JSON.parse(row.configJson ?? 'null')); } catch { /* Malformed legacy records never render. */ }
    if (!value || (!includeExpired && value.expiresAt && Date.parse(value.expiresAt) <= Date.now())) return [];
    return [{ ...value, id: row.id, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }];
  });
}
