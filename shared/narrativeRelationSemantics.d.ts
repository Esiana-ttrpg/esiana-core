/**
 * Layer 1 — narrative relation semantics (browser-safe).
 * Canonical meaning layer for Relations workspace projections.
 */
export declare const NARRATIVE_RELATION_SEMANTICS_VERSION = "narrative-relation-semantics-v1";
export type NarrativeRelationPolarity = 'positive' | 'negative' | 'neutral' | 'ambivalent';
export type NarrativeRelationProvenance = 'explicit' | 'inferred';
export type NarrativeInferenceSource = 'shared_faction' | 'scene_cooccurrence' | 'reputation_shift' | 'wikilink' | 'session_note';
export declare const NARRATIVE_RELATION_TYPES: readonly ["alliance", "rival", "command", "member", "parent", "progenitor", "guardian", "mentor", "heir", "successor", "bonded", "patron", "debtor", "worships", "subordinate", "spouse", "neutral", "unknown"];
export type NarrativeRelationType = (typeof NARRATIVE_RELATION_TYPES)[number];
export type NarrativeRelationSemantics = {
    narrativeType: NarrativeRelationType;
    strength?: number;
    polarity?: NarrativeRelationPolarity;
    context?: string;
    provenance: NarrativeRelationProvenance;
    inferenceSource?: NarrativeInferenceSource;
};
export declare function stanceToPolarity(stance: string | null | undefined): NarrativeRelationPolarity;
export declare function lineageTypeToNarrativeType(relationshipType: string, linkKind?: 'parent' | 'spouse'): NarrativeRelationType;
//# sourceMappingURL=narrativeRelationSemantics.d.ts.map