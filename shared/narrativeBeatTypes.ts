/**
 * Layer 5 — dramatic beat taxonomy (structural role, not emotional tone).
 * @see docs/architecture-internal/narrative-scenes.md
 */
import { SCENE_BEAT_TYPES, type SceneBeatType } from './sceneMetadata.js';

export const NARRATIVE_BEAT_DRAMATIC_GROUPS = [
  'setup',
  'escalation',
  'pivot',
  'resolution',
] as const;

export type NarrativeBeatDramaticGroup = (typeof NARRATIVE_BEAT_DRAMATIC_GROUPS)[number];

export const NARRATIVE_BEAT_GROUP_LABELS: Record<NarrativeBeatDramaticGroup, string> = {
  setup: 'Setup',
  escalation: 'Escalation',
  pivot: 'Pivot',
  resolution: 'Resolution',
};

export const NARRATIVE_BEAT_GROUP_HINTS: Record<NarrativeBeatDramaticGroup, string> = {
  setup: 'Grounds context before pressure builds',
  escalation: 'Raises stakes or narrows options',
  pivot: 'Reframes information or opens agency',
  resolution: 'Closes a dramatic thread structurally',
};

export const NARRATIVE_BEAT_LABELS: Record<SceneBeatType, string> = {
  setup: 'Setup',
  complication: 'Complication',
  escalation: 'Escalation',
  loss: 'Loss',
  fallout: 'Fallout',
  reveal: 'Reveal',
  twist: 'Twist',
  reversal: 'Reversal',
  choice: 'Choice',
  resolution: 'Resolution',
};

export const NARRATIVE_BEAT_HINTS: Record<SceneBeatType, string> = {
  setup: 'Establishes baseline situation or intent for what follows',
  complication: 'Introduces a new obstacle or constraint on the plan',
  escalation: 'Increases pressure, cost, or urgency in the sequence',
  loss: 'Removes an asset, ally, or option from play',
  fallout: 'Surfaces consequences from prior beats',
  reveal: 'Surfaces information that changes understanding',
  twist: 'Reframes prior assumptions with new information',
  reversal: 'Inverts power, position, or expected direction',
  choice: 'Presents a meaningful fork in player agency',
  resolution: 'Structurally closes a beat, thread, or story pressure',
};

export const NARRATIVE_BEAT_DRAMATIC_GROUP: Record<SceneBeatType, NarrativeBeatDramaticGroup> = {
  setup: 'setup',
  complication: 'escalation',
  escalation: 'escalation',
  loss: 'escalation',
  fallout: 'escalation',
  reveal: 'pivot',
  twist: 'pivot',
  reversal: 'pivot',
  choice: 'pivot',
  resolution: 'resolution',
};

/** Beats that reframe or expose information (topology: reveal clustering). */
export const PIVOT_REVEAL_BEATS: SceneBeatType[] = ['reveal', 'twist'];

/** Beats that grant player agency (topology: choice corridor). */
export const PIVOT_CHOICE_BEATS: SceneBeatType[] = ['choice'];

/** Beats that raise pressure (topology: escalation drought — legacy pair). */
export const TOPOLOGY_ESCALATION_BEATS: SceneBeatType[] = ['complication', 'escalation'];

/** Full escalation dramatic role group (UI / filters). */
export const ESCALATION_ROLE_BEATS: SceneBeatType[] = [
  'complication',
  'escalation',
  'loss',
  'fallout',
];

export const BEATS_BY_DRAMATIC_GROUP: Record<
  NarrativeBeatDramaticGroup,
  readonly SceneBeatType[]
> = {
  setup: ['setup'],
  escalation: ['complication', 'escalation', 'loss', 'fallout'],
  pivot: ['reveal', 'twist', 'reversal', 'choice'],
  resolution: ['resolution'],
};

export function narrativeBeatDramaticGroup(
  beatType: SceneBeatType | string | null | undefined,
): NarrativeBeatDramaticGroup | null {
  if (typeof beatType !== 'string' || !beatType.trim()) return null;
  const key = beatType.trim().toLowerCase() as SceneBeatType;
  return NARRATIVE_BEAT_DRAMATIC_GROUP[key] ?? null;
}

export function formatNarrativeBeatLabel(
  beatType: SceneBeatType | string | null | undefined,
): string | null {
  if (typeof beatType !== 'string' || !beatType.trim()) return null;
  const key = beatType.trim().toLowerCase() as SceneBeatType;
  return NARRATIVE_BEAT_LABELS[key] ?? null;
}

export function normalizeSceneBeatTypeFilter(raw: unknown): SceneBeatType[] {
  if (!Array.isArray(raw)) return [];
  const beats: SceneBeatType[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const key = entry.trim().toLowerCase() as SceneBeatType;
    if ((SCENE_BEAT_TYPES as readonly string[]).includes(key)) {
      beats.push(key);
    }
  }
  return [...new Set(beats)];
}

export function beatsInDramaticGroup(group: NarrativeBeatDramaticGroup): readonly SceneBeatType[] {
  return BEATS_BY_DRAMATIC_GROUP[group];
}
