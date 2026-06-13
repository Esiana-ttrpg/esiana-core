import {
  campaignDashboardPath,
  resolveCampaignLinkHandle,
} from '@/lib/campaignPaths';
import { formatRelativeUpdated } from '@/utils/formatDate';
import { CampaignMemberRoles } from '@/types/domain';
import type { CampaignSummary } from '@/types/campaign';
import type { NotificationRecord } from '@/types/notifications';
import type {
  HubContinueCandidate,
  HubContinueEntityItem,
} from '@/types/hub';

export type ContinueCandidate = HubContinueCandidate;

function isManagerRole(role: string | null | undefined): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function unreadCountByCampaign(
  notifications: NotificationRecord[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of notifications) {
    if (item.isRead || !item.campaignId) continue;
    map.set(item.campaignId, (map.get(item.campaignId) ?? 0) + 1);
  }
  return map;
}

function recencyScore(updatedAt: string | undefined): number {
  if (!updatedAt) return 0;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return 0;
  const hours = (Date.now() - date.getTime()) / 3_600_000;
  if (hours < 24) return 50;
  if (hours < 24 * 7) return 25;
  return 0;
}

export function scoreCampaign(
  campaign: CampaignSummary,
  unreadMap: Map<string, number>,
): number {
  let score = 0;
  const unread = unreadMap.get(campaign.id) ?? 0;
  score += Math.min(unread * 100, 300);
  score += recencyScore(campaign.updatedAt);
  if (isManagerRole(campaign.role)) score += 10;
  return score;
}

function buildReason(
  campaign: CampaignSummary,
  unread: number,
): string {
  if (unread > 0) {
    return unread === 1 ? '1 unread update' : `${unread} unread updates`;
  }
  const relative = formatRelativeUpdated(campaign.updatedAt);
  if (relative !== '—') return `Updated ${relative}`;
  return 'Pick up where you left off';
}

function buildCta(campaign: CampaignSummary): { label: string; href: string } {
  const slug = resolveCampaignLinkHandle(campaign);
  return {
    label: isManagerRole(campaign.role) ? 'Continue Prep' : 'Open Campaign',
    href: campaignDashboardPath(slug),
  };
}

export function rankCampaignsForContinue(
  campaigns: CampaignSummary[],
  notifications: NotificationRecord[],
  limit = 3,
): ContinueCandidate[] {
  const memberCampaigns = campaigns.filter((c) => c.isMember);
  const unreadMap = unreadCountByCampaign(notifications);

  return memberCampaigns
    .map((campaign) => {
      const unread = unreadMap.get(campaign.id) ?? 0;
      const score = scoreCampaign(campaign, unreadMap);
      const cta = buildCta(campaign);
      return {
        campaign,
        score,
        reason: buildReason(campaign, unread),
        ctaLabel: cta.label,
        ctaHref: cta.href,
        unreadCount: unread,
      };
    })
    .filter((item) => item.score > 0 || memberCampaigns.length <= 3)
    .sort((a, b) => b.score - a.score || a.campaign.name.localeCompare(b.campaign.name))
    .slice(0, limit);
}

export function sortCampaignsByScore(
  campaigns: CampaignSummary[],
  notifications: NotificationRecord[],
): CampaignSummary[] {
  const unreadMap = unreadCountByCampaign(notifications);
  return [...campaigns].sort((a, b) => {
    const diff = scoreCampaign(b, unreadMap) - scoreCampaign(a, unreadMap);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export function filterOutCampaignIds(
  campaigns: CampaignSummary[],
  excludeIds: Set<string>,
): CampaignSummary[] {
  return campaigns.filter((c) => !excludeIds.has(c.id));
}

export function getCampaignPriorityReason(
  campaign: CampaignSummary,
  notifications: NotificationRecord[],
): string | null {
  const unreadMap = unreadCountByCampaign(notifications);
  const unread = unreadMap.get(campaign.id) ?? 0;
  if (unread > 0) {
    return unread === 1 ? '1 unread' : `${unread} unread`;
  }
  const hours =
    (Date.now() - new Date(campaign.updatedAt).getTime()) / 3_600_000;
  if (!Number.isNaN(hours) && hours < 24) {
    return 'Active today';
  }
  return null;
}

/** Phase 2+: adapt server continue list to spotlight row shape. */
export function mapServerContinueToCandidates(
  items: HubContinueCandidate[],
): ContinueCandidate[] {
  return items.map((item) => ({
    campaign: item.campaign,
    score: item.score,
    reason: item.reason,
    ctaLabel: item.ctaLabel,
    ctaHref: item.ctaHref,
    unreadCount: item.unreadCount ?? 0,
  }));
}

export function mergeContinueEntityFeed(
  items: HubContinueEntityItem[],
): HubContinueEntityItem[] {
  return [...items].sort((a, b) => b.score - a.score).slice(0, 8);
}
