import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { parseAnnouncement, CAMPAIGN_ANNOUNCEMENT_RECORD } from '../../../shared/dashboardCampaignFeatures.js';
import { campaignAnnouncements } from '../lib/campaignAnnouncements.js';
import { buildCampaignStatistics } from '../lib/stats/buildCampaignStatistics.js';

export async function listDashboardAnnouncements(req: CampaignScopedRequest, res: Response) {
  res.json({ announcements: await campaignAnnouncements(req.campaign!.campaignId, true) });
}
export async function saveDashboardAnnouncement(req: CampaignScopedRequest, res: Response) {
  const input = parseAnnouncement(req.body);
  if (!input) { res.status(400).json({ error: 'Enter a title, formatted message, supported style, safe HTTP/HTTPS link, and valid expiration.' }); return; }
  const campaignId = req.campaign!.campaignId;
  const id = req.params.announcementId;
  const data = { configJson: JSON.stringify(input) };
  if (id) {
    const expected = (req.body as { expectedUpdatedAt?: unknown }).expectedUpdatedAt;
    if (typeof expected !== 'string' || !Number.isFinite(Date.parse(expected))) { res.status(400).json({ error: 'The current announcement version is required.' }); return; }
    const changed = await prisma.dashboardWidget.updateMany({ where: { campaignId, id: String(id), widgetType: CAMPAIGN_ANNOUNCEMENT_RECORD, updatedAt: new Date(expected) }, data });
    if (!changed.count) { res.status(409).json({ error: 'This announcement changed or is unavailable. Refresh before editing.' }); return; }
  } else {
    if (await prisma.dashboardWidget.count({ where: { campaignId, widgetType: CAMPAIGN_ANNOUNCEMENT_RECORD } }) >= 100) {
      res.status(400).json({ error: 'Remove an old announcement before adding another (maximum 100).' }); return;
    }
    await prisma.dashboardWidget.create({ data: { campaignId, widgetType: CAMPAIGN_ANNOUNCEMENT_RECORD, ...data } });
    res.status(201);
  }
  res.json({ announcements: await campaignAnnouncements(campaignId, true) });
}
export async function deleteDashboardAnnouncement(req: CampaignScopedRequest, res: Response) {
  const deleted = await prisma.dashboardWidget.deleteMany({ where: { campaignId: req.campaign!.campaignId, id: String(req.params.announcementId), widgetType: CAMPAIGN_ANNOUNCEMENT_RECORD } });
  if (!deleted.count) { res.status(404).json({ error: 'Announcement unavailable.' }); return; }
  res.status(204).end();
}
export async function getDashboardCampaignStatistics(req: CampaignScopedRequest, res: Response) {
  const days = Number(req.query.days ?? 30);
  if (![7, 30, 90, 365].includes(days)) { res.status(400).json({ error: 'Choose 7, 30, 90, or 365 days.' }); return; }
  res.json(await buildCampaignStatistics(req.campaign!, days));
}
