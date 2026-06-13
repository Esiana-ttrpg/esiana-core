/**
 * Campaign-scoped capability primitives.
 * Application administration (SYSTEM_ADMIN) is outside this registry.
 */
export declare const CampaignCapabilities: {
    readonly CAMPAIGN_VIEW: "campaign.view";
    readonly CAMPAIGN_DELETE: "campaign.delete";
    readonly CAMPAIGN_TRANSFER_OWNERSHIP: "campaign.transfer_ownership";
    readonly CAMPAIGN_MANAGE_ROLES: "campaign.manage_roles";
    readonly CAMPAIGN_SETTINGS_EDIT: "campaign.settings.edit";
    readonly CAMPAIGN_VISIBILITY_EDIT: "campaign.visibility.edit";
    readonly BILLING_MANAGE: "billing.manage";
    readonly WORLD_EDIT: "world.edit";
    readonly WIKI_EDIT: "wiki.edit";
    readonly ASSETS_MANAGE: "assets.manage";
    readonly TEMPLATES_MANAGE: "templates.manage";
    readonly CHRONOLOGY_EDIT: "chronology.edit";
    readonly DISCOVERY_REVEAL: "discovery.reveal";
    readonly NARRATIVE_ELEVATED_VIEW: "narrative.elevated_view";
    readonly RUMOR_MODERATE: "rumor.moderate";
    readonly NOTES_MODERATE: "notes.moderate";
    readonly WIKI_VIEW_PARTY: "wiki.view_party";
    readonly JOURNAL_CREATE: "journal.create";
    readonly CHARACTER_EDIT: "character.edit";
    readonly CODEX_VIEW_PUBLIC: "codex.view_public";
};
export type CampaignCapability = (typeof CampaignCapabilities)[keyof typeof CampaignCapabilities];
export declare const ALL_CAMPAIGN_CAPABILITIES: readonly CampaignCapability[];
//# sourceMappingURL=capabilities.d.ts.map