/**
 * Layer 5 — narrative pressure feed (continuity → operational intelligence).
 */
import type { ContinuityIssue, ContinuityIssueSeverity } from './continuityIssue.js';
export type NarrativePressureCategory = 'structural' | 'investigative' | 'emotional' | 'temporal';
export interface NarrativePressureItem {
    id: string;
    severity: ContinuityIssueSeverity;
    category: NarrativePressureCategory;
    message: string;
    linkedEntityIds: string[];
    weightMultiplier: number;
    sourceProducer: string;
    sourceIssueType: string;
}
export declare function mapContinuityIssueToPressure(issue: ContinuityIssue, weightByEntityId?: Map<string, number>): NarrativePressureItem;
export declare function buildNarrativePressureFeed(issues: ContinuityIssue[], weightByEntityId?: Map<string, number>): NarrativePressureItem[];
export declare function narrativeWeightToScore(weight: string | undefined | null): number;
//# sourceMappingURL=narrativePressureFeed.d.ts.map