/**
 * Layer 1 — campaign container discoverability (not a membership role).
 */
export declare const CampaignDiscoverability: {
    readonly PRIVATE: "private";
    readonly UNLISTED: "unlisted";
    readonly PUBLIC: "public";
};
export type CampaignDiscoverabilityValue = (typeof CampaignDiscoverability)[keyof typeof CampaignDiscoverability];
export type DiscoverabilityInput = {
    isPublicViewable: boolean;
    isPublic: boolean;
};
export declare function resolveDiscoverability(input: DiscoverabilityInput): CampaignDiscoverabilityValue;
export declare function allowsAnonymousCampaignView(discoverability: CampaignDiscoverabilityValue): boolean;
//# sourceMappingURL=discoverability.d.ts.map