/**
 * Layer 1 — narrative relation semantics (browser-safe).
 * Canonical meaning layer for Relations workspace projections.
 */

export const NARRATIVE_RELATION_SEMANTICS_VERSION = 'narrative-relation-semantics-v1';

export type NarrativeRelationPolarity =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'ambivalent';

export type NarrativeRelationProvenance = 'explicit' | 'inferred';

export type NarrativeInferenceSource =
  | 'shared_faction'
  | 'scene_cooccurrence'
  | 'reputation_shift'
  | 'wikilink'
  | 'session_note';

export const NARRATIVE_RELATION_TYPES = [
  'alliance',
  'rival',
  'command',
  'member',
  'parent',
  'progenitor',
  'guardian',
  'mentor',
  'heir',
  'successor',
  'bonded',
  'patron',
  'debtor',
  'worships',
  'subordinate',
  'spouse',
  'neutral',
  'unknown',
] as const;

export type NarrativeRelationType = (typeof NARRATIVE_RELATION_TYPES)[number];

export type NarrativeRelationSemantics = {
  narrativeType: NarrativeRelationType;
  strength?: number;
  polarity?: NarrativeRelationPolarity;
  context?: string;
  provenance: NarrativeRelationProvenance;
  inferenceSource?: NarrativeInferenceSource;
};

export function stanceToPolarity(stance: string | null | undefined): NarrativeRelationPolarity {
  const s = (stance ?? '').trim().toUpperCase();
  if (s === 'ALLY' || s === 'VASSAL') return 'positive';
  if (s === 'HOSTILE' || s === 'SECRET_HOSTILE' || s === 'AT_WAR') return 'negative';
  if (s === 'NEUTRAL' || s === 'UNKNOWN') return 'neutral';
  return 'ambivalent';
}

export function lineageTypeToNarrativeType(
  relationshipType: string,
  linkKind: 'parent' | 'spouse' = 'parent',
): NarrativeRelationType {
  const upper = relationshipType.trim().toUpperCase();
  if (linkKind === 'spouse' || upper === 'MARRIAGE') return 'spouse';
  if (upper === 'ADOPTIVE' || upper === 'RAISED_BY') return 'guardian';
  if (upper === 'MENTOR') return 'mentor';
  if (upper === 'PROGENITOR' || upper === 'BIOLOGICAL') return 'progenitor';
  if (upper === 'SUCCESSOR' || upper === 'HEIR') return 'successor';
  if (upper === 'BONDED' || upper === 'SWORN') return 'bonded';
  if (upper === 'CREATOR') return 'progenitor';
  if (upper === 'GUARDIAN') return 'guardian';
  return 'parent';
}
