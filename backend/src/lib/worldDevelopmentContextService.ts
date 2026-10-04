import type { Prisma } from './prismaClient.js';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import type { FactionActivityLevel } from '../../../shared/worldDevelopmentMetadata.js';
import {
  buildNormalizedTrajectoryContext,
  type ProjectedFactionState,
  type WorldDevelopmentContext,
} from '../../../shared/developmentProvider.js';
import {
  resolveFactionTrajectoryForEra,
  type FactionEraTrajectory,
} from '../../../shared/factionMomentumMetadata.js';
import { buildCampaignWorldPressureProjection } from './worldPressureProjectionService.js';
import { buildEntityCategoryWhereClause } from './wikiCategoryEntityIndex.js';
import { resolveWorldDevelopmentSettings } from './worldDevelopmentSettingsService.js';
import { parseOrganizationMetadata } from './organizationMetadata.js';
import { ensureCampaignMomentum, getCurrentCampaignEra, toCampaignMomentumPayload } from './campaignMomentumService.js';
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
  eras: { id: string; name: string }[] = [],
): ProjectedFactionState {
  const momentumState = line.momentumState ?? 'stable';
  const eraId = line.currentEraId;
  return buildNormalizedTrajectoryContext({
    subjectPageId: line.orgPageId,
    subjectTitle: line.orgTitle,
    region: null,
    trajectory: {
      eraId,
      byEraId: null,
      direction: null,
      outcome: null,
      momentumState,
      pressure: line.pressure,
      gmNote: null,
    },
    resolvedForEraId: eraId,
    eras: eras.map((era, index) => ({
      id: era.id,
      name: era.name,
      sortOrder: index,
      isCurrent: false,
      epochStartMinute: null,
      epochEndMinute: null,
      narrativeNote: null,
    })),
    activityLevel,
    isExplicit: false,
    bullets: line.bullets,
  });
}

export async function buildProjectedFactionStates(
  campaignId: string,
  options?: { tx?: Prisma.TransactionClient },
): Promise<ProjectedFactionState[]> {
  const db = options?.tx ?? (await import('./prisma.js')).prisma;
  const momentumRow = await ensureCampaignMomentum(campaignId, options?.tx);
  const momentumPayload = toCampaignMomentumPayload(momentumRow);
  const eras = momentumPayload.state.eras;
  const currentEra = getCurrentCampaignEra(momentumPayload.state);

  const orgPages = await db.wikiPage.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...buildEntityCategoryWhereClause('organizations'),
    },
    select: { id: true, title: true, metadata: true },
    orderBy: { title: 'asc' },
  });

  const states: ProjectedFactionState[] = [];
  for (const page of orgPages) {
    const org = parseOrganizationMetadata(page.metadata);
    if (org.organizationStatus !== 'ACTIVE') continue;

    const explicit = resolveFactionTrajectoryForEra({
      eraTrajectories: org.eraTrajectories,
      eraId: currentEra.id,
      worldState: null,
      eras,
    });
    const isExplicit = explicit != null;
    const trajectory =
      explicit ??
      resolveFactionTrajectoryForEra({
        eraTrajectories: org.eraTrajectories,
        eraId: currentEra.id,
        worldState: org.worldState,
        eras,
      });
    if (!trajectory?.momentumState) continue;

    states.push(
      buildNormalizedTrajectoryContext({
        subjectPageId: page.id,
        subjectTitle: page.title,
        region: org.region,
        trajectory,
        resolvedForEraId: currentEra.id,
        eras,
        activityLevel: normalizeActivityLevel(trajectory.activityLevel),
        isExplicit,
        bullets: [],
      }),
    );
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
    bullets: bulletByOrg.get(state.subjectPageId) ?? state.bullets,
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

