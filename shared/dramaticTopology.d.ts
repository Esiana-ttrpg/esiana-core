/**
 * Layer 6 entry — deterministic dramatic topology analysis.
 */
import type { SceneMetadataFields, SceneOutcome } from './sceneMetadata.js';
import type { SceneBeatType } from './sceneMetadata.js';
export type DramaticTopologyFindingKind = 'reveal_clustering' | 'escalation_drought' | 'unresolved_emotional_promise' | 'investigation_overcomplexity' | 'act_imbalance' | 'excessive_dependency_chain' | 'no_choice_corridor' | 'faction_disappearance' | 'pacing_collapse';
export interface DramaticTopologyFinding {
    kind: DramaticTopologyFindingKind;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    sceneIds: string[];
}
export interface SceneSequenceEntry {
    sceneId: string;
    beatType: SceneBeatType | null;
    outcomes: SceneOutcome[];
    narrativeWeight: string;
    actIndex?: number;
}
export declare function analyzeDramaticTopology(sequence: SceneSequenceEntry[]): DramaticTopologyFinding[];
export declare function sceneMetadataToSequenceEntry(sceneId: string, fields: SceneMetadataFields, actIndex?: number): SceneSequenceEntry;
//# sourceMappingURL=dramaticTopology.d.ts.map