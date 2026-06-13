/**
 * Pure world pressure projection from era trajectories (no DB, advisory only).
 */
import type { CampaignEra, FactionEraTrajectory, FactionMomentumState } from './factionMomentumMetadata.js';
import {
  FACTION_MOMENTUM_STATE_LABELS,
  RISING_TENSION_MOMENTUM_STATES,
} from './factionMomentumMetadata.js';

export type FactionPressureInput = {
  orgPageId: string;
  orgTitle: string;
  trajectory: FactionEraTrajectory | null;
  currentPressures: string[];
  worldState: string | null;
  hostileRelationCount: number;
  region: string | null;
};

export type FactionPressureLine = {
  orgPageId: string;
  orgTitle: string;
  currentEraId: string;
  momentumState: FactionMomentumState | null;
  momentumLabel: string;
  pressure: number | null;
  bullets: string[];
};

export type WorldPressureProjection = {
  currentEra: CampaignEra;
  risingTensions: FactionPressureLine[];
  eraTrends: string[];
  nearFutureBullets: string[];
  projectedByNextSession: {
    daysUntil: number;
    bullets: string[];
  } | null;
};

const MOMENTUM_TENSION_WEIGHT: Record<FactionMomentumState, number> = {
  desperate: 8,
  fragmenting: 7,
  expanding: 6,
  rising: 5,
  resurgent: 5,
  declining: 4,
  dormant: 1,
  stable: 0,
};

function trajectoryBullets(input: FactionPressureInput): string[] {
  const bullets: string[] = [];
  const state = input.trajectory?.momentumState;
  const label = input.orgTitle;
  const region = input.region?.trim();

  if (state === 'expanding') {
    bullets.push(
      region
        ? `${label} influence may spread across ${region}.`
        : `${label} is expanding its reach.`,
    );
  } else if (state === 'rising') {
    bullets.push(`${label} is gaining momentum and visibility.`);
  } else if (state === 'fragmenting') {
    bullets.push(`Internal fractures may surface within ${label}.`);
  } else if (state === 'declining') {
    bullets.push(`${label} influence appears to be waning.`);
  } else if (state === 'desperate') {
    bullets.push(`${label} may act unpredictably under mounting pressure.`);
  } else if (state === 'resurgent') {
    bullets.push(`${label} could re-emerge as a renewed threat or opportunity.`);
  } else if (state === 'dormant') {
    bullets.push(`${label} remains quiet — but may not stay that way.`);
  }

  if (input.hostileRelationCount > 0 && (state === 'expanding' || state === 'rising')) {
    bullets.push(
      input.hostileRelationCount === 1
        ? 'Border unrest likely if relations stay hostile.'
        : `Tensions with ${input.hostileRelationCount} neighboring factions may escalate.`,
    );
  }

  for (const pressure of input.currentPressures.slice(0, 2)) {
    bullets.push(pressure);
  }

  return bullets.slice(0, 4);
}

function tensionScore(input: FactionPressureInput): number {
  const state = input.trajectory?.momentumState;
  if (!state) return 0;
  let score = MOMENTUM_TENSION_WEIGHT[state] ?? 0;
  const pressure = input.trajectory?.pressure;
  if (typeof pressure === 'number') {
    score += pressure / 25;
  }
  score += input.hostileRelationCount * 0.5;
  score += Math.min(input.currentPressures.length, 3) * 0.3;
  return score;
}

export function buildFactionPressureLine(
  currentEraId: string,
  input: FactionPressureInput,
): FactionPressureLine | null {
  const state = input.trajectory?.momentumState ?? null;
  if (!state && input.currentPressures.length === 0) return null;

  const momentumLabel = state ? FACTION_MOMENTUM_STATE_LABELS[state] : 'Unset';

  return {
    orgPageId: input.orgPageId,
    orgTitle: input.orgTitle,
    currentEraId,
    momentumState: state,
    momentumLabel,
    pressure: input.trajectory?.pressure ?? null,
    bullets: trajectoryBullets(input),
  };
}

function buildEraTrends(lines: FactionPressureLine[]): string[] {
  const trends: string[] = [];
  const expanding = lines.filter(
    (l) => l.momentumState === 'expanding' || l.momentumState === 'rising',
  ).length;
  const fragmenting = lines.filter((l) => l.momentumState === 'fragmenting').length;
  const declining = lines.filter((l) => l.momentumState === 'declining').length;
  const resurgent = lines.filter((l) => l.momentumState === 'resurgent').length;

  if (expanding >= 2) {
    trends.push('Expansionist powers are increasing influence.');
  } else if (expanding === 1) {
    trends.push('An expansionist power is gaining ground.');
  }
  if (fragmenting >= 1) {
    trends.push('Institutional cohesion is weakening in at least one faction.');
  }
  if (declining >= 2) {
    trends.push('Northern stability may be declining across multiple fronts.');
  } else if (declining === 1) {
    trends.push('At least one major faction is losing momentum.');
  }
  if (resurgent >= 1) {
    trends.push('Ancient or dormant orders may be reawakening.');
  }
  if (trends.length === 0 && lines.length > 0) {
    trends.push('Broad faction trajectories are stable — watch for GM-authored shifts.');
  }
  return trends.slice(0, 4);
}

function buildNearFutureBullets(lines: FactionPressureLine[]): string[] {
  const bullets: string[] = [];
  for (const line of lines) {
    if (line.bullets.length > 0) {
      bullets.push(line.bullets[0]!);
    }
    if (bullets.length >= 5) break;
  }
  return bullets;
}

export function buildWorldPressureProjection(input: {
  currentEra: CampaignEra;
  factions: FactionPressureInput[];
  daysUntilNextSession?: number | null;
}): WorldPressureProjection {
  const currentEraId = input.currentEra.id;

  const allLines = input.factions
    .map((faction) => buildFactionPressureLine(currentEraId, faction))
    .filter((line): line is FactionPressureLine => line !== null);

  const risingTensions = allLines
    .filter(
      (line) =>
        line.momentumState != null &&
        (RISING_TENSION_MOMENTUM_STATES as readonly string[]).includes(line.momentumState),
    )
    .sort((a, b) => tensionScoreFromLine(b) - tensionScoreFromLine(a))
    .slice(0, 8);

  const eraTrends = buildEraTrends(allLines);
  const nearFutureBullets = buildNearFutureBullets(risingTensions);

  let projectedByNextSession: WorldPressureProjection['projectedByNextSession'] = null;
  if (
    typeof input.daysUntilNextSession === 'number' &&
    input.daysUntilNextSession >= 0 &&
    nearFutureBullets.length > 0
  ) {
    projectedByNextSession = {
      daysUntil: input.daysUntilNextSession,
      bullets: nearFutureBullets.slice(0, 4),
    };
  }

  return {
    currentEra: input.currentEra,
    risingTensions,
    eraTrends,
    nearFutureBullets,
    projectedByNextSession,
  };
}

function tensionScoreFromLine(line: FactionPressureLine): number {
  const state = line.momentumState;
  if (!state) return 0;
  let score = MOMENTUM_TENSION_WEIGHT[state] ?? 0;
  if (typeof line.pressure === 'number') score += line.pressure / 25;
  score += line.bullets.length * 0.2;
  return score;
}

export function pickFactionPressureHint(projection: WorldPressureProjection): string | null {
  const first = projection.risingTensions[0];
  if (!first) {
    const trend = projection.eraTrends[0];
    return trend ?? null;
  }
  return `${first.orgTitle} — ${first.momentumLabel}`;
}
