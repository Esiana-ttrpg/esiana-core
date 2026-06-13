/**
 * Layer 2 derivation helpers for simulation-aware map flow overlays.
 * @see docs/architecture-internal/map-flow-overlays.md
 */

import {
  type FlowDirectionValue,
  type FlowKindValue,
  type MapFlowOverlayStyle,
  parseMapFlowOverlayStyle,
} from './mapOverlayTypes.js';
import {
  lineStringGeometry,
  type NormalizedPoint,
} from './mapGeometry.js';

export type DerivedFromRecord = {
  type: string;
  sourceIds: string[];
  batchId?: string;
};

export type ClimateAspectWeight = { aspect: string; weight: number };

export function defaultFlowDirection(flowKind: FlowKindValue): FlowDirectionValue {
  switch (flowKind) {
    case 'trade':
      return 'bidirectional';
    case 'migration':
    case 'travel':
    default:
      return 'forward';
  }
}

export function defaultRibbonForFlowKind(flowKind: FlowKindValue): {
  baseWidth: number;
  widthVariance?: number;
  opacity?: number;
} {
  switch (flowKind) {
    case 'migration':
      return { baseWidth: 0.028, widthVariance: 0.012, opacity: 0.45 };
    case 'trade':
      return { baseWidth: 0.012, widthVariance: 0.002, opacity: 0.55 };
    case 'travel':
      return { baseWidth: 0.018, widthVariance: 0.004, opacity: 0.5 };
    default:
      return { baseWidth: 0.015, opacity: 0.5 };
  }
}

export function buildRouteIdempotencyKey(input: {
  derivedFromType: string;
  sourceIds: string[];
  mapAssetId: string;
  flowKind: FlowKindValue;
}): string {
  const sorted = [...input.sourceIds].sort().join('|');
  return `${input.derivedFromType}:${sorted}:${input.mapAssetId}:${input.flowKind}`;
}

export function buildClimateIdempotencyKey(input: {
  calendarId: string;
  regionKey: string;
  monthKey: string;
  representsEpoch: string;
  mapAssetId: string;
}): string {
  return `seasonal_climate_projection:${input.calendarId}:${input.regionKey}:${input.monthKey}:${input.representsEpoch}:${input.mapAssetId}`;
}

/** v1 spine: straight line or one bend at midpoint offset. */
export function buildPathSpine(
  origin: NormalizedPoint,
  destination: NormalizedPoint,
): ReturnType<typeof lineStringGeometry> {
  const dx = destination[0] - origin[0];
  const dy = destination[1] - origin[1];
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) {
    return lineStringGeometry([origin, destination]);
  }
  const mid: NormalizedPoint = [
    (origin[0] + destination[0]) / 2,
    (origin[1] + destination[1]) / 2,
  ];
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const bend = Math.min(0.06, dist * 0.15);
  const bendPoint: NormalizedPoint = [
    mid[0] + perpX * bend,
    mid[1] + perpY * bend,
  ];
  return lineStringGeometry([origin, bendPoint, destination]);
}

export function climateAspectsFromSingle(aspect: string): ClimateAspectWeight[] {
  return [{ aspect, weight: 1 }];
}

export function monthKeyFromCalendar(monthIndex: number, monthName: string): string {
  return `${monthIndex}:${monthName}`;
}

export function overlayTemporalPair(input: {
  generatedAtEpoch: string;
  representsEpoch: string;
}): MapFlowOverlayStyle['overlayTemporal'] {
  return {
    generatedAtEpoch: input.generatedAtEpoch,
    representsEpoch: input.representsEpoch,
  };
}

export function isFlowOverlayStyle(style: unknown): boolean {
  const parsed = parseMapFlowOverlayStyle(style);
  return Boolean(parsed.flowKind || parsed.weatherOverlay);
}

export function flowOverlayLabel(flowKind: FlowKindValue): string {
  switch (flowKind) {
    case 'migration':
      return 'Migration corridor';
    case 'trade':
      return 'Trade route';
    case 'travel':
      return 'Travel route';
    default:
      return 'Flow path';
  }
}
