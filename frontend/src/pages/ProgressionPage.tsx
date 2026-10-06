import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles } from '@/types/domain';
import { campaignPath } from '@/lib/campaignPaths';
import {
  DEFAULT_PROGRESSION_SECTION,
  PROGRESSION_SECTIONS,
  isProgressionSectionId,
  readProgressionSectionFromSearch,
  type ProgressionSectionId,
} from '@/lib/progressionLayout';
import {
  patchProgressionSection,
  readCampaignWorkspaceState,
} from '@/lib/workspacePersistence';
import { ProgressionTrajectoriesSection } from '@/components/progression/ProgressionTrajectoriesSection';
import { DevelopmentsSection } from '@/components/progression/DevelopmentsSection';
import { DevelopmentHistorySection } from '@/components/progression/DevelopmentHistorySection';

const VALID_PROGRESSION_SECTION_IDS = new Set<string>(
  PROGRESSION_SECTIONS.map((section) => section.id),
);

export function ProgressionPage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const { campaign } = useWiki();

  const canAccess =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const progressionBasePath = campaignPath(campaignHandle, 'progression');

  const hasSectionParam = location.search.includes('section=');
  const activeSection = hasSectionParam
    ? readProgressionSectionFromSearch(location.search, campaignHandle)
    : DEFAULT_PROGRESSION_SECTION;

  useEffect(() => {
    if (canAccess && hasSectionParam && isProgressionSectionId(activeSection)) {
      patchProgressionSection(campaignHandle, activeSection);
    }
  }, [activeSection, campaignHandle, canAccess, hasSectionParam]);

  if (!canAccess) {
    return <Navigate to={`/campaigns/${campaignHandle}/dashboard`} replace />;
  }

  if (!hasSectionParam) {
    const sticky = readCampaignWorkspaceState(campaignHandle).progressionSection;
    const resolved: ProgressionSectionId =
      sticky && VALID_PROGRESSION_SECTION_IDS.has(sticky)
        ? (sticky as ProgressionSectionId)
        : DEFAULT_PROGRESSION_SECTION;
    return (
      <Navigate
        to={`${progressionBasePath}?${new URLSearchParams({ section: resolved }).toString()}`}
        replace
      />
    );
  }

  if (!isProgressionSectionId(new URLSearchParams(location.search).get('section'))) {
    return (
      <Navigate
        to={`${progressionBasePath}?${new URLSearchParams({ section: DEFAULT_PROGRESSION_SECTION }).toString()}`}
        replace
      />
    );
  }

  return (
    <div className="wiki-focal-region wiki-focal-region--canvas space-y-6 py-4">
      {activeSection === 'trajectories' ? (
        <ProgressionTrajectoriesSection campaignHandle={campaignHandle} />
      ) : null}

      {activeSection === 'developments' ? (
        <DevelopmentsSection campaignHandle={campaignHandle} />
      ) : null}

      {activeSection === 'history' ? (
        <DevelopmentHistorySection campaignHandle={campaignHandle} />
      ) : null}
    </div>
  );
}
