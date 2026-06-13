/**
 * Layer 1 — party-to-faction reputation simulation (browser-safe pure logic).
 * @see docs/architecture-internal/downtime-reputation.md
 */
import {
  CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
  clampReputationScore,
  defaultFactionReputationScores,
  type FactionReputationScores,
  type ReputationAxis,
  type ReputationDirection,
  type ReputationEventKind,
  type ReputationSourceType,
  type ReputationSuggestionKind,
} from './reputationMetadata.js';

export const REPUTATION_SIMULATION_VERSION = 'reputation-simulation-v1';

export type AdvanceMagnitude =
  | 'tiny'
  | 'small'
  | 'medium'
  | 'large'
  | 'massive';

export type ReputationBandTone = 'neutral' | 'warning' | 'escalation';

export type ReputationBand = {
  bandId: string;
  bandLabel: string;
  tone: ReputationBandTone;
};

const NEUTRAL_AXIS_VALUE = 50;

const MINUTES_PER_DAY = 1440n;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7n;

const TRUST_BANDS = [
  'Hostile',
  'Suspicious',
  'Neutral',
  'Friendly',
  'Trusted',
] as const;

const NOTORIETY_BANDS = [
  'Obscure',
  'Whispers',
  'Known',
  'Notorious',
  'Infamous',
] as const;

const AXIS_BANDS: Record<ReputationAxis, readonly string[]> = {
  trust: TRUST_BANDS,
  notoriety: NOTORIETY_BANDS,
};

const MAGNITUDE_SCALE: Record<AdvanceMagnitude, number> = {
  tiny: 0,
  small: 0.25,
  medium: 1,
  large: 2,
  massive: 4,
};

export type ReputationFactionDrivers = {
  havenNotorietyBand: string | null;
  havenWikiPageId: string | null;
  negativeRumorCount: number;
  positiveProjectBoost: boolean;
  stalledProjectAtHaven: boolean;
  creativeDriftPressure: number;
};

export type ReputationAdvanceAutoEvent = {
  factionPageId: string;
  eventKind: ReputationEventKind;
  axis: ReputationAxis;
  direction: ReputationDirection;
  fromBand: string;
  toBand: string;
  title: string;
  narrative: string;
  sourceType: ReputationSourceType;
  sourceRef: string;
  projectId?: string | null;
  havenWikiPageId?: string | null;
};

export type ReputationAdvanceSuggestion = {
  kind: ReputationSuggestionKind;
  factionPageId: string;
  axis: ReputationAxis;
  direction: ReputationDirection;
  fromBand: string;
  toBand: string;
  title: string;
  narrative: string;
  sourceType: ReputationSourceType;
  sourceRef: string;
  idempotencyKey: string;
  proposedTrust: number;
  proposedNotoriety: number;
  projectId?: string | null;
  havenWikiPageId?: string | null;
  claimId?: string | null;
  targetOrgPageId?: string | null;
};

export type ReputationAdvanceInput = {
  factionPageId: string;
  scores: FactionReputationScores;
  elapsedMinutes: bigint;
  advanceMagnitude: AdvanceMagnitude;
  drivers: ReputationFactionDrivers;
  batchId: string;
};

export type ReputationAdvanceFactionResult = {
  nextScores: FactionReputationScores;
  autoEvents: ReputationAdvanceAutoEvent[];
  pendingSuggestions: ReputationAdvanceSuggestion[];
};

export function bandIndexForValue(value: number): number {
  if (value < 20) return 0;
  if (value < 40) return 1;
  if (value < 60) return 2;
  if (value < 80) return 3;
  return 4;
}

export function formatReputationAxisBand(
  axis: ReputationAxis,
  value: number,
): ReputationBand {
  const index = bandIndexForValue(value);
  const bandLabel = AXIS_BANDS[axis][index] ?? 'Unknown';
  let tone: ReputationBandTone = 'neutral';

  if (axis === 'trust') {
    if (index <= 1) tone = index === 0 ? 'escalation' : 'warning';
    else if (index >= 4) tone = 'neutral';
  } else {
    if (index >= 3) tone = index >= 4 ? 'escalation' : 'warning';
    else if (index <= 1) tone = 'neutral';
  }

  return { bandId: `${axis}-${index.toString()}`, bandLabel, tone };
}

function magnitudeScale(magnitude: AdvanceMagnitude): number {
  return MAGNITUDE_SCALE[magnitude] ?? 0;
}

function pickDeterministicCopy(options: readonly string[], seed: number): string {
  if (options.length === 0) return '';
  const index = Math.abs(seed) % options.length;
  return options[index] ?? options[0]!;
}

const TRUST_CROSSING_COPY = {
  rising: [
    'Word of your deeds reaches their halls.',
    'They begin to treat the party as a reliable ally.',
    'Trust builds through quiet consistency.',
  ],
  falling: [
    'Patience wears thin among their leadership.',
    'Whispers turn their council against you.',
    'Old grievances resurface in closed chambers.',
  ],
} as const;

const NOTORIETY_CROSSING_COPY = {
  rising: [
    'Your name spreads faster than you can quiet it.',
    'Strangers arrive asking uncomfortable questions.',
    'Rumors about the party reach distant settlements.',
  ],
  falling: [
    'The party fades from local gossip.',
    'Fewer strangers pass through asking pointed questions.',
    'Your name rarely comes up in tavern talk anymore.',
  ],
} as const;

function crossingCopy(
  axis: ReputationAxis,
  fromIndex: number,
  toIndex: number,
  factionPageId: string,
): string {
  const rising = toIndex > fromIndex;
  const pool = axis === 'trust' ? TRUST_CROSSING_COPY : NOTORIETY_CROSSING_COPY;
  const options = rising ? pool.rising : pool.falling;
  const seed = factionPageId.charCodeAt(0) + fromIndex * 7 + toIndex * 13;
  return pickDeterministicCopy(options, seed);
}

function directionForBandChange(fromIndex: number, toIndex: number): ReputationDirection {
  if (toIndex > fromIndex) return 'up';
  if (toIndex < fromIndex) return 'down';
  return 'flat';
}

function havenNotorietyIndex(bandLabel: string | null): number | null {
  if (!bandLabel) return null;
  const index = NOTORIETY_BANDS.indexOf(bandLabel as (typeof NOTORIETY_BANDS)[number]);
  return index >= 0 ? index : null;
}

function computeTrustDelta(
  currentTrust: number,
  scale: number,
  drivers: ReputationFactionDrivers,
): { delta: number; reasons: string[] } {
  let delta = 0;
  const reasons: string[] = [];

  if (scale <= 0) return { delta, reasons };

  const pullToNeutral = (NEUTRAL_AXIS_VALUE - currentTrust) * 0.04 * scale;
  delta += pullToNeutral;

  if (drivers.positiveProjectBoost) {
    delta += 3 * scale;
    reasons.push('completed project goodwill');
  }

  if (drivers.negativeRumorCount > 0) {
    delta -= 2 * scale * drivers.negativeRumorCount;
    reasons.push('negative rumors circulating');
  }

  if (drivers.stalledProjectAtHaven) {
    delta -= 1.5 * scale;
    reasons.push('stalled operations at linked haven');
  }

  if (drivers.creativeDriftPressure > 0) {
    delta -= 1 * scale * drivers.creativeDriftPressure;
    reasons.push('unresolved narrative pressure');
  }

  return { delta, reasons };
}

function computeNotorietyDelta(
  currentNotoriety: number,
  scale: number,
  drivers: ReputationFactionDrivers,
): { delta: number; reasons: string[] } {
  let delta = 0;
  const reasons: string[] = [];

  if (scale <= 0) return { delta, reasons };

  const pullToNeutral = (NEUTRAL_AXIS_VALUE - currentNotoriety) * 0.03 * scale;
  delta += pullToNeutral;

  const havenIndex = havenNotorietyIndex(drivers.havenNotorietyBand);
  if (havenIndex != null && havenIndex >= 2) {
    delta += (havenIndex - 1) * scale;
    reasons.push('linked haven notoriety');
  }

  if (drivers.negativeRumorCount > 0) {
    delta += 2 * scale * drivers.negativeRumorCount;
    reasons.push('rumors targeting faction');
  }

  if (drivers.creativeDriftPressure > 0) {
    delta += 0.75 * scale * drivers.creativeDriftPressure;
    reasons.push('growing regional attention');
  }

  return { delta, reasons };
}

function buildAutoEventNarrative(reasons: string[]): string {
  if (reasons.length === 0) return 'Standing shifts quietly between sessions.';
  return reasons[0]!;
}

function isInvestigationBand(axis: ReputationAxis, bandIndex: number): boolean {
  if (axis !== 'trust') return false;
  return bandIndex <= 1;
}

export function advanceFactionReputation(
  input: ReputationAdvanceInput,
): ReputationAdvanceFactionResult {
  const scale = magnitudeScale(input.advanceMagnitude);
  const autoEvents: ReputationAdvanceAutoEvent[] = [];
  const pendingSuggestions: ReputationAdvanceSuggestion[] = [];

  if (input.elapsedMinutes < MINUTES_PER_WEEK && scale <= 0) {
    return {
      nextScores: { ...input.scores },
      autoEvents,
      pendingSuggestions,
    };
  }

  const trustBefore = input.scores.trust;
  const notorietyBefore = input.scores.notoriety;
  const trustBandBefore = formatReputationAxisBand('trust', trustBefore);
  const notorietyBandBefore = formatReputationAxisBand('notoriety', notorietyBefore);

  let nextTrust = trustBefore;
  let nextNotoriety = notorietyBefore;

  if (input.elapsedMinutes >= MINUTES_PER_WEEK) {
    const trustResult = computeTrustDelta(trustBefore, scale, input.drivers);
    nextTrust = clampReputationScore(trustBefore + trustResult.delta);

    const notorietyResult = computeNotorietyDelta(
      notorietyBefore,
      scale,
      input.drivers,
    );
    nextNotoriety = clampReputationScore(notorietyBefore + notorietyResult.delta);
  }

  const trustBandAfter = formatReputationAxisBand('trust', nextTrust);
  const notorietyBandAfter = formatReputationAxisBand('notoriety', nextNotoriety);

  const trustFromIndex = bandIndexForValue(trustBefore);
  const trustToIndex = bandIndexForValue(nextTrust);
  const notorietyFromIndex = bandIndexForValue(notorietyBefore);
  const notorietyToIndex = bandIndexForValue(nextNotoriety);

  const trustCrossed = trustFromIndex !== trustToIndex;
  const notorietyCrossed = notorietyFromIndex !== notorietyToIndex;

  const appliedTrust = trustCrossed ? trustBefore : nextTrust;
  const appliedNotoriety = notorietyCrossed ? notorietyBefore : nextNotoriety;

  if (!trustCrossed && !notorietyCrossed && scale > 0 && input.elapsedMinutes >= MINUTES_PER_WEEK) {
    const trustReasons = computeTrustDelta(trustBefore, scale, input.drivers).reasons;
    const notorietyReasons = computeNotorietyDelta(
      notorietyBefore,
      scale,
      input.drivers,
    ).reasons;
    const narrative =
      trustReasons[0] ?? notorietyReasons[0] ?? 'Standing shifts quietly between sessions.';
    autoEvents.push({
      factionPageId: input.factionPageId,
      eventKind: 'drift',
      axis: trustReasons.length > 0 ? 'trust' : 'notoriety',
      direction: 'flat',
      fromBand: trustBandBefore.bandLabel,
      toBand: trustBandAfter.bandLabel,
      title: `${trustBandAfter.bandLabel}`,
      narrative,
      sourceType: 'time_hook',
      sourceRef: input.batchId,
      havenWikiPageId: input.drivers.havenWikiPageId,
    });
  }

  if (trustCrossed) {
    const direction = directionForBandChange(trustFromIndex, trustToIndex);
    const narrative = crossingCopy('trust', trustFromIndex, trustToIndex, input.factionPageId);
    const title = `${trustBandAfter.bandLabel}`;
    const idempotencyKey = `hook:${input.batchId}:${input.factionPageId}:trust_crossing`;

    pendingSuggestions.push({
      kind: 'band_crossing',
      factionPageId: input.factionPageId,
      axis: 'trust',
      direction,
      fromBand: trustBandBefore.bandLabel,
      toBand: trustBandAfter.bandLabel,
      title,
      narrative,
      sourceType: 'time_hook',
      sourceRef: input.batchId,
      idempotencyKey,
      proposedTrust: nextTrust,
      proposedNotoriety: appliedNotoriety,
      havenWikiPageId: input.drivers.havenWikiPageId,
    });

    if (
      isInvestigationBand('trust', trustToIndex) &&
      (input.drivers.negativeRumorCount > 0 ||
        input.drivers.stalledProjectAtHaven ||
        input.drivers.creativeDriftPressure > 0)
    ) {
      pendingSuggestions.push({
        kind: 'investigation',
        factionPageId: input.factionPageId,
        axis: 'trust',
        direction: 'down',
        fromBand: trustBandBefore.bandLabel,
        toBand: trustBandAfter.bandLabel,
        title: 'Investigation opened',
        narrative: `Scrutiny intensifies — ${narrative}`,
        sourceType: 'time_hook',
        sourceRef: input.batchId,
        idempotencyKey: `hook:${input.batchId}:${input.factionPageId}:investigation`,
        proposedTrust: nextTrust,
        proposedNotoriety: appliedNotoriety,
        havenWikiPageId: input.drivers.havenWikiPageId,
        targetOrgPageId: input.factionPageId,
      });
    }

    if (
      direction === 'down' &&
      input.drivers.negativeRumorCount > 0
    ) {
      pendingSuggestions.push({
        kind: 'rumor_spread',
        factionPageId: input.factionPageId,
        axis: 'trust',
        direction: 'down',
        fromBand: trustBandBefore.bandLabel,
        toBand: trustBandAfter.bandLabel,
        title: 'Rumors spread',
        narrative: 'Harbor whispers reach their ears before you can quiet them.',
        sourceType: 'rumor_pressure',
        sourceRef: input.batchId,
        idempotencyKey: `hook:${input.batchId}:${input.factionPageId}:rumor_spread`,
        proposedTrust: nextTrust,
        proposedNotoriety: appliedNotoriety,
        targetOrgPageId: input.factionPageId,
      });
    }
  }

  if (notorietyCrossed) {
    const direction = directionForBandChange(notorietyFromIndex, notorietyToIndex);
    const narrative = crossingCopy(
      'notoriety',
      notorietyFromIndex,
      notorietyToIndex,
      input.factionPageId,
    );
    pendingSuggestions.push({
      kind: 'band_crossing',
      factionPageId: input.factionPageId,
      axis: 'notoriety',
      direction,
      fromBand: notorietyBandBefore.bandLabel,
      toBand: notorietyBandAfter.bandLabel,
      title: notorietyBandAfter.bandLabel,
      narrative,
      sourceType: 'time_hook',
      sourceRef: input.batchId,
      idempotencyKey: `hook:${input.batchId}:${input.factionPageId}:notoriety_crossing`,
      proposedTrust: appliedTrust,
      proposedNotoriety: nextNotoriety,
      havenWikiPageId: input.drivers.havenWikiPageId,
    });
  }

  return {
    nextScores: {
      trust: appliedTrust,
      notoriety: appliedNotoriety,
      lastSimulatedAtEpochMinute: input.scores.lastSimulatedAtEpochMinute,
    },
    autoEvents,
    pendingSuggestions,
  };
}

export function applyReputationScoresAfterAdvance(
  scores: FactionReputationScores,
  nextEpochMinute: string,
): FactionReputationScores {
  return {
    ...scores,
    lastSimulatedAtEpochMinute: nextEpochMinute,
  };
}

export function getOrCreateFactionScores(
  factions: Record<string, FactionReputationScores>,
  factionPageId: string,
): FactionReputationScores {
  return factions[factionPageId] ?? defaultFactionReputationScores();
}

export function buildProjectOutcomeTrustBump(
  factionPageId: string,
  description: string,
  currentTrust: number,
): {
  nextTrust: number;
  fromBand: string;
  toBand: string;
  direction: ReputationDirection;
} {
  const fromBand = formatReputationAxisBand('trust', currentTrust).bandLabel;
  const nextTrust = clampReputationScore(currentTrust + 8);
  const toBand = formatReputationAxisBand('trust', nextTrust).bandLabel;
  const direction = directionForBandChange(
    bandIndexForValue(currentTrust),
    bandIndexForValue(nextTrust),
  );
  return {
    nextTrust,
    fromBand,
    toBand,
    direction,
  };
}

export { CAMPAIGN_REPUTATION_SEMANTICS_VERSION };
