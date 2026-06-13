import type { WorkshopFormalizeTarget } from './workshopDocument.js';
export declare const WORKSHOP_FORMALIZE_TARGET_LABELS: Record<WorkshopFormalizeTarget, {
    label: string;
    description: string;
}>;
/** Lore folders under World eligible for lore_note formalize (excludes Party, Journals, etc.). */
export declare const LORE_NOTE_FOLDER_TITLES: readonly ["Characters", "Locations", "Organizations", "Objects", "Families", "Bestiary", "Ancestries", "Maps"];
export declare function extractSummaryFromMarkdown(body: string, maxLen?: number): string;
//# sourceMappingURL=workshopFormalize.d.ts.map