import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles } from '@/types/domain';
import { campaignPath } from '@/lib/campaignPaths';
import {
  DEFAULT_PROGRESSION_SECTION,
  readProgressionSectionFromSearch,
  readScenesViewFromSearch,
  resolveProgressionLegacyNavigateTarget,
} from '@/lib/progressionLayout';
import { progressionToAdventureApiSection } from '@shared/progressionHub';
import {
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_QUESTS,
} from '@/lib/wikiSystemCategory';
import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';
import {
  patchProgressionSection,
  readCampaignWorkspaceState,
} from '@/lib/workspacePersistence';
import { ScenesSection } from '@/components/progression/ScenesSection';
import { InsightsSection } from '@/components/progression/InsightsSection';
import { AdvanceTimeSection } from '@/components/progression/AdvanceTimeSection';
import { DevelopmentsSection } from '@/components/progression/DevelopmentsSection';
import { ScheduledEffectsProgressionSection } from '@/components/progression/ScheduledEffectsProgressionSection';
import { ConsequencesSection } from '@/components/progression/ConsequencesSection';
import { DevelopmentHistorySection } from '@/components/progression/DevelopmentHistorySection';
import { WorkshopSection } from '@/components/workshop/WorkshopSection';
import { SessionsSection } from '@/components/adventure/SessionsSection';
import { CreateSceneModal } from '@/components/adventure/CreateSceneModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ProgressionPage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const { campaign, flatPages, refresh } = useWiki();

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
  );

  const hasSectionParam = location.search.includes('section=');
  const activeSection = hasSectionParam
    ? readProgressionSectionFromSearch(location.search, campaignHandle)
    : DEFAULT_PROGRESSION_SECTION;
  const activeScenesView = readScenesViewFromSearch(location.search, campaignHandle);

  const [sectionData, setSectionData] = useState<AdventureHubPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);
  const [scenesRefreshToken, setScenesRefreshToken] = useState(0);

  useEffect(() => {
    if (canAccess && hasSectionParam) {
      patchProgressionSection(campaignHandle, activeSection);
    }
  }, [activeSection, campaignHandle, canAccess, hasSectionParam]);

  const loadAdventureSection = useCallback(async () => {
    const apiSection = progressionToAdventureApiSection(activeSection, activeScenesView);
    if (!apiSection || !questsCategoryId) {
      setSectionData(null);
      return;
    }
    setLoading(true);
    try {
      const payload = await fetchAdventureHub(campaignHandle, {
        pageId: questsCategoryId,
        section: apiSection as import('@/lib/sceneMetadata').AdventureSection,
      });
      setSectionData(payload);
    } catch {
      setSectionData(null);
    } finally {
      setLoading(false);
    }
  }, [activeScenesView, activeSection, campaignHandle, questsCategoryId]);

  useEffect(() => {
    if (canAccess && activeSection === 'sessionPrep') {
      void loadAdventureSection();
    }
  }, [canAccess, activeSection, loadAdventureSection]);

  if (!canAccess) {
    return <Navigate to={`/campaigns/${campaignHandle}/dashboard`} replace />;
  }

  if (legacyTarget) {
    return <Navigate to={legacyTarget} replace />;
  }

  if (!hasSectionParam) {
    const sticky = readCampaignWorkspaceState(campaignHandle).progressionSection;
    const target = sticky ?? DEFAULT_PROGRESSION_SECTION;
    const params = new URLSearchParams({ section: target });
    if (target === 'scenes') {
      const stickyView = readCampaignWorkspaceState(campaignHandle).progressionScenesView;
      if (stickyView) params.set('view', stickyView);
    }
    return <Navigate to={`${progressionBasePath}?${params.toString()}`} replace />;
  }

  const canManage = true;

  const isWorkshop = activeSection === 'workshop';

  return (
    <div
      className={`wiki-focal-region wiki-focal-region--canvas py-4 ${isWorkshop ? '' : 'space-y-6'}`}
    >
      {!isWorkshop ? (
        <header className="space-y-1">
          <h1 className={TYPE_DISPLAY_CLASS}>Progression</h1>
          <p className="text-sm text-muted-foreground">
            Shape the story — write scenes, prep sessions, read campaign momentum.
          </p>
        </header>
      ) : null}

      {activeSection === 'scenes' && questsCategoryId ? (
        <ScenesSection
          campaignHandle={campaignHandle}
          questsCategoryId={questsCategoryId}
          refreshToken={scenesRefreshToken}
          onCreateScene={() => setIsCreateSceneOpen(true)}
        />
      ) : null}

      {activeSection === 'sessionPrep' ? (
        loading ? (
          <LoadingSpinner label="Loading session prep…" />
        ) : (
          <SessionsSection
            campaignHandle={campaignHandle}
            data={sectionData?.sessions}
            canManage={canManage}
            currentLayout={
              (sectionData?.sessions as { storyboardLayout?: import('@/lib/sceneMetadata').StoryboardViewV1 })
                ?.storyboardLayout
            }
            onPresetApplied={() => void loadAdventureSection()}
          />
        )
      ) : null}

      {activeSection === 'workshop' ? (
        <WorkshopSection campaignHandle={campaignHandle} />
      ) : null}

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

      {questsCategoryId ? (
        <CreateSceneModal
          open={isCreateSceneOpen}
          campaignHandle={campaignHandle}
          flatPages={flatPages}
          onClose={() => setIsCreateSceneOpen(false)}
          onCreated={() => {
            void refresh();
            setScenesRefreshToken((token) => token + 1);
            if (activeSection === 'sessionPrep') {
              void loadAdventureSection();
            }
          }}
        />
      ) : null}
    </div>
  );
}
