import type { Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import type { FactionActivityLevel } from '../../../shared/worldDevelopmentMetadata.js';
import type { ProjectedFactionState, WorldDevelopmentContext } from '../../../shared/developmentProvider.js';
import {
  resolveFactionTrajectoryForEra,
  type FactionEraTrajectory,
} from '../../../shared/factionMomentumMetadata.js';
import { buildCampaignWorldPressureProjection } from './worldPressureProjectionService.js';
import { resolveWorldDevelopmentSettings } from './worldDevelopmentSettingsService.js';
import { parseOrganizationMetadata } from './organizationMetadata.js';
import { ensureCampaignMomentum, getCurrentCampaignEra, toCampaignMomentumPayload } from './campaignMomentumService.js';
import { FACTION_MOMENTUM_STATE_LABELS } from '../../../shared/factionMomentumMetadata.js';
import type { FactionPressureLine } from '../../../shared/worldPressureProjection.js';

function normalizeActivityLevel(
  raw: FactionEraTrajectory['activityLevel'],
): FactionActivityLevel {
  if (raw === 'dormant' || raw === 'low' || raw === 'medium' || raw === 'high') {
    return raw;
  }
  return 'medium';
}

export function projectedFactionStateFromLine(
  line: FactionPressureLine,
  activityLevel: FactionActivityLevel,
): ProjectedFactionState {
  return {
    orgPageId: line.orgPageId,
    orgTitle: line.orgTitle,
    momentum: line.momentumState ?? 'stable',
    momentumLabel: line.momentumLabel,
    activityLevel,
    pressure: line.pressure,
    region: null,
    eraId: line.currentEraId,
    bullets: line.bullets,
  };
}

export async function buildProjectedFactionStates(
  campaignId: string,
  options?: { tx?: Prisma.TransactionClient },
): Promise<ProjectedFactionState[]> {
  const db = options?.tx ?? (await import('./prisma.js')).prisma;
  const momentumRow = await ensureCampaignMomentum(campaignId, options?.tx);
  const momentumPayload = toCampaignMomentumPayload(momentumRow);
  const currentEra = getCurrentCampaignEra(momentumPayload.state);

  const orgPages = await db.wikiPage.findMany({
    where: {
      campaignId,
      deletedAt: null,
      templateType: 'ORGANIZATION',
    },
    select: { id: true, title: true, metadata: true },
    orderBy: { title: 'asc' },
  });

  const states: ProjectedFactionState[] = [];
  for (const page of orgPages) {
    const org = parseOrganizationMetadata(page.metadata);
    if (org.organizationStatus !== 'ACTIVE') continue;
    const trajectory = resolveFactionTrajectoryForEra({
      eraTrajectories: org.eraTrajectories,
      eraId: currentEra.id,
      worldState: org.worldState,
    });
    if (!trajectory?.momentumState) continue;
    states.push({
      orgPageId: page.id,
      orgTitle: page.title,
      momentum: trajectory.momentumState,
      momentumLabel: FACTION_MOMENTUM_STATE_LABELS[trajectory.momentumState],
      activityLevel: normalizeActivityLevel(trajectory.activityLevel),
      pressure: trajectory.pressure,
      region: org.region,
      eraId: currentEra.id,
      bullets: [],
    });
  }
  return states;
}

export async function buildWorldDevelopmentContext(
  campaignId: string,
  input: {
    advanceMagnitude: GlobalTimeAdvanceContext['advanceMagnitude'];
    nextEpochMinute: string;
    batchId?: string;
    tx?: Prisma.TransactionClient;
  },
): Promise<WorldDevelopmentContext> {
  const [projection, settings, projectedFactionStates] = await Promise.all([
    buildCampaignWorldPressureProjection(campaignId, {
      tx: input.tx,
      includeSessionForecast: false,
    }),
    resolveWorldDevelopmentSettings(campaignId, input.tx),
    buildProjectedFactionStates(campaignId, { tx: input.tx }),
  ]);

  const bulletByOrg = new Map(
    projection.risingTensions.map((line) => [line.orgPageId, line.bullets] as const),
  );

  const enrichedStates = projectedFactionStates.map((state) => ({
    ...state,
    bullets: bulletByOrg.get(state.orgPageId) ?? state.bullets,
  }));

  return {
    campaignId,
    projectedFactionStates: enrichedStates,
    currentEra: projection.currentEra,
    settings,
    advanceMagnitude: input.advanceMagnitude,
    nextEpochMinute: input.nextEpochMinute,
    batchId: input.batchId,
    projection,
  };
}
