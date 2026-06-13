"use strict";
/**
 * Campaign-scoped capability primitives.
 * Application administration (SYSTEM_ADMIN) is outside this registry.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_CAMPAIGN_CAPABILITIES = exports.CampaignCapabilities = void 0;
exports.CampaignCapabilities = {
    CAMPAIGN_VIEW: 'campaign.view',
    CAMPAIGN_DELETE: 'campaign.delete',
    CAMPAIGN_TRANSFER_OWNERSHIP: 'campaign.transfer_ownership',
    CAMPAIGN_MANAGE_ROLES: 'campaign.manage_roles',
    CAMPAIGN_SETTINGS_EDIT: 'campaign.settings.edit',
    CAMPAIGN_VISIBILITY_EDIT: 'campaign.visibility.edit',
    BILLING_MANAGE: 'billing.manage',
    WORLD_EDIT: 'world.edit',
    WIKI_EDIT: 'wiki.edit',
    ASSETS_MANAGE: 'assets.manage',
    TEMPLATES_MANAGE: 'templates.manage',
    CHRONOLOGY_EDIT: 'chronology.edit',
    DISCOVERY_REVEAL: 'discovery.reveal',
    NARRATIVE_ELEVATED_VIEW: 'narrative.elevated_view',
    RUMOR_MODERATE: 'rumor.moderate',
    NOTES_MODERATE: 'notes.moderate',
    WIKI_VIEW_PARTY: 'wiki.view_party',
    JOURNAL_CREATE: 'journal.create',
    CHARACTER_EDIT: 'character.edit',
    CODEX_VIEW_PUBLIC: 'codex.view_public',
};
exports.ALL_CAMPAIGN_CAPABILITIES = Object.values(exports.CampaignCapabilities);
//# sourceMappingURL=capabilities.js.map