"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_ANONYMOUS_CAPABILITIES = void 0;
exports.publicAnonymousCapabilities = publicAnonymousCapabilities;
const capabilities_js_1 = require("./capabilities.js");
/** Anonymous actors: capability resolution only; no membership role. */
exports.PUBLIC_ANONYMOUS_CAPABILITIES = [
    capabilities_js_1.CampaignCapabilities.CAMPAIGN_VIEW,
    capabilities_js_1.CampaignCapabilities.CODEX_VIEW_PUBLIC,
];
function publicAnonymousCapabilities() {
    return new Set(exports.PUBLIC_ANONYMOUS_CAPABILITIES);
}
//# sourceMappingURL=publicProfile.js.map