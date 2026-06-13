/**
 * Layer 5 — arc hierarchy overlay metadata (soft membership).
 */
export declare const ARC_METADATA_VERSION = "arc-metadata-v1";
export declare const ARC_KINDS: readonly ["campaign_arc", "questline"];
export type ArcKind = (typeof ARC_KINDS)[number];
export interface ArcMetadataFields {
    arcMetadataVersion: string;
    arcKind: ArcKind;
    containedPageIds: string[];
    actIndex: number | null;
    pacingTarget: string | null;
}
export declare function normalizeArcKind(raw: unknown): ArcKind;
export declare function normalizeStringArray(raw: unknown): string[];
export declare function parseArcMetadata(metadata: unknown): ArcMetadataFields;
export declare function emptyArcMetadata(): ArcMetadataFields;
export declare function isArcMetadataPresent(metadata: unknown): boolean;
export declare function mergeArcMetadata(existing: unknown, patch: Partial<ArcMetadataFields>): Record<string, unknown>;
export type ArcContainmentChildKind = 'questline' | 'quest' | 'unknown';
export declare function classifyArcContainmentChild(metadata: unknown, isQuestPage: boolean): ArcContainmentChildKind;
export declare function validateArcContainment(parentKind: ArcKind, childKind: ArcContainmentChildKind): boolean;
//# sourceMappingURL=arcMetadata.d.ts.map