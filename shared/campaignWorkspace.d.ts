/**
 * Campaign workspace enum — canonical stored value on WikiPage.workspace.
 * Keep in sync with Prisma enum CampaignWorkspace.
 */
export declare const CampaignWorkspace: {
    readonly CHARACTERS: "CHARACTERS";
    readonly BESTIARY: "BESTIARY";
    readonly ANCESTRIES: "ANCESTRIES";
    readonly ORGANIZATIONS: "ORGANIZATIONS";
    readonly LOCATIONS: "LOCATIONS";
    readonly OBJECTS: "OBJECTS";
    readonly FAMILIES: "FAMILIES";
    readonly RULES_RESOURCES: "RULES_RESOURCES";
    readonly ADVENTURES: "ADVENTURES";
    readonly THREADS: "THREADS";
    readonly HAVENS: "HAVENS";
    readonly PROJECTS: "PROJECTS";
    readonly JOURNALS: "JOURNALS";
    readonly PAGES: "PAGES";
    readonly CUSTOM: "CUSTOM";
};
export type CampaignWorkspace = (typeof CampaignWorkspace)[keyof typeof CampaignWorkspace];
export declare const CAMPAIGN_WORKSPACE_VALUES: CampaignWorkspace[];
//# sourceMappingURL=campaignWorkspace.d.ts.map