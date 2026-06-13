import { CampaignWorkspace } from '../../../../shared/campaignWorkspace.js';
import { AssetTypes } from '../../types/domain.js';
import { buildEnsembleBundle } from '../buildEnsembleBundle.js';
import { buildDashboardChronometer } from '../buildDashboardChronometer.js';
import { prisma } from '../prisma.js';
import { canViewMapAsset } from '../mapAssetVisibility.js';
import { canViewWikiPage } from '../wikiTree.js';
import { normalizeCampaignMemberRole } from '../acl.js';
import type { CampaignMemberRole } from '../../types/domain.js';
import type {
  PluginCalendarReadDto,
  PluginLoreIndexEntryDto,
  PluginMapSummaryDto,
  PluginPartyMemberDto,
  PluginTimelineEventDto,
  PluginWorldSummaryDto,
} from '../../../../shared/pluginCampaignRead.js';
import { serializeEpochMinute } from '../timeTracking.js';

async function resolveViewerRole(
  campaignId: string,
  viewerUserId: string | null,
): Promise<CampaignMemberRole | null> {
  if (!viewerUserId) return null;
  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: viewerUserId, campaignId } },
    select: { role: true },
  });
  return membership ? normalizeCampaignMemberRole(membership.role) : null;
}

export async function readPluginCalendar(
  campaignId: string,
): Promise<PluginCalendarReadDto> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  const chronometer = await buildDashboardChronometer(campaignId);
  return {
    currentEpochMinute: campaign
      ? serializeEpochMinute(campaign.currentEpochMinute)
      : null,
    label: chronometer?.label ?? null,
    season: chronometer?.season ?? null,
    masterCalendarId: chronometer?.masterCalendarId ?? null,
    moonPhaseSummary: chronometer?.moonPhase ?? null,
  };
}

export async function readPluginTimelineRecent(
  campaignId: string,
  limit = 20,
): Promise<PluginTimelineEventDto[]> {
  const rows = await prisma.narrativeEvent.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      pageId: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    pageId: row.pageId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function readPluginParty(
  campaignId: string,
  viewerUserId: string | null,
): Promise<PluginPartyMemberDto[]> {
  const role = await resolveViewerRole(campaignId, viewerUserId);
  const bundle = await buildEnsembleBundle(campaignId, role);
  return (bundle?.members ?? []).map((member) => ({
    userId: member.userId,
    playerLabel: member.playerLabel,
    identityPageId: member.identityPageId,
  }));
}

export async function readPluginWorldSummary(
  campaignId: string,
): Promise<PluginWorldSummaryDto | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      handle: true,
      name: true,
      dashboardConfig: true,
    },
  });
  if (!campaign) return null;
  const config =
    campaign.dashboardConfig &&
    typeof campaign.dashboardConfig === 'object' &&
    !Array.isArray(campaign.dashboardConfig)
      ? (campaign.dashboardConfig as { hero?: { currentArc?: unknown } })
      : null;
  const currentArc =
    typeof config?.hero?.currentArc === 'string' ? config.hero.currentArc : null;
  return {
    handle: campaign.handle,
    name: campaign.name,
    currentArc,
  };
}

const LORE_WORKSPACE_MAP: Record<string, CampaignWorkspace> = {
  characters: CampaignWorkspace.CHARACTERS,
  organizations: CampaignWorkspace.ORGANIZATIONS,
  locations: CampaignWorkspace.LOCATIONS,
};

export async function readPluginLoreIndex(
  campaignId: string,
  kind: 'characters' | 'organizations' | 'locations',
  viewerUserId: string | null,
  limit = 100,
): Promise<PluginLoreIndexEntryDto[]> {
  const workspace = LORE_WORKSPACE_MAP[kind];
  const role = await resolveViewerRole(campaignId, viewerUserId);
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, workspace, deletedAt: null },
    select: {
      id: true,
      title: true,
      workspace: true,
      templateType: true,
      visibility: true,
      parentId: true,
    },
    orderBy: { title: 'asc' },
    take: limit * 2,
  });

  const visible: PluginLoreIndexEntryDto[] = [];
  for (const page of pages) {
    if (visible.length >= limit) break;
    if (!canViewWikiPage(page.visibility, role)) continue;
    visible.push({
      id: page.id,
      title: page.title,
      workspace: page.workspace,
      templateType: page.templateType,
    });
  }
  return visible;
}

export async function readPluginMaps(
  campaignId: string,
  viewerUserId: string | null,
  limit = 50,
): Promise<PluginMapSummaryDto[]> {
  const role = await resolveViewerRole(campaignId, viewerUserId);
  const assets = await prisma.asset.findMany({
    where: { campaignId, type: AssetTypes.MAP },
    select: { id: true, displayName: true, visibility: true },
    orderBy: { displayName: 'asc' },
    take: limit * 2,
  });
  const result: PluginMapSummaryDto[] = [];
  for (const asset of assets) {
    if (result.length >= limit) break;
    if (!canViewMapAsset(asset.visibility, role)) continue;
    result.push({ id: asset.id, title: asset.displayName ?? 'Untitled map' });
  }
  return result;
}
