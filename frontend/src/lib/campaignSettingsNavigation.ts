import { campaignSettingsPath, type CampaignSettingsTab } from './campaignPaths';

/** Keep section details on direct/same-section links; discard them when leaving. */
export function campaignSettingsSectionHref(
  handle: string,
  params: URLSearchParams,
  currentTab: CampaignSettingsTab,
  nextTab: CampaignSettingsTab,
): string {
  const next = new URLSearchParams(params);
  if (nextTab !== currentTab) next.delete('request');
  if (nextTab === 'general') next.delete('tab');
  else next.set('tab', nextTab);
  const query = next.toString();
  return campaignSettingsPath(handle) + (query ? `?${query}` : '');
}
