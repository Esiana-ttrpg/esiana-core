import { useEffect } from 'react';
import { useWiki } from '@/contexts/WikiContext';
import { recordCampaignOpened } from '@/lib/campaignRecency';

/** Records client-side last-opened timestamp when the user enters a campaign shell. */
export function CampaignRecencyRecorder() {
  const { campaign } = useWiki();

  useEffect(() => {
    if (campaign?.id) {
      recordCampaignOpened(campaign.id);
    }
  }, [campaign?.id]);

  return null;
}
