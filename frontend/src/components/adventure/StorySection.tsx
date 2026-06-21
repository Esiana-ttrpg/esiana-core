import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { useAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';
import {
  readStoryViewFromSearch,
  readThreadsLensFromSearch,
  storyViewHref,
  storyViewToApiSection,
  type ThreadsLensId,
} from '@/lib/adventureLayout';
import { campaignAdventureHubPath } from '@/lib/campaignPaths';
import {
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_NARRATIVE_THREADS,
} from '@/lib/wikiSystemCategory';
import {
  patchStoryFilters,
  patchStoryView,
  patchThreadsLens,
  readCampaignWorkspaceState,
  type StoryFilterState,
} from '@/lib/workspacePersistence';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StoryWorkspaceShell } from '@/components/adventure/StoryWorkspaceShell';
import { StoryNarrativeToolbar } from '@/components/adventure/StoryNarrativeToolbar';
import { StoryViewTabs } from '@/components/adventure/StoryViewTabs';
import { BoardSection } from '@/components/adventure/BoardSection';
import { ArcsSection } from '@/components/adventure/ArcsSection';
import { InvestigationSection } from '@/components/adventure/InvestigationSection';
import { ThreadHubView } from '@/components/thread/ThreadHubView';
import { CreativeDriftContent } from '@/components/creativeDrift/CreativeDriftContent';
import { ThreadActivityFeed } from '@/components/adventure/ThreadActivityFeed';

interface StorySectionProps {
  campaignHandle: string;
  categoryPageId: string;
}

export function StorySection({ campaignHandle, categoryPageId }: StorySectionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { flatPages } = useWiki();
  const { playerPreview, isDMUser } = useAdventureWorkspace();

  const basePath = campaignAdventureHubPath(campaignHandle);
  const activeView = readStoryViewFromSearch(location.search, campaignHandle);
  const threadsLens = readThreadsLensFromSearch(location.search, campaignHandle);

  const threadsCategoryId = useMemo(
    () =>
      flatPages.find(
        (p) => parseSystemCategoryKey(p.metadata) === SYSTEM_CATEGORY_NARRATIVE_THREADS,
      )?.id ?? null,
    [flatPages],
  );

  const [filters, setFilters] = useState<StoryFilterState>(() => {
    const sticky = readCampaignWorkspaceState(campaignHandle).storyFilters;
    return sticky ?? {};
  });
  const [sectionData, setSectionData] = useState<AdventureHubPayload | null>(null);
  const [threadHistoryData, setThreadHistoryData] = useState<
    AdventureHubPayload['threadHistory'] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showStoryToolbar = activeView === 'threads' || activeView === 'unresolved';

  useEffect(() => {
    patchStoryView(campaignHandle, activeView);
  }, [activeView, campaignHandle]);

  useEffect(() => {
    if (showStoryToolbar) {
      patchStoryFilters(campaignHandle, filters);
    }
  }, [campaignHandle, filters, showStoryToolbar]);

  const loadViewData = useCallback(async () => {
    if (activeView === 'quests') {
      setSectionData(null);
      return;
    }
    if (activeView === 'unresolved') {
      setLoading(true);
      setError(null);
      try {
        setSectionData(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load unresolved items');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (activeView === 'threads' && threadsLens === 'activity' && isDMUser && !playerPreview) {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchAdventureHub(campaignHandle, {
          pageId: categoryPageId,
          section: 'thread-history',
        });
        setThreadHistoryData(payload.threadHistory ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load thread activity');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (activeView === 'threads') {
      setThreadHistoryData(null);
      setSectionData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiSection = storyViewToApiSection(activeView);
      const payload = await fetchAdventureHub(campaignHandle, {
        pageId: categoryPageId,
        section: apiSection as import('@/lib/sceneMetadata').AdventureSection,
        previewAsPlayer: isDMUser && playerPreview,
      });
      setSectionData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story view');
      setSectionData(null);
    } finally {
      setLoading(false);
    }
  }, [
    activeView,
    campaignHandle,
    categoryPageId,
    isDMUser,
    playerPreview,
    threadsLens,
  ]);

  useEffect(() => {
    void loadViewData();
  }, [loadViewData]);

  function handleFiltersChange(patch: Partial<StoryFilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function setThreadsLens(lens: ThreadsLensId) {
    patchThreadsLens(campaignHandle, lens);
    navigate(storyViewHref(basePath, 'threads', lens === 'activity' ? 'activity' : undefined), {
      replace: true,
    });
  }

  const viewContent = (() => {
    if (activeView === 'quests') {
      return (
        <BoardSection
          campaignHandle={campaignHandle}
          categoryPageId={categoryPageId}
          playerPreview={playerPreview}
        />
      );
    }
    if (loading) {
      return <LoadingSpinner label="Loading story view…" />;
    }
    if (error) {
      return (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
      );
    }
    if (activeView === 'arcs') {
      return (
        <ArcsSection
          campaignHandle={campaignHandle}
          arcHierarchy={
            sectionData?.arcHierarchy as import('@/lib/arcMetadata').ArcHierarchyProjection | null
          }
          actLanes={
            (sectionData?.actLanes as Array<{ id: string; label: string; actIndex?: number }>) ??
            []
          }
          embedded
        />
      );
    }
    if (activeView === 'threads') {
      if (threadsLens === 'activity' && isDMUser && !playerPreview) {
        return (
          <ThreadActivityFeed
            campaignHandle={campaignHandle}
            data={threadHistoryData ?? undefined}
          />
        );
      }
      if (!threadsCategoryId) {
        return (
          <p className="text-sm text-muted-foreground">Narrative Threads category not found.</p>
        );
      }
      return (
        <ThreadHubView
          campaignHandle={campaignHandle}
          categoryPageId={threadsCategoryId}
          embedded
          storyFilters={filters}
          threadsLens={threadsLens}
          onThreadsLensChange={setThreadsLens}
          playerPreview={playerPreview}
          adventureBasePath={basePath}
        />
      );
    }
    if (activeView === 'unresolved') {
      if (!isDMUser || playerPreview) {
        return (
          <p className="text-sm text-muted-foreground">
            Unresolved narrative drift is available to GMs only.
          </p>
        );
      }
      return <CreativeDriftContent campaignHandle={campaignHandle} embedded storyFilters={filters} />;
    }
    if (activeView === 'investigation') {
      if (!isDMUser || playerPreview) {
        return (
          <p className="text-sm text-muted-foreground">
            Investigation topology is available to GMs only.
          </p>
        );
      }
      return (
        <InvestigationSection
          campaignHandle={campaignHandle}
          data={sectionData?.investigation}
          embedded
        />
      );
    }
    return null;
  })();

  return (
    <StoryWorkspaceShell
      viewTabs={
        <StoryViewTabs basePath={basePath} activeView={activeView} />
      }
      toolbar={
        showStoryToolbar ? (
          <StoryNarrativeToolbar
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        ) : undefined
      }
    >
      {viewContent}
    </StoryWorkspaceShell>
  );
}
