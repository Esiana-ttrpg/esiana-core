import { CampaignCapabilities, type CampaignCapability } from './capabilities.js';

/** Anonymous actors: capability resolution only; no membership role. */
export const PUBLIC_ANONYMOUS_CAPABILITIES: readonly CampaignCapability[] = [
  CampaignCapabilities.CAMPAIGN_VIEW,
  CampaignCapabilities.CODEX_VIEW_PUBLIC,
];

export function publicAnonymousCapabilities(): ReadonlySet<CampaignCapability> {
  return new Set(PUBLIC_ANONYMOUS_CAPABILITIES);
}
