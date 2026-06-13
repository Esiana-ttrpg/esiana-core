"use strict";
/**
 * Layer 1 — campaign container discoverability (not a membership role).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignDiscoverability = void 0;
exports.resolveDiscoverability = resolveDiscoverability;
exports.allowsAnonymousCampaignView = allowsAnonymousCampaignView;
exports.CampaignDiscoverability = {
    PRIVATE: 'private',
    UNLISTED: 'unlisted',
    PUBLIC: 'public',
};
function resolveDiscoverability(input) {
    if (!input.isPublicViewable)
        return exports.CampaignDiscoverability.PRIVATE;
    if (input.isPublic)
        return exports.CampaignDiscoverability.PUBLIC;
    return exports.CampaignDiscoverability.UNLISTED;
}
function allowsAnonymousCampaignView(discoverability) {
    return discoverability !== exports.CampaignDiscoverability.PRIVATE;
}
//# sourceMappingURL=discoverability.js.map