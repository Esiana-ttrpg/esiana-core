export interface ImageCredit {
    artCredit?: string | null;
    artCreditUrl?: string | null;
    source?: string | null;
    sourceUrl?: string | null;
    madeWith?: string | null;
    madeWithUrl?: string | null;
}
export type ImageCreditDisplayRow = {
    label: 'Art credit' | 'Source' | 'Made with';
    text: string;
    href?: string;
};
export declare const IMAGE_CREDIT_DISCLAIMER = "Credits are optional and may not always reflect ownership or reuse rights.";
export declare const MADE_WITH_SUGGESTIONS: readonly ["HeroForge", "Picrew", "Rinmaru", "DungeonDraft", "Inkarnate", "Wonderdraft", "Midjourney", "SDXL", "Baldur's Gate 3 character creator"];
export declare function normalizeImageCredit(raw: unknown): ImageCredit | null;
export declare function imageCreditDisplayRows(credit: ImageCredit | null | undefined): ImageCreditDisplayRow[];
export declare function hasImageCredit(credit: ImageCredit | null | undefined): boolean;
//# sourceMappingURL=imageCredit.d.ts.map