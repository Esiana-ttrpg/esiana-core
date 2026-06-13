import type { Prisma } from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';
import { buildCalendarStates } from './timeTracking.js';
import type { ChronologyDateParts } from './entityRelationTypes.js';
import {
  ensureCampaignMomentum,
  getCurrentCampaignEra,
  toCampaignMomentumPayload,
} from './campaignMomentumService.js';
import {
  resolveCampaignEraAtEpoch,
  resolveFactionTrajectoryForEra,
} from '../../../shared/factionMomentumMetadata.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import {
  parseOrganizationMetadata,
  resolveOrgRelationsAt,
} from './organizationMetadata.js';
import { fetchNextDashboardSession } from './buildDashboardSessions.js';
import {
  buildWorldPressureProjection,
  type WorldPressureProjection,
  type FactionPressureInput,
} from '../../../shared/worldPressureProjection.js';
import type { FactionEraTrajectory } from '../../../shared/factionMomentumMetadata.js';

export function canAccessWorldPressure(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function countHostileRelations(
  org: ReturnType<typeof parseOrganizationMetadata>,
  date: Awaited<ReturnType<typeof resolveCampaignChronologyNow>>,
): number {
  const resolved = resolveOrgRelationsAt(org, date);
  return resolved.filter(
    (entry) =>
      entry.event.stance === 'HOSTILE' || entry.event.stance === 'SECRET_HOSTILE',
  ).length;
}

function trajectoryForEra(
  trajectories: FactionEraTrajectory[],
  eraId: string,
  worldState: string | null,
): FactionEraTrajectory | null {
  return resolveFactionTrajectoryForEra({ eraTrajectories: trajectories, eraId, worldState });
}

async function resolveChronologyNowFromDb(
  db: Prisma.TransactionClient | typeof prisma,
  campaignId: string,
): Promise<ChronologyDateParts> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      fantasyCalendars: {
        orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
      },
    },
  });
  if (!campaign) return { year: 1, month: 0, day: 1 };
  const calendars = buildCalendarStates(campaign.currentEpochMinute, campaign.fantasyCalendars);
  const master = calendars.find((entry) => entry.isMasterTime) ?? calendars[0];
  if (!master) return { year: 1, month: 0, day: 1 };
  return {
    year: master.state.year,
    month: master.state.monthIndex,
    day: master.state.day,
  };
}

export async function buildCampaignWorldPressureProjection(
  campaignId: string,
  options?: {
    tx?: Prisma.TransactionClient;
    includeSessionForecast?: boolean;
    daysUntilNextSession?: number | null;
    targetEpochMinute?: string | null;
  },
): Promise<WorldPressureProjection> {
  const db = options?.tx ?? prisma;
  const daysOverride = options?.daysUntilNextSession;
  const targetEpochMinute = options?.targetEpochMinute?.trim() || null;
  const includeSessionForecast =
    targetEpochMinute == null &&
    daysOverride === undefined &&
    options?.includeSessionForecast !== false;

  const momentumRow = await ensureCampaignMomentum(campaignId, options?.tx);
  const momentumPayload = toCampaignMomentumPayload(momentumRow);

  const [orgPages, chronologyNow, nextSession] = await Promise.all([
    db.wikiPage.findMany({
      where: {
        campaignId,
        deletedAt: null,
        templateType: 'ORGANIZATION',
      },
      select: { id: true, title: true, metadata: true },
      orderBy: { title: 'asc' },
    }),
    options?.tx
      ? resolveChronologyNowFromDb(db, campaignId)
      : resolveCampaignChronologyNow(campaignId),
    includeSessionForecast ? fetchNextDashboardSession(campaignId) : Promise.resolve(null),
  ]);

  const currentEra =
    targetEpochMinute != null
      ? resolveCampaignEraAtEpoch(momentumPayload.state, targetEpochMinute)
      : getCurrentCampaignEra(momentumPayload.state);
  const activeOrgs = orgPages.filter((page) => {
    const org = parseOrganizationMetadata(page.metadata);
    return org.organizationStatus === 'ACTIVE';
  });

  const factions: FactionPressureInput[] = activeOrgs.map((page) => {
    const org = parseOrganizationMetadata(page.metadata);
    return {
      orgPageId: page.id,
      orgTitle: page.title,
      trajectory: trajectoryForEra(org.eraTrajectories, currentEra.id, org.worldState),
      currentPressures: org.currentPressures,
      worldState: org.worldState,
      hostileRelationCount: countHostileRelations(org, chronologyNow),
      region: org.region,
    };
  });

  let daysUntilNextSession: number | null = null;
  if (daysOverride !== undefined) {
    daysUntilNextSession = daysOverride;
  } else if (nextSession?.plannedStartAt) {
    const diffMs = new Date(nextSession.plannedStartAt).getTime() - Date.now();
    daysUntilNextSession = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (momentumPayload.state.worldPressurePaused) {
    return {
      currentEra,
      risingTensions: [],
      eraTrends: ['World pressure forecasting is paused for this campaign.'],
      nearFutureBullets: [],
      projectedByNextSession: null,
    };
  }

  return buildWorldPressureProjection({
    currentEra,
    factions,
    daysUntilNextSession,
  });
}

export type WorldPressurePreview = {
  eraName: string;
  paused: boolean;
  projectedByNextSession: { daysUntil: number; bullets: string[] } | null;
  risingTensions: Array<{ orgPageId: string; orgTitle: string; momentumLabel: string }>;
  eraTrends: string[];
  nearFutureBullets: string[];
};

export function buildWorldPressurePreviewFromProjection(
  projection: WorldPressureProjection,
  options?: { paused?: boolean },
): WorldPressurePreview | null {
  const paused = options?.paused === true;

  if (paused) {
    return {
      eraName: projection.currentEra.name,
      paused: true,
      projectedByNextSession: null,
      risingTensions: [],
      eraTrends: [],
      nearFutureBullets: [],
    };
  }

  const risingTensions = projection.risingTensions.slice(0, 3).map((line) => ({
    orgPageId: line.orgPageId,
    orgTitle: line.orgTitle,
    momentumLabel: line.momentumLabel,
  }));

  const eraTrends = projection.eraTrends.slice(0, 4);
  const nearFutureBullets = projection.nearFutureBullets.slice(0, 4);
  const projectedByNextSession = projection.projectedByNextSession
    ? {
        daysUntil: projection.projectedByNextSession.daysUntil,
        bullets: projection.projectedByNextSession.bullets.slice(0, 4),
      }
    : null;

  const hasContent =
    projectedByNextSession != null ||
    risingTensions.length > 0 ||
    eraTrends.length > 0 ||
    nearFutureBullets.length > 0;

  if (!hasContent) return null;

  return {
    eraName: projection.currentEra.name,
    paused: false,
    projectedByNextSession,
    risingTensions,
    eraTrends,
    nearFutureBullets,
  };
}

export async function buildWorldPressurePreview(
  campaignId: string,
  options?: { daysUntilNextSession?: number | null },
): Promise<WorldPressurePreview | null> {
  const momentumRow = await ensureCampaignMomentum(campaignId);
  const momentumPayload = toCampaignMomentumPayload(momentumRow);
  const paused = momentumPayload.state.worldPressurePaused === true;

  const projection = await buildCampaignWorldPressureProjection(campaignId, {
    includeSessionForecast: options?.daysUntilNextSession === undefined,
    daysUntilNextSession: options?.daysUntilNextSession,
  });

  return buildWorldPressurePreviewFromProjection(projection, { paused });
}
