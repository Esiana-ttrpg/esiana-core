import {
  campaignDashboardPath,
  campaignPath,
  campaignSettingsPath,
  type CampaignSettingsTab,
} from './campaignPaths';

export const CAMPAIGN_SETTINGS_TABS = [
  'safety-privacy',
  'general',
  'access',
  'recruitment',
  'scheduling',
  'audio',
  'timeline',
  'world-development',
  'appearance',
  'integrations',
  'advanced',
] as const satisfies readonly CampaignSettingsTab[];

export function parseCampaignSettingsTab(value: string | null): CampaignSettingsTab {
  if (value && CAMPAIGN_SETTINGS_TABS.includes(value as CampaignSettingsTab)) {
    return value as CampaignSettingsTab;
  }
  return 'general';
}

export function isCampaignSettingsPathname(pathname: string, handle: string): boolean {
  if (!handle) return false;
  const settingsPath = campaignSettingsPath(handle);
  return pathname === settingsPath || pathname.startsWith(`${settingsPath}/`);
}

export function isCampaignScopedPathname(pathname: string, handle: string): boolean {
  if (!handle) return false;
  const base = campaignPath(handle);
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function campaignLocationHref(location: {
  pathname: string;
  search?: string;
  hash?: string;
}): string {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
}

/** Remember the last non-settings campaign location. Settings URLs never replace it. */
export function nextCampaignSettingsExitHref(args: {
  handle: string;
  pathname: string;
  search?: string;
  hash?: string;
  previous: string | null;
}): string | null {
  if (!isCampaignScopedPathname(args.pathname, args.handle)) {
    return args.previous;
  }
  if (isCampaignSettingsPathname(args.pathname, args.handle)) {
    return args.previous;
  }
  return campaignLocationHref(args);
}

export function resolveCampaignSettingsBackHref(
  handle: string,
  remembered: string | null,
): string {
  return remembered ?? campaignDashboardPath(handle);
}

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
