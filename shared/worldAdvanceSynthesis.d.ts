/**
 * Layer 3 — batch narrative synthesis (projection only, not canonical).
 */
import type { WorldAdvanceEffect } from './worldAdvance.js';
import type { WorldConditionSurface } from './worldConditionSurfaces.js';
export declare const WORLD_ADVANCE_SYNTHESIS_VERSION = "world-advance-synthesis-v1";
export type SynthesisCitation = {
    clause: string;
    effectIds: string[];
    anchorIds: string[];
};
export type WorldAdvanceNarrativeSynthesis = {
    version: typeof WORLD_ADVANCE_SYNTHESIS_VERSION;
    headline: string;
    paragraphs: string[];
    citations: SynthesisCitation[];
    /** Marked non-authoritative in all API responses. */
    isProjection: true;
};
export type SynthesizeWorldAdvanceInput = {
    asOfLabel: string | null;
    effects: WorldAdvanceEffect[];
    conditionSurfaces: WorldConditionSurface[];
    pageTitles: Map<string, string>;
    seasonLabel?: string | null;
};
export declare function synthesizeWorldAdvanceNarrative(input: SynthesizeWorldAdvanceInput): WorldAdvanceNarrativeSynthesis;
//# sourceMappingURL=worldAdvanceSynthesis.d.ts.map