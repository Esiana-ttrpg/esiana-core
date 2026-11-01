import { campaignSettingsPath, type CampaignSettingsTab } from './campaignPaths';

export const CAMPAIGN_ACCESS_SECTIONS = ['members', 'sharing', 'roles'] as const;
export type CampaignAccessSection = (typeof CAMPAIGN_ACCESS_SECTIONS)[number];

export const ACCESS_INVITE_MEMBERS_HASH = 'invite-members';

export function parseCampaignAccessSection(
  value: string | null,
): CampaignAccessSection {
  if (value === 'sharing' || value === 'roles') return value;
  return 'members';
}

/** Local Access tab. Members is the default and stays off the query string. */
export function campaignAccessSectionHref(
  handle: string,
  params: URLSearchParams,
  section: CampaignAccessSection,
  hash?: string,
): string {
  const next = new URLSearchParams(params);
  next.set('tab', 'access');
  if (section === 'members') next.delete('section');
  else next.set('section', section);
  const query = next.toString();
  const path = campaignSettingsPath(handle) + (query ? `?${query}` : '');
  return hash ? `${path}#${hash}` : path;
}

/** Keep section details on direct/same-section links; discard them when leaving. */
export function campaignSettingsSectionHref(
  handle: string,
  params: URLSearchParams,
  currentTab: CampaignSettingsTab,
  nextTab: CampaignSettingsTab,
): string {
  const next = new URLSearchParams(params);
  if (nextTab !== currentTab) next.delete('request');
  if (nextTab !== 'access') next.delete('section');
  if (nextTab === 'general') next.delete('tab');
  else next.set('tab', nextTab);
  const query = next.toString();
  return campaignSettingsPath(handle) + (query ? `?${query}` : '');
}
