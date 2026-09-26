import { prisma } from './prisma.js';

function serializeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}

export async function buildFullCampaignBundle(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, displayName: true },
          },
        },
      },
      assets: true,
      wikiPages: true,
      notebookArcs: true,
      fantasyCalendars: {
        include: {
          events: true,
        },
      },
      calendarEventCategories: true,
      joinRequests: true,
      pageShortcuts: true,
      playerSandboxNotes: true,
      dashboardWidgets: true,
      tags: true,
      sessionTimelinePoints: true,
      activities: true,
      pluginSettings: true,
    },
  });

  if (!campaign) return null;

  const characterDb = prisma as typeof prisma & {
    characterPageTab: { findMany(args: unknown): Promise<unknown[]> };
    pluginCharacterPageState: { findMany(args: unknown): Promise<unknown[]> };
    characterField: { findMany(args: unknown): Promise<unknown[]> };
  };
  const [wikiLinks, mapPins, characterPageTabs, pluginCharacterPageStates, characterFields] = await Promise.all([
    prisma.wikiLink.findMany({ where: { campaignId } }),
    prisma.mapPin.findMany({
      where: {
        asset: { campaignId },
      },
    }),
    characterDb.characterPageTab.findMany({ where: { campaignId } }),
    characterDb.pluginCharacterPageState.findMany({ where: { campaignId } }),
    characterDb.characterField.findMany({ where: { campaignId } }),
  ]);

  const mediaRefs = campaign.assets.map((asset) => ({
    id: asset.id,
    url: asset.url,
    type: asset.type,
    expiresAt: asset.expiresAt,
  }));

  return serializeForJson({
    exportedAt: new Date().toISOString(),
    format: 'esiana-campaign-backup-v2',
    campaign: {
      ...campaign,
      assets: mediaRefs,
    },
    wikiLinks,
    mapPins,
    characterPageTabs,
    pluginCharacterPageStates,
    characterFields,
  });
}
