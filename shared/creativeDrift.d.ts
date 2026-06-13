/**
 * Layer 3 — creative drift (narrative thermodynamics inbox).
 * Browser-safe types/constants only — fingerprints live in creativeDriftFingerprint.ts.
 * @see docs/architecture-internal/creative-drift.md
 */
export declare const CREATIVE_DRIFT_VERSION = "creative-drift-v1";
/** Surfaced in v1 UI */
export declare const CREATIVE_DRIFT_ACTIVE_BUCKETS: readonly ["dormant_plotlines", "unused_entities", "hanging_promises", "emotional_residue"];
/** Reserved — not computed or surfaced in v1 */
export declare const CREATIVE_DRIFT_RESERVED_BUCKETS: readonly ["ambient_residue"];
export declare const CREATIVE_DRIFT_BUCKETS: readonly ["dormant_plotlines", "unused_entities", "hanging_promises", "emotional_residue", "ambient_residue"];
export type CreativeDriftBucket = (typeof CREATIVE_DRIFT_BUCKETS)[number];
export type CreativeDriftActiveBucket = (typeof CREATIVE_DRIFT_ACTIVE_BUCKETS)[number];
export declare const DRIFT_SUBJECT_KINDS: readonly ["open_thread", "quest", "wiki_page", "branch_node"];
export type DriftSubjectKind = (typeof DRIFT_SUBJECT_KINDS)[number];
export declare const DRIFT_COOLING_BANDS: readonly ["recent", "moderate", "long"];
export type DriftCoolingBand = (typeof DRIFT_COOLING_BANDS)[number];
export declare const DRIFT_REACTIVATION_STATES: readonly ["none", "recently_reawakened"];
export type DriftReactivationState = (typeof DRIFT_REACTIVATION_STATES)[number];
export declare const DRIFT_DISPOSITION_KINDS: readonly ["intentional", "revive_later", "archived", "snoozed"];
export type DriftDispositionKind = (typeof DRIFT_DISPOSITION_KINDS)[number];
export declare const REAWAKENED_DAYS_WINDOW = 14;
export declare const COOLING_RECENT_DAYS = 30;
export declare const COOLING_LONG_DAYS = 60;
export declare const CREATIVE_DRIFT_BUCKET_UI_LABELS: Record<CreativeDriftActiveBucket, string>;
export declare const COOLING_BAND_UI_LABELS: Record<DriftCoolingBand, string>;
export type CreativeDriftDisposition = {
    kind: DriftDispositionKind;
    notedAt: string;
    snoozeUntil?: string | null;
    note?: string | null;
    byUserId?: string | null;
};
export type CreativeDriftDispositionMap = Record<string, CreativeDriftDisposition>;
export type CreativeDriftFinding = {
    fingerprint: string;
    bucket: CreativeDriftActiveBucket;
    subjectKind: DriftSubjectKind;
    subjectId: string;
    title: string;
    statusLabel: string;
    coolingBand: DriftCoolingBand;
    reactivationState: DriftReactivationState;
    narrativeWeight: 'minor' | 'major' | 'critical';
    lastReferencedAt: string | null;
    introducedSessionId: string | null;
    linkedEntityIds: string[];
    linkedEntityTitles?: Record<string, string>;
    reactivationCopy?: string | null;
    /** Sort key only — never expose in UI */
    _sortKey?: number;
};
export type CreativeDriftReawakenedItem = {
    fingerprint: string;
    subjectKind: DriftSubjectKind;
    subjectId: string;
    title: string;
    reactivationCopy: string;
    lastReferencedAt: string;
    linkedEntityIds: string[];
};
export type CreativeDriftBucketPayload = {
    bucket: CreativeDriftActiveBucket;
    label: string;
    items: CreativeDriftFinding[];
};
export type CreativeDriftSummary = {
    totalActive: number;
    byBucket: Record<CreativeDriftActiveBucket, number>;
    reawakenedCount: number;
    acknowledgedCount: number;
};
export type CreativeDriftScanResult = {
    version: typeof CREATIVE_DRIFT_VERSION;
    generatedAt: string;
    buckets: CreativeDriftBucketPayload[];
    reawakened: CreativeDriftReawakenedItem[];
    acknowledged: CreativeDriftFinding[];
    summary: CreativeDriftSummary;
};
export declare function parseCreativeDriftDispositionMap(raw: unknown): CreativeDriftDispositionMap;
export declare function isDispositionActive(disposition: CreativeDriftDisposition | undefined, now?: Date): 'hidden' | 'acknowledged';
export declare function isDispositionSnoozedHidden(disposition: CreativeDriftDisposition | undefined, now?: Date): boolean;
export declare function weightMultiplier(weight: 'minor' | 'major' | 'critical'): number;
export declare function computeCoolingBand(daysSinceReference: number): DriftCoolingBand;
export declare function computeCoolingScore(daysSinceReference: number, weight: 'minor' | 'major' | 'critical'): number;
export declare function sortDriftFindings(a: CreativeDriftFinding, b: CreativeDriftFinding): number;
//# sourceMappingURL=creativeDrift.d.ts.map