import { Navigate, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { campaignAdventureHubPath } from '@/lib/campaignPaths';
import { adventureSectionHref } from '@/lib/adventureLayout';
import { parseSystemCategoryKey, SYSTEM_CATEGORY_QUESTS } from '@/lib/wikiSystemCategory';
import { CreativeDriftContent } from '@/components/creativeDrift/CreativeDriftContent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { UNRESOLVED_FORBIDDEN_DESCRIPTION } from '@/lib/unresolvedCopy';
import { CampaignMemberRoles } from '@/types/domain';
import { readCampaignHandle } from '@/lib/campaignPaths';

export function CreativeDriftPage() {
  const params = useParams<{ campaignHandle?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const { campaign, loading: campaignLoading, flatPages } = useWiki();
  const isDMUser =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const questsCategoryId = flatPages.find(
    (p) => parseSystemCategoryKey(p.metadata) === SYSTEM_CATEGORY_QUESTS,
  )?.id;

  if (campaignLoading) {
    return <LoadingSpinner label="Loading campaign…" />;
  }

  if (!isDMUser) {
    return (
      <MascotErrorPanel
        code={403}
        title="DM only"
        description={UNRESOLVED_FORBIDDEN_DESCRIPTION}
      />
    );
  }

  if (questsCategoryId) {
    return (
      <Navigate
        to={adventureSectionHref(campaignAdventureHubPath(campaignHandle), 'story', {
          view: 'unresolved',
        })}
        replace
      />
    );
  }

  return <CreativeDriftContent campaignHandle={campaignHandle} />;
}
