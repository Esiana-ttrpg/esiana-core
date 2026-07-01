import {
  resolveMonthlyBudgetRange,
  type WorldDevelopmentSettings,
} from '../../../shared/worldDevelopmentMetadata.js';
import type {
  WorldDevelopmentReadiness,
  WorldDevelopmentReadinessIssue,
  WorldDevelopmentSourceSignalsSummary,
  WorldDevelopmentStatusSummary,
} from '../../../shared/worldDevelopmentPresentation.js';
import {
  worldActivityLabelForBudget,
  WORLD_DEVELOPMENT_MODE_HEADLINES,
} from '../../../shared/worldDevelopmentPresentation.js';
import { resolveFactionTrajectoryForEra } from '../../../shared/factionMomentumMetadata.js';
import { prisma } from './prisma.js';
import { buildEntityCategoryWhereClause } from './wikiCategoryEntityIndex.js';
import {
  ensureCampaignMomentum,
  getCurrentCampaignEra,
  toCampaignMomentumPayload,
} from './campaignMomentumService.js';
import { buildCampaignWorldPressureProjection } from './worldPressureProjectionService.js';
import { parseOrganizationMetadata } from './organizationMetadata.js';

/** Campaign-time month length (30 days). */
export const CAMPAIGN_MONTH_MINUTES = 30 * 24 * 60;

export function campaignMonthStartEpoch(currentEpochMinute: bigint): bigint {
  const monthIndex = currentEpochMinute / BigInt(CAMPAIGN_MONTH_MINUTES);
  return monthIndex * BigInt(CAMPAIGN_MONTH_MINUTES);
}

export async function countGeneratedThisCampaignMonth(
  campaignId: string,
  currentEpochMinute: bigint | null,
): Promise<number> {
  if (currentEpochMinute == null) return 0;
  const monthStart = campaignMonthStartEpoch(currentEpochMinute);
  return prisma.campaignWorldEventSuggestion.count({
    where: {
      campaignId,
      occurredAtEpochMinute: { gte: monthStart },
    },
  });
}

export async function buildWorldDevelopmentSourceSignals(
  campaignId: string,
): Promise<WorldDevelopmentSourceSignalsSummary> {
  const [campaign, orgPages, scheduledCount, projection] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    prisma.wikiPage.findMany({
      where: { campaignId, deletedAt: null, ...buildEntityCategoryWhereClause('organizations') },
      select: { id: true, title: true, metadata: true },
    }),
    prisma.campaignScheduledEffect.count({
      where: {
        campaignId,
        status: 'active',
        effectKind: { in: ['world_development_prompt', 'haven_threat_prompt'] },
      },
    }),
    buildCampaignWorldPressureProjection(campaignId),
  ]);

  const momentum = await ensureCampaignMomentum(campaignId);
  const currentEra = getCurrentCampaignEra(toCampaignMomentumPayload(momentum).state);

  const activeOrgs = orgPages.filter((page) => {
    const org = parseOrganizationMetadata(page.metadata);
    return org.organizationStatus === 'ACTIVE';
  });

  let factionsWithSignals = 0;
  let factionsMissingTrajectory = 0;

  for (const page of activeOrgs) {
    const org = parseOrganizationMetadata(page.metadata);
    const trajectory = resolveFactionTrajectoryForEra({
      eraTrajectories: org.eraTrajectories,
      eraId: currentEra.id,
      worldState: org.worldState,
    });
    if (trajectory) {
      factionsWithSignals += 1;
    } else {
      factionsMissingTrajectory += 1;
    }
  }

  const hasCampaignTime = campaign?.currentEpochMinute != null;
  const risingTensions = projection.risingTensions.length;

  return {
    usesFactionTrajectories: true,
    usesOrganizationWorldStates: true,
    usesScheduledEffects: scheduledCount > 0,
    scheduledEffectsActiveCount: scheduledCount,
    usesCampaignTime: hasCampaignTime,
    usesWorldPressureProjection: hasCampaignTime && risingTensions >= 0,
    activeFactionCount: activeOrgs.length,
    factionsWithSignalsCount: factionsWithSignals,
    factionsMissingTrajectoryCount: factionsMissingTrajectory,
  };
}

export async function buildWorldDevelopmentReadiness(input: {
  campaignId: string;
  settings: WorldDevelopmentSettings;
  generatedThisCampaignMonth: number;
  budgetMax: number;
}): Promise<WorldDevelopmentReadiness> {
  const { campaignId, settings, generatedThisCampaignMonth, budgetMax } = input;

  const [campaign, projection, orgPages] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    buildCampaignWorldPressureProjection(campaignId),
    prisma.wikiPage.findMany({
      where: { campaignId, deletedAt: null, ...buildEntityCategoryWhereClause('organizations') },
      select: { id: true, title: true, metadata: true },
      orderBy: { title: 'asc' },
    }),
  ]);

  const momentum = await ensureCampaignMomentum(campaignId);
  const currentEra = getCurrentCampaignEra(toCampaignMomentumPayload(momentum).state);

  const missingTrajectoryOrgs: Array<{ id: string; title: string }> = [];

  for (const page of orgPages) {
    const org = parseOrganizationMetadata(page.metadata);
    if (org.organizationStatus !== 'ACTIVE') continue;
    const trajectory = resolveFactionTrajectoryForEra({
      eraTrajectories: org.eraTrajectories,
      eraId: currentEra.id,
      worldState: org.worldState,
    });
    if (!trajectory) {
      missingTrajectoryOrgs.push({ id: page.id, title: page.title });
    }
  }

  const hasCampaignTime = campaign?.currentEpochMinute != null;
  const enabled = settings.mode !== 'off' && !settings.worldPressurePaused;
  const issues: WorldDevelopmentReadinessIssue[] = [];

  if (settings.mode === 'off') {
    issues.push({
      kind: 'mode_off',
      message: 'World Development is off for this campaign.',
    });
  }

  if (settings.worldPressurePaused) {
    issues.push({
      kind: 'world_pressure_paused',
      message: 'Development is paused.',
    });
  }

  if (!hasCampaignTime) {
    issues.push({
      kind: 'no_campaign_time',
      message: 'No campaign time configured.',
    });
  }

  if (missingTrajectoryOrgs.length > 0) {
    const n = missingTrajectoryOrgs.length;
    issues.push({
      kind: 'missing_trajectories',
      message:
        n === 1
          ? '1 faction missing trajectory data'
          : `${n} factions missing trajectories`,
    });
  }

  if (
    enabled &&
    hasCampaignTime &&
    projection.risingTensions.length === 0 &&
    projection.eraTrends.length === 0
  ) {
    issues.push({
      kind: 'no_pressure_signals',
      message: 'No faction pressure signals for the current era.',
    });
  }

  if (enabled && generatedThisCampaignMonth >= budgetMax && budgetMax > 0) {
    issues.push({
      kind: 'budget_exhausted',
      message: 'World activity limit reached for this campaign month.',
    });
  }

  const blockingKinds = new Set<WorldDevelopmentReadinessIssue['kind']>([
    'missing_trajectories',
    'no_campaign_time',
    'budget_exhausted',
    'world_pressure_paused',
    'no_pressure_signals',
  ]);

  const hasBlocking = issues.some((issue) => blockingKinds.has(issue.kind));

  return {
    healthy: !hasBlocking && settings.mode !== 'off',
    issues,
    missingTrajectoryOrgs: missingTrajectoryOrgs.slice(0, 12),
    risingTensionsCount: projection.risingTensions.length,
  };
}

export function buildWorldDevelopmentStatusSummary(input: {
  settings: WorldDevelopmentSettings;
  pendingCount: number;
  generatedThisCampaignMonth: number;
}): WorldDevelopmentStatusSummary {
  const { settings, pendingCount, generatedThisCampaignMonth } = input;
  const { max: budgetMax } = resolveMonthlyBudgetRange(settings);

  return {
    mode: settings.mode,
    modeHeadline: WORLD_DEVELOPMENT_MODE_HEADLINES[settings.mode],
    enabled: settings.mode !== 'off' && !settings.worldPressurePaused,
    paused: settings.worldPressurePaused === true,
    pendingCount,
    generatedThisCampaignMonth,
    budgetMax,
    worldActivityLabel: worldActivityLabelForBudget(settings.campaignMonthlyBudget),
  };
}
