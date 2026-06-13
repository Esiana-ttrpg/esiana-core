import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { CampaignHomeLevel, CAMPAIGN_HOME_STACK_CLASS } from './CampaignHomeLevel';
import { CampaignStateCard } from './CampaignStateCard';
import { CampaignCurrentStory } from './CampaignCurrentStory';
import { CampaignPartySurface } from './CampaignPartySurface';
import { CampaignRecentActivity } from './CampaignRecentActivity';
import { CampaignHomeDeepSystems } from './CampaignHomeDeepSystems';

interface CampaignHomeBriefingProps {
  snapshot: CampaignNarrativeSnapshot;
}

export function CampaignHomeBriefing({ snapshot }: CampaignHomeBriefingProps) {
  return (
    <div className={CAMPAIGN_HOME_STACK_CLASS}>
      <CampaignHomeLevel level="2">
        <CampaignStateCard campaignState={snapshot.campaignState} />
      </CampaignHomeLevel>
      <CampaignHomeLevel level="3">
        <CampaignCurrentStory story={snapshot.currentStory} />
      </CampaignHomeLevel>
      <CampaignHomeLevel level="4">
        <CampaignPartySurface roster={snapshot.partyRoster} />
      </CampaignHomeLevel>
      <CampaignHomeLevel level="5">
        <CampaignRecentActivity activity={snapshot.recentActivity} />
      </CampaignHomeLevel>
      {snapshot.deepSystems ? (
        <CampaignHomeLevel level="6">
          <CampaignHomeDeepSystems deepSystems={snapshot.deepSystems} />
        </CampaignHomeLevel>
      ) : null}
    </div>
  );
}
