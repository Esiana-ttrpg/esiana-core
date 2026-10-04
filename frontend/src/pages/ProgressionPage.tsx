import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import { useEffect, useMemo } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles } from '@/types/domain';
import { campaignPath } from '@/lib/campaignPaths';
import {
  DEFAULT_PROGRESSION_SECTION,
  readProgressionSectionFromSearch,
  resolveProgressionLegacyNavigateTarget,
} from '@/lib/progressionLayout';
import {
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_QUESTS,
} from '@/lib/wikiSystemCategory';
import {
  patchProgressionSection,
  readCampaignWorkspaceState,
} from '@/lib/workspacePersistence';
import { InsightsSection } from '@/components/progression/InsightsSection';
import { AdvanceTimeSection } from '@/components/progression/AdvanceTimeSection';
import { DevelopmentsSection } from '@/components/progression/DevelopmentsSection';
import { ScheduledEffectsProgressionSection } from '@/components/progression/ScheduledEffectsProgressionSection';
import { ConsequencesSection } from '@/components/progression/ConsequencesSection';
import { DevelopmentHistorySection } from '@/components/progression/DevelopmentHistorySection';
import { resolveLegacyWorkshopRedirect } from '@/lib/workshopNavigation';

export function ProgressionPage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const { campaign, flatPages } = useWiki();

  const canAccess =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const questsCategoryId = useMemo(
    () =>
      flatPages.find((p) => parseSystemCategoryKey(p.metadata) === SYSTEM_CATEGORY_QUESTS)?.id ??
      null,
    [flatPages],
  );

  const progressionBasePath = campaignPath(campaignHandle, 'progression');
  const legacyTarget = resolveProgressionLegacyNavigateTarget(
    progressionBasePath,
    location.search,
    campaignHandle,
  );

  const hasSectionParam = location.search.includes('section=');
  const activeSection = hasSectionParam
    ? readProgressionSectionFromSearch(location.search, campaignHandle)
    : DEFAULT_PROGRESSION_SECTION;

  useEffect(() => {
    if (canAccess && hasSectionParam) {
      patchProgressionSection(campaignHandle, activeSection);
    }
  }, [activeSection, campaignHandle, canAccess, hasSectionParam]);

  if (!canAccess) {
    return <Navigate to={`/campaigns/${campaignHandle}/dashboard`} replace />;
  }

  const workshopRedirect = resolveLegacyWorkshopRedirect(campaignHandle, location.search);
  if (workshopRedirect) {
    return <Navigate to={workshopRedirect} replace />;
  }

  if (legacyTarget) {
    return <Navigate to={legacyTarget} replace />;
  }

  if (!hasSectionParam) {
    const sticky = readCampaignWorkspaceState(campaignHandle).progressionSection;
    const resolved =
      sticky &&
      ['insights', 'advance', 'developments', 'scheduledEffects', 'consequences', 'history'].includes(
        sticky,
      )
        ? sticky
        : DEFAULT_PROGRESSION_SECTION;
    return (
      <Navigate
        to={`${progressionBasePath}?${new URLSearchParams({ section: resolved }).toString()}`}
        replace
      />
    );
  }

  return (
    <div className="wiki-focal-region wiki-focal-region--canvas space-y-6 py-4">
      <header className="space-y-1">
        <h1 className={TYPE_DISPLAY_CLASS}>Progression</h1>
        <p className="text-sm text-muted-foreground">
          Shape how the world changes — momentum, developments, and campaign history.
        </p>
      </header>

      {activeSection === 'insights' && questsCategoryId ? (
        <InsightsSection campaignHandle={campaignHandle} questsCategoryId={questsCategoryId} />
      ) : null}

      {activeSection === 'advance' ? (
        <AdvanceTimeSection campaignHandle={campaignHandle} />
      ) : null}

      {activeSection === 'developments' ? (
        <DevelopmentsSection campaignHandle={campaignHandle} />
      ) : null}

      {activeSection === 'scheduledEffects' ? (
        <ScheduledEffectsProgressionSection
          campaignHandle={campaignHandle}
          organizationPages={flatPages.filter(
            (page) => resolveCanonicalEntityCategory(page, flatPages) === 'organizations',
          )}
          canManage={canAccess}
        />
      ) : null}

      {activeSection === 'consequences' ? (
        <ConsequencesSection campaignHandle={campaignHandle} />
      ) : null}

      {activeSection === 'history' ? (
        <DevelopmentHistorySection campaignHandle={campaignHandle} />
      ) : null}
    </div>
  );
}
