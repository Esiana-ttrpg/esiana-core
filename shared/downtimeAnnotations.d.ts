/**
 * Downtime period entity annotations — derived + optional GM overlay (chronology-facing).
 * @see docs/architecture-internal/downtime-timeline.md
 */
export declare const DOWNTIME_ANNOTATIONS_VERSION = "downtime-annotations-v1";
export declare const DOWNTIME_ENTITY_ROLES: readonly ["present", "absent", "affected", "occupied"];
export type DowntimeEntityRole = (typeof DOWNTIME_ENTITY_ROLES)[number];
export type DowntimeEntityKind = 'character' | 'location' | 'organization';
export type DowntimeAnnotation = {
    entityPageId: string;
    entityKind?: DowntimeEntityKind;
    /** Projection-only display label — not persisted on GM overlays. */
    entityTitle?: string | null;
    role?: DowntimeEntityRole;
    note?: string | null;
    source: 'derived' | 'authored';
};
export type DowntimeLocationMention = {
    locationPageId?: string | null;
    note: string;
    source: 'derived' | 'authored';
};
export type DowntimeGapOverlay = {
    gapId: string;
    promotedLabel?: string | null;
    annotations?: DowntimeAnnotation[];
    locationMentions?: DowntimeLocationMention[];
};
export type DowntimeGapOverlayMap = Record<string, DowntimeGapOverlay>;
export declare const MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD = 6;
export declare const MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD = 6;
export declare function parseDowntimeAnnotation(raw: unknown): DowntimeAnnotation | null;
export declare function parseDowntimeLocationMention(raw: unknown): DowntimeLocationMention | null;
export declare function parseDowntimeGapOverlay(raw: unknown): DowntimeGapOverlay | null;
export declare function parseDowntimeGapOverlayMap(raw: unknown): DowntimeGapOverlayMap;
/** Authored overlays win on entityPageId; derived fills remaining slots. */
export declare function mergeDowntimeAnnotations(authored: DowntimeAnnotation[], derived: DowntimeAnnotation[], cap?: number): DowntimeAnnotation[];
export declare function mergeDowntimeLocationMentions(authored: DowntimeLocationMention[], derived: DowntimeLocationMention[], cap?: number): DowntimeLocationMention[];
export declare function formatDowntimeAnnotationRoleLabel(role: DowntimeEntityRole | undefined): string | null;
//# sourceMappingURL=downtimeAnnotations.d.ts.map