import type { WorldPressureProjection } from '@shared/worldPressureProjection';

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
