import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMyCampaigns } from '@/lib/campaigns';
import { getRecentMemberCampaigns } from '@/lib/campaignRecency';
import { sortCampaignsByName } from '@/lib/sortCampaignsByName';
import type { CampaignSummary } from '@/types/campaign';

export function useCampaignSwitchData(enabled: boolean) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchMyCampaigns();
      setCampaigns(data.filter((c) => c.isMember));
      setHasLoaded(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || hasLoaded) return;
    void loadCampaigns();
  }, [enabled, hasLoaded, loadCampaigns]);

  const roster = useMemo(() => sortCampaignsByName(campaigns), [campaigns]);

  const recent = useMemo(() => getRecentMemberCampaigns(roster, 3), [roster]);

  return {
    roster,
    recent,
    loading,
    loadError,
    reload: loadCampaigns,
  };
}
