/** Deployment base for absolute campaign links (share, export footer). */
export function appBaseUrl(): string {
  return import.meta.env.VITE_APP_BASE_URL?.trim() || window.location.origin;
}

export function buildCampaignShareUrl(campaignHandle: string): string {
  const handle = campaignHandle.trim();
  if (!handle) return '';
  return `${appBaseUrl().replace(/\/+$/, '')}/campaigns/${handle}`;
}
