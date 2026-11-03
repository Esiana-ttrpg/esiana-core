import { metricUnavailable } from '../../../../../shared/metricValue.js';
import { buildSlideManifest } from '../../../../../shared/wrapped/slideRegistry.js';
import type {
  WrappedCalculationV1,
  WrappedCampaignPresentation,
  WrappedSlideManifestEntry,
  WrappedYearResponse,
} from '../../../../../shared/wrappedTypes.js';
import { prisma } from '../../prisma.js';
import { extractHeroImageUrl } from '../../recruitmentListing.js';

/**
 * Resolve campaign titles/artwork against current membership.
 * Campaigns the user no longer belongs to are unauthorized; their
 * campaign-scoped ranking rows are dropped and top-campaign may clear.
 * Aggregate personal metrics stay; campaign-scoped disclosure that would
 * reveal private activity is withheld.
 */
export async function reauthorizeWrappedPresentation(input: {
  userId: string;
  calculation: WrappedCalculationV1;
  generatedAt: string;
  regeneratedAt: string | null;
}): Promise<WrappedYearResponse> {
  const calc = structuredClone(input.calculation);
  const campaignIds = [...new Set(calc.referencedCampaignIds)];

  const memberships =
    campaignIds.length === 0
      ? []
      : await prisma.campaignMember.findMany({
          where: {
            userId: input.userId,
            campaignId: { in: campaignIds },
            campaign: { archivedAt: null },
          },
          select: {
            campaignId: true,
            campaign: {
              select: {
                id: true,
                name: true,
                handle: true,
                dashboardConfig: true,
              },
            },
          },
        });

  const authorizedIds = new Set(memberships.map((m) => m.campaignId));
  const redactedCampaignIds = campaignIds.filter((id) => !authorizedIds.has(id));

  const campaigns: Record<string, WrappedCampaignPresentation> = {};
  for (const row of memberships) {
    campaigns[row.campaign.id] = {
      id: row.campaign.id,
      name: row.campaign.name,
      handle: row.campaign.handle,
      href: `/campaigns/${row.campaign.handle}/dashboard`,
      coverImageUrl: extractHeroImageUrl(row.campaign.dashboardConfig),
      authorized: true,
    };
  }
  for (const id of redactedCampaignIds) {
    campaigns[id] = {
      id,
      name: '',
      handle: '',
      href: '',
      coverImageUrl: null,
      authorized: false,
    };
  }

  // Drop campaign-scoped ranking disclosure for unauthorized campaigns.
  for (const id of redactedCampaignIds) {
    delete calc.metrics.byCampaign[id];
  }

  if (calc.topCampaign && redactedCampaignIds.includes(calc.topCampaign.campaignId)) {
    // Re-pick top among still-authorized campaigns using stored ranking inputs.
    const remaining = Object.entries(calc.metrics.byCampaign)
      .map(([campaignId, row]) => ({
        campaignId,
        ...row,
        name: campaigns[campaignId]?.name ?? campaignId,
      }))
      .filter((row) => row.contributions > 0)
      .sort((a, b) => {
        if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
        if (b.contributions !== a.contributions) return b.contributions - a.contributions;
        return a.name.localeCompare(b.name);
      });
    const next = remaining[0];
    calc.topCampaign = next
      ? {
          campaignId: next.campaignId,
          activeDays: next.activeDays,
          contributions: next.contributions,
          pagesTouched: next.pagesTouched,
          ranking: 'active_campaigns_v1',
        }
      : null;

    // If top-campaign slide remains but no authorized top campaign, mark metric gaps.
    if (!calc.topCampaign) {
      calc.slideIds = calc.slideIds.filter((id) => id !== 'top-campaign');
    }
  }

  // Fellow adventurers never export names; if shared attendance relied only on
  // redacted campaigns, keep counts but they remain count-only.
  if (redactedCampaignIds.length > 0 && Object.keys(calc.metrics.byCampaign).length === 0) {
    // No remaining authorized campaign activity — withhold campaign contribution aggregates
    // that would only reflect private tables the user left.
    calc.metrics.participation = {
      sessionsAttended: metricUnavailable('private'),
      sessionsHosted: metricUnavailable('private'),
      campaignsParticipated: metricUnavailable('private'),
    };
  }

  calc.referencedCampaignIds = Object.keys(calc.metrics.byCampaign);

  const slideManifest = buildSlideManifest(calc.slideIds) as WrappedSlideManifestEntry[];

  return {
    version: 1,
    year: calc.year,
    edition: calc.edition,
    timeZone: calc.timeZone,
    generatedAt: input.generatedAt,
    regeneratedAt: input.regeneratedAt,
    calculation: calc,
    presentation: {
      campaigns,
      redactedCampaignIds,
    },
    slideManifest,
  };
}
