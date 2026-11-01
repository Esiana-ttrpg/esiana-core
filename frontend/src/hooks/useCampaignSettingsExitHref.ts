import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  nextCampaignSettingsExitHref,
  resolveCampaignSettingsBackHref,
} from '@/lib/campaignSettingsNavigation';

/** Last non-settings campaign route for Settings → Back. No history stack. */
export function useCampaignSettingsExitHref(handle: string): string {
  const location = useLocation();
  const [remembered, setRemembered] = useState<{
    handle: string;
    href: string | null;
  }>({ handle, href: null });

  useEffect(() => {
    setRemembered((previous) => {
      const previousHref = previous.handle === handle ? previous.href : null;
      return {
        handle,
        href: nextCampaignSettingsExitHref({
          handle,
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          previous: previousHref,
        }),
      };
    });
  }, [handle, location.pathname, location.search, location.hash]);

  const hrefForHandle = remembered.handle === handle ? remembered.href : null;
  return resolveCampaignSettingsBackHref(handle, hrefForHandle);
}
