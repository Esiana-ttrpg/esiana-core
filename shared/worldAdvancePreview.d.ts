/**
 * Pure preview projection for world-advance batches (no DB).
 */
import type { WorldAdvanceEffect } from './worldAdvance.js';
import type { WorldAdvanceBatchRequest, WorldAdvancePreview } from './worldAdvance.js';
export declare function effectToConditionDeriveRow(effect: WorldAdvanceEffect, regionPageId?: string | null): {
    id: string;
    domain: string;
    type: string;
    regionPageId?: string;
    orgPageId?: string;
    characterPageId?: string;
    signal?: string;
    phase?: string;
    pressureLevel?: string;
    stance?: string;
    kind?: string;
    toLocationPageId?: string;
};
export declare function collectPageIdsFromEffect(effect: WorldAdvanceEffect): string[];
export declare function buildPreviewFromBatchRequest(request: WorldAdvanceBatchRequest, options: {
    projectedEpochMinute?: string;
    asOfEpochMinute?: string;
    asOfLabel?: string | null;
    pageTitles: Map<string, string>;
    regionPageIdByEffect?: (effect: WorldAdvanceEffect) => string | null | undefined;
}): WorldAdvancePreview;
//# sourceMappingURL=worldAdvancePreview.d.ts.map