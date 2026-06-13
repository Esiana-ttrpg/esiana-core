/**
 * Layer 1 — haven ambient simulation (browser-safe pure logic).
 * Stored in DowntimeHaven.simulationHints.havenSimulation — no Prisma columns.
 * @see docs/architecture-internal/downtime-havens.md
 */
import type { AdvanceMagnitude } from './globalTimeHooks.js';
import type { HavenActivityTone, HavenPrimaryTheme, HavenStatus } from './havenMetadata.js';

export const HAVEN_SIMULATION_VERSION = 'haven-simulation-v1';

export const HAVEN_SIMULATION_AXES = [
  'prosperity',
  'danger',
  'morale',
  'notoriety',
  'stability',
  'security',
] as const;

export type HavenSimulationAxis = (typeof HAVEN_SIMULATION_AXES)[number];

export type HavenSimulationBandTone = 'neutral' | 'warning' | 'escalation';

export type HavenSimulationBand = {
  bandId: string;
  bandLabel: string;
  tone: HavenSimulationBandTone;
};

export type HavenSimulationAxes = Record<HavenSimulationAxis, number>;

export type HavenSimulationState = {
  version: typeof HAVEN_SIMULATION_VERSION;
  enabled: boolean;
  pausedReason: string | null;
  axes: HavenSimulationAxes;
  lockedAxes: Partial<Record<HavenSimulationAxis, boolean>>;
  lastSimulatedAtEpochMinute: string | null;
};

export type HavenSimulationContext = {
  status: HavenStatus;
  escalatingThreatCount: number;
  activeProjectCount: number;
  primaryTheme: HavenPrimaryTheme | null;
};

export type HavenSimulationBandCrossing = {
  axis: HavenSimulationAxis;
  fromBand: HavenSimulationBand;
  toBand: HavenSimulationBand;
  summary: string;
  tone: HavenActivityTone;
};

export type HavenSimulationAdvanceResult = {
  nextSimulation: HavenSimulationState;
  bandCrossings: HavenSimulationBandCrossing[];
  axisDrivers: Partial<Record<HavenSimulationAxis, string[]>>;
};

export type HavenSimulationAxisPresentation = {
  id: HavenSimulationAxis;
  label: string;
  bandLabel: string;
  tone: HavenSimulationBandTone;
};

export type HavenSimulationSnapshot = {
  enabled: boolean;
  pausedReason: string | null;
  pressureHeadline: string | null;
  axes: HavenSimulationAxisPresentation[];
  axisDrivers: Partial<Record<HavenSimulationAxis, string[]>>;
};

const MINUTES_PER_DAY = 1440n;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7n;
const MINUTES_PER_30_DAYS = MINUTES_PER_DAY * 30n;

const NEUTRAL_AXIS_VALUE = 50;

const AXIS_LABELS: Record<HavenSimulationAxis, string> = {
  prosperity: 'Prosperity',
  danger: 'Danger',
  morale: 'Morale',
  notoriety: 'Notoriety',
  stability: 'Stability',
  security: 'Security',
};

const AXIS_BANDS: Record<HavenSimulationAxis, readonly string[]> = {
  prosperity: ['Withering', 'Strained', 'Steady', 'Flourishing', 'Abundant'],
  danger: ['Quiet', 'Uneasy', 'Hazardous', 'Perilous', 'Desperate'],
  morale: ['Broken', 'Low', 'Steady', 'High', 'Exultant'],
  notoriety: ['Obscure', 'Whispers', 'Known', 'Notorious', 'Infamous'],
  stability: ['Collapsing', 'Neglected', 'Fraying', 'Stable', 'Resilient'],
  security: ['Exposed', 'Lax', 'Adequate', 'Vigilant', 'Impregnable'],
};

const BAND_MIDPOINTS = [10, 30, 50, 70, 90] as const;

const MAGNITUDE_SCALE: Record<AdvanceMagnitude, number> = {
  tiny: 0,
  small: 0.25,
  medium: 1,
  large: 2,
  massive: 4,
};

const CROSSING_COPY: Record<
  HavenSimulationAxis,
  { rising: readonly string[]; falling: readonly string[] }
> = {
  prosperity: {
    rising: [
      'Trade picks up around the haven as word spreads.',
      'Merchants increasingly treat the haven as a reliable stop.',
      'Prosperity returns to the docks and storehouses.',
    ],
    falling: [
      'Merchants increasingly avoid the eastern roads.',
      'Supply shortages spread through the lower docks.',
      'Coin grows scarce and shelves sit half-empty.',
    ],
  },
  danger: {
    rising: [
      'Watch patrols intensify nearby.',
      'Travelers speak of growing hazards on the approach.',
      'The haven feels less safe with each passing week.',
    ],
    falling: [
      'Tensions ease along the surrounding routes.',
      'The immediate surroundings grow quieter and safer.',
      'Recent weeks have passed without serious incident.',
    ],
  },
  morale: {
    rising: [
      'Spirits lift among those who call the haven home.',
      'Laughter and song return to the common rooms.',
      'The crew faces the future with renewed confidence.',
    ],
    falling: [
      'Grumbling spreads through the ranks.',
      'Resident spirits sink as hardship wears on.',
      'Despair takes root among those who remain.',
    ],
  },
  notoriety: {
    rising: [
      "The haven's growing fame draws new visitors.",
      'Rumors about the haven spread to distant settlements.',
      'Strangers arrive asking pointed questions about your operations.',
    ],
    falling: [
      'The haven fades from local gossip.',
      'Fewer strangers pass through asking uncomfortable questions.',
      'Your name rarely comes up in tavern talk anymore.',
    ],
  },
  stability: {
    rising: [
      'Repairs and routine work keep the haven in good order.',
      'The foundations feel solid again after recent neglect.',
      'Infrastructure holds steady under daily use.',
    ],
    falling: [
      'Wear and neglect show in walls, rigging, and wards.',
      'Small failures cascade — a leak, a crack, a broken latch.',
      'The haven creaks under deferred upkeep and hard use.',
    ],
  },
  security: {
    rising: [
      'Defenses tighten and watch rotations improve.',
      'Guards grow sharper; secrets stay closer held.',
      'The haven feels harder to reach uninvited.',
    ],
    falling: [
      'Gaps appear in the watch and ward lines.',
      'Unwanted eyes find easier ways inside.',
      'Security loosens as attention wanders elsewhere.',
    ],
  },
};

const HEADLINE_COPY: Record<HavenSimulationAxis, readonly string[]> = {
  prosperity: [
    'Supply shortages spreading through the lower docks',
    'Trade drying up around the haven',
    'Merchants treat the haven as a vital hub',
  ],
  danger: [
    'Watch patrols intensifying nearby',
    'Hazards mounting on the approaches',
    'The haven sits in the shadow of growing peril',
  ],
  morale: [
    'Morale fraying among residents and crew',
    'Spirits sinking across the haven',
    'Confidence returning to those who remain',
  ],
  notoriety: [
    "The haven's growing fame draws dangerous attention",
    'Rumors spread faster than you can quiet them',
    'Strangers arrive with uncomfortable questions',
  ],
  stability: [
    'Infrastructure fraying under neglect and hard use',
    'The haven creaks under deferred upkeep',
    'Foundations holding despite recent strain',
  ],
  security: [
    'Defenses thinning along the perimeter',
    'Unwanted eyes finding easier ways in',
    'The haven grows harder to reach uninvited',
  ],
};

function clampAxisValue(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function defaultHavenSimulationAxes(): HavenSimulationAxes {
  return {
    prosperity: NEUTRAL_AXIS_VALUE,
    danger: NEUTRAL_AXIS_VALUE,
    morale: NEUTRAL_AXIS_VALUE,
    notoriety: NEUTRAL_AXIS_VALUE,
    stability: NEUTRAL_AXIS_VALUE,
    security: NEUTRAL_AXIS_VALUE,
  };
}

export function emptyHavenSimulationState(): HavenSimulationState {
  return {
    version: HAVEN_SIMULATION_VERSION,
    enabled: false,
    pausedReason: null,
    axes: defaultHavenSimulationAxes(),
    lockedAxes: {},
    lastSimulatedAtEpochMinute: null,
  };
}

function normalizeLockedAxes(
  raw: unknown,
): Partial<Record<HavenSimulationAxis, boolean>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const locked: Partial<Record<HavenSimulationAxis, boolean>> = {};
  for (const axis of HAVEN_SIMULATION_AXES) {
    if (record[axis] === true) locked[axis] = true;
  }
  return locked;
}

function normalizeAxisValue(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return clampAxisValue(raw);
}

function normalizeAxes(raw: unknown): HavenSimulationAxes {
  const defaults = defaultHavenSimulationAxes();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const record = raw as Record<string, unknown>;
  const axes = { ...defaults };
  for (const axis of HAVEN_SIMULATION_AXES) {
    axes[axis] = normalizeAxisValue(record[axis], defaults[axis]);
  }
  return axes;
}

export function parseHavenSimulationFromHints(
  simulationHints: Record<string, unknown>,
): HavenSimulationState {
  const raw = simulationHints.havenSimulation;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyHavenSimulationState();
  }
  const record = raw as Record<string, unknown>;
  const pausedReason =
    typeof record.pausedReason === 'string' && record.pausedReason.trim()
      ? record.pausedReason.trim()
      : null;

  return {
    version: HAVEN_SIMULATION_VERSION,
    enabled: record.enabled === true,
    pausedReason,
    axes: normalizeAxes(record.axes),
    lockedAxes: normalizeLockedAxes(record.lockedAxes),
    lastSimulatedAtEpochMinute:
      typeof record.lastSimulatedAtEpochMinute === 'string'
        ? record.lastSimulatedAtEpochMinute
        : null,
  };
}

export function mergeHavenSimulationIntoHints(
  simulationHints: Record<string, unknown>,
  simulation: HavenSimulationState,
): Record<string, unknown> {
  return {
    ...simulationHints,
    havenSimulation: {
      version: simulation.version,
      enabled: simulation.enabled,
      pausedReason: simulation.pausedReason,
      axes: { ...simulation.axes },
      lockedAxes: { ...simulation.lockedAxes },
      lastSimulatedAtEpochMinute: simulation.lastSimulatedAtEpochMinute,
    },
  };
}

export function mergeHavenSimulationPatch(
  simulationHints: Record<string, unknown>,
  patch: Partial<
    Pick<HavenSimulationState, 'enabled' | 'pausedReason' | 'axes' | 'lockedAxes'>
  >,
): Record<string, unknown> {
  const current = parseHavenSimulationFromHints(simulationHints);
  const next: HavenSimulationState = {
    ...current,
    enabled: patch.enabled ?? current.enabled,
    pausedReason:
      patch.pausedReason !== undefined ? patch.pausedReason : current.pausedReason,
    axes: patch.axes ? { ...current.axes, ...patch.axes } : current.axes,
    lockedAxes: patch.lockedAxes
      ? { ...current.lockedAxes, ...patch.lockedAxes }
      : current.lockedAxes,
  };
  return mergeHavenSimulationIntoHints(simulationHints, next);
}

export function bandIndexForValue(value: number): number {
  if (value < 20) return 0;
  if (value < 40) return 1;
  if (value < 60) return 2;
  if (value < 80) return 3;
  return 4;
}

export function bandMidpointForIndex(index: number): number {
  return BAND_MIDPOINTS[Math.max(0, Math.min(4, index))] ?? NEUTRAL_AXIS_VALUE;
}

export function formatHavenAxisBand(
  axis: HavenSimulationAxis,
  value: number,
): HavenSimulationBand {
  const index = bandIndexForValue(value);
  const bandLabel = AXIS_BANDS[axis][index] ?? 'Unknown';
  let tone: HavenSimulationBandTone = 'neutral';
  if (axis === 'danger' || axis === 'notoriety') {
    if (index >= 3) tone = index >= 4 ? 'escalation' : 'warning';
    else if (index <= 1) tone = 'neutral';
  } else {
    if (index <= 1) tone = index === 0 ? 'escalation' : 'warning';
    else if (index >= 4) tone = 'neutral';
  }
  return { bandId: `${axis}-${index.toString()}`, bandLabel, tone };
}

export function isAxisEligibleForAdvance(
  axis: HavenSimulationAxis,
  elapsedMinutes: bigint,
): boolean {
  if (elapsedMinutes < MINUTES_PER_DAY) {
    return axis === 'danger' || axis === 'morale' || axis === 'security';
  }
  if (elapsedMinutes < MINUTES_PER_WEEK) {
    return axis !== 'prosperity';
  }
  if (elapsedMinutes < MINUTES_PER_30_DAYS) {
    return axis !== 'notoriety';
  }
  return true;
}

function magnitudeScale(magnitude: AdvanceMagnitude): number {
  return MAGNITUDE_SCALE[magnitude] ?? 0;
}

function axisDistanceFromNeutral(value: number): number {
  return Math.abs(value - NEUTRAL_AXIS_VALUE);
}

function pickDeterministicCopy(options: readonly string[], seed: number): string {
  if (options.length === 0) return '';
  const index = Math.abs(seed) % options.length;
  return options[index] ?? options[0]!;
}

function crossingSeed(
  axis: HavenSimulationAxis,
  fromIndex: number,
  toIndex: number,
  theme: HavenPrimaryTheme | null,
): number {
  const themeSeed = theme ? theme.charCodeAt(0) : 0;
  return axis.charCodeAt(0) + fromIndex * 7 + toIndex * 13 + themeSeed;
}

export function buildBandCrossingSummary(
  axis: HavenSimulationAxis,
  fromIndex: number,
  toIndex: number,
  primaryTheme: HavenPrimaryTheme | null,
): string {
  const rising = toIndex > fromIndex;
  const pool = rising ? CROSSING_COPY[axis].rising : CROSSING_COPY[axis].falling;
  return pickDeterministicCopy(pool, crossingSeed(axis, fromIndex, toIndex, primaryTheme));
}

function crossingTone(
  axis: HavenSimulationAxis,
  toIndex: number,
  rising: boolean,
): HavenActivityTone {
  if (axis === 'danger' || axis === 'notoriety') {
    if (rising && toIndex >= 3) return 'escalation';
    if (rising) return 'warning';
    return 'neutral';
  }
  if (!rising && toIndex <= 1) return toIndex === 0 ? 'escalation' : 'warning';
  return 'neutral';
}

function computeAxisDrift(
  axis: HavenSimulationAxis,
  axes: HavenSimulationAxes,
  scale: number,
  context: HavenSimulationContext,
  drivers: Partial<Record<HavenSimulationAxis, string[]>>,
): number {
  if (scale <= 0) return 0;

  const currentValue = axes[axis];
  let delta = 0;
  const pullToNeutral = (NEUTRAL_AXIS_VALUE - currentValue) * 0.05 * scale;
  delta += pullToNeutral;

  const addDriver = (targetAxis: HavenSimulationAxis, reason: string, amount: number) => {
    if (targetAxis !== axis) return;
    delta += amount;
    const list = drivers[axis] ?? [];
    if (!list.includes(reason)) list.push(reason);
    drivers[axis] = list;
  };

  if (context.status === 'under_siege') {
    addDriver('danger', 'haven under siege', 2 * scale);
    addDriver('security', 'haven under siege', -1.5 * scale);
    addDriver('morale', 'haven under siege', -1.5 * scale);
  } else if (context.status === 'threatened') {
    addDriver('danger', 'threatened status', 1.5 * scale);
    addDriver('security', 'threatened status', -1 * scale);
  } else if (context.status === 'prosperous') {
    addDriver('prosperity', 'prosperous status', 1 * scale);
  } else if (context.status === 'damaged') {
    addDriver('stability', 'damaged status', -1.5 * scale);
    addDriver('morale', 'damaged status', -1 * scale);
  }

  if (context.escalatingThreatCount > 0) {
    addDriver('danger', 'unresolved threats', 1.5 * scale * context.escalatingThreatCount);
    addDriver('security', 'unresolved threats', -1 * scale);
  }

  if (context.activeProjectCount > 0) {
    addDriver('stability', 'active operations', -0.75 * scale * context.activeProjectCount);
  }

  if (axes.stability < 35) {
    addDriver('danger', 'failing stability', 1 * scale);
  }

  if (axes.notoriety > 65) {
    addDriver('security', 'growing notoriety', -1 * scale);
  }

  return delta;
}

export function deriveAxisDriversForPresentation(
  axes: HavenSimulationAxes,
  context: HavenSimulationContext,
): Partial<Record<HavenSimulationAxis, string[]>> {
  const drivers: Partial<Record<HavenSimulationAxis, string[]>> = {};

  const collect = (targetAxis: HavenSimulationAxis, reason: string) => {
    const list = drivers[targetAxis] ?? [];
    if (!list.includes(reason)) list.push(reason);
    drivers[targetAxis] = list;
  };

  if (context.status === 'under_siege') {
    collect('danger', 'haven under siege');
    collect('security', 'haven under siege');
    collect('morale', 'haven under siege');
  } else if (context.status === 'threatened') {
    collect('danger', 'threatened status');
    collect('security', 'threatened status');
  } else if (context.status === 'prosperous') {
    collect('prosperity', 'prosperous status');
  } else if (context.status === 'damaged') {
    collect('stability', 'damaged status');
    collect('morale', 'damaged status');
  }

  if (context.escalatingThreatCount > 0) {
    collect('danger', 'unresolved threats');
    collect('security', 'unresolved threats');
  }

  if (context.activeProjectCount > 0) {
    collect('stability', 'active operations');
  }

  if (axes.stability < 35) {
    collect('danger', 'failing stability');
  }

  if (axes.notoriety > 65) {
    collect('security', 'growing notoriety');
  }

  return drivers;
}

export function advanceHavenSimulation(input: {
  simulation: HavenSimulationState;
  elapsedMinutes: bigint;
  advanceMagnitude: AdvanceMagnitude;
  nextEpochMinute: string;
  context: HavenSimulationContext;
}): HavenSimulationAdvanceResult {
  const { simulation, elapsedMinutes, advanceMagnitude, nextEpochMinute, context } =
    input;

  if (simulation.pausedReason || !simulation.enabled) {
    return {
      nextSimulation: simulation,
      bandCrossings: [],
      axisDrivers: {},
    };
  }

  const scale = magnitudeScale(advanceMagnitude);
  if (scale <= 0) {
    return {
      nextSimulation: {
        ...simulation,
        lastSimulatedAtEpochMinute: nextEpochMinute,
      },
      bandCrossings: [],
      axisDrivers: {},
    };
  }

  const nextAxes = { ...simulation.axes };
  const axisDrivers: Partial<Record<HavenSimulationAxis, string[]>> = {};
  const bandCrossings: HavenSimulationBandCrossing[] = [];

  for (const axis of HAVEN_SIMULATION_AXES) {
    if (simulation.lockedAxes[axis]) continue;
    if (!isAxisEligibleForAdvance(axis, elapsedMinutes)) continue;

    const beforeValue = nextAxes[axis];
    const beforeBand = formatHavenAxisBand(axis, beforeValue);
    const beforeIndex = bandIndexForValue(beforeValue);

    const drift = computeAxisDrift(axis, nextAxes, scale, context, axisDrivers);
    const afterValue = clampAxisValue(beforeValue + drift);
    nextAxes[axis] = afterValue;

    const afterBand = formatHavenAxisBand(axis, afterValue);
    const afterIndex = bandIndexForValue(afterValue);

    if (afterIndex !== beforeIndex) {
      const rising = afterIndex > beforeIndex;
      bandCrossings.push({
        axis,
        fromBand: beforeBand,
        toBand: afterBand,
        summary: buildBandCrossingSummary(
          axis,
          beforeIndex,
          afterIndex,
          context.primaryTheme,
        ),
        tone: crossingTone(axis, afterIndex, rising),
      });
    }
  }

  return {
    nextSimulation: {
      ...simulation,
      axes: nextAxes,
      lastSimulatedAtEpochMinute: nextEpochMinute,
    },
    bandCrossings,
    axisDrivers,
  };
}

export function applySimulationDeltas(
  simulation: HavenSimulationState,
  deltas: Partial<Record<HavenSimulationAxis, number>>,
): HavenSimulationState {
  const nextAxes = { ...simulation.axes };
  for (const axis of HAVEN_SIMULATION_AXES) {
    const delta = deltas[axis];
    if (delta === undefined || simulation.lockedAxes[axis]) continue;
    nextAxes[axis] = clampAxisValue(nextAxes[axis] + delta);
  }
  return { ...simulation, axes: nextAxes };
}

export function buildDominantPressureHeadline(
  simulation: HavenSimulationState,
  axisDrivers: Partial<Record<HavenSimulationAxis, string[]>>,
): string | null {
  if (!simulation.enabled || simulation.pausedReason) return null;

  let worstAxis: HavenSimulationAxis | null = null;
  let worstScore = -1;

  for (const axis of HAVEN_SIMULATION_AXES) {
    const value = simulation.axes[axis];
    const band = formatHavenAxisBand(axis, value);
    const distance = axisDistanceFromNeutral(value);
    let score = distance;
    if (band.tone === 'escalation') score += 30;
    else if (band.tone === 'warning') score += 15;
    if (axis === 'danger' || axis === 'notoriety') {
      if (value > NEUTRAL_AXIS_VALUE) score += 10;
    } else if (value < NEUTRAL_AXIS_VALUE) {
      score += 10;
    }
    const drivers = axisDrivers[axis];
    if (drivers && drivers.length > 0) score += 5;
    if (score > worstScore) {
      worstScore = score;
      worstAxis = axis;
    }
  }

  if (!worstAxis || worstScore < 12) return null;

  const value = simulation.axes[worstAxis];
  const index = bandIndexForValue(value);
  const pool = HEADLINE_COPY[worstAxis];
  const lowSide = worstAxis === 'danger' || worstAxis === 'notoriety';
  const copyIndex =
    lowSide
      ? index >= 3
        ? 0
        : index <= 1
          ? 2
          : 1
      : index <= 1
        ? 0
        : index >= 3
          ? 2
          : 1;
  return pool[copyIndex] ?? pool[0] ?? null;
}

export function buildHavenSimulationSnapshot(
  simulationHints: Record<string, unknown>,
  axisDrivers: Partial<Record<HavenSimulationAxis, string[]>> = {},
): HavenSimulationSnapshot {
  const simulation = parseHavenSimulationFromHints(simulationHints);
  const axes: HavenSimulationAxisPresentation[] = HAVEN_SIMULATION_AXES.map((axis) => {
    const band = formatHavenAxisBand(axis, simulation.axes[axis]);
    return {
      id: axis,
      label: AXIS_LABELS[axis],
      bandLabel: band.bandLabel,
      tone: band.tone,
    };
  });

  return {
    enabled: simulation.enabled,
    pausedReason: simulation.pausedReason,
    pressureHeadline: buildDominantPressureHeadline(simulation, axisDrivers),
    axes,
    axisDrivers,
  };
}

export function formatHavenSimulationAxisLabel(axis: HavenSimulationAxis): string {
  return AXIS_LABELS[axis];
}

export function listHavenSimulationBandLabels(axis: HavenSimulationAxis): readonly string[] {
  return AXIS_BANDS[axis];
}

export function axisValueForBandIndex(index: number): number {
  return bandMidpointForIndex(index);
}
