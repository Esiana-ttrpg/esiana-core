/**
 * Layer 5 — dramatic beat taxonomy (structural role, not emotional tone).
 * @see docs/architecture-internal/narrative-scenes.md
 */
import { type SceneBeatType } from './sceneMetadata.js';
export declare const NARRATIVE_BEAT_DRAMATIC_GROUPS: readonly ["setup", "escalation", "pivot", "resolution"];
export type NarrativeBeatDramaticGroup = (typeof NARRATIVE_BEAT_DRAMATIC_GROUPS)[number];
export declare const NARRATIVE_BEAT_GROUP_LABELS: Record<NarrativeBeatDramaticGroup, string>;
export declare const NARRATIVE_BEAT_GROUP_HINTS: Record<NarrativeBeatDramaticGroup, string>;
export declare const NARRATIVE_BEAT_LABELS: Record<SceneBeatType, string>;
export declare const NARRATIVE_BEAT_HINTS: Record<SceneBeatType, string>;
export declare const NARRATIVE_BEAT_DRAMATIC_GROUP: Record<SceneBeatType, NarrativeBeatDramaticGroup>;
/** Beats that reframe or expose information (topology: reveal clustering). */
export declare const PIVOT_REVEAL_BEATS: SceneBeatType[];
/** Beats that grant player agency (topology: choice corridor). */
export declare const PIVOT_CHOICE_BEATS: SceneBeatType[];
/** Beats that raise pressure (topology: escalation drought — legacy pair). */
export declare const TOPOLOGY_ESCALATION_BEATS: SceneBeatType[];
/** Full escalation dramatic role group (UI / filters). */
export declare const ESCALATION_ROLE_BEATS: SceneBeatType[];
export declare const BEATS_BY_DRAMATIC_GROUP: Record<NarrativeBeatDramaticGroup, readonly SceneBeatType[]>;
export declare function narrativeBeatDramaticGroup(beatType: SceneBeatType | string | null | undefined): NarrativeBeatDramaticGroup | null;
export declare function formatNarrativeBeatLabel(beatType: SceneBeatType | string | null | undefined): string | null;
export declare function normalizeSceneBeatTypeFilter(raw: unknown): SceneBeatType[];
export declare function beatsInDramaticGroup(group: NarrativeBeatDramaticGroup): readonly SceneBeatType[];
//# sourceMappingURL=narrativeBeatTypes.d.ts.map