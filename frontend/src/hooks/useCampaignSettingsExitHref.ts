import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  nextCampaignSettingsExitHref,
  resolveCampaignSettingsBackHref,
} from '@/lib/campaignSettingsNavigation';

/** Last non-settings campaign route for Settings → Back. No history stack. */
export function useCampaignSettingsExitHref(handle: string): string {
  const location = useLocation();
  const remembered = useRef<string | null>(null);
  const handleRef = useRef(handle);

  if (handleRef.current !== handle) {
    handleRef.current = handle;
    remembered.current = null;
  }

  remembered.current = nextCampaignSettingsExitHref({
    handle,
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    previous: remembered.current,
  });

  return resolveCampaignSettingsBackHref(handle, remembered.current);
}
