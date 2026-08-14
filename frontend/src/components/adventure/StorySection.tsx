import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useWiki } from '@/contexts/WikiContext';
import { useAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';
import {
  storyViewToApiSection,
  type StoryViewId,
  type ThreadsLensId,
} from '@/lib/adventureLayout';
import { campaignAdventureHubPath } from '@/lib/campaignPaths';
import {
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_NARRATIVE_THREADS,
} from '@/lib/wikiSystemCategory';
import type { StoryFilterState } from '@/lib/workspacePersistence';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BoardSection } from '@/components/adventure/BoardSection';
import { ArcsSection } from '@/components/adventure/ArcsSection';
import { InvestigationSection } from '@/components/adventure/InvestigationSection';
import { ThreadHubView } from '@/components/thread/ThreadHubView';
import { ThreadsLensViewToggle } from '@/components/thread/ThreadsLensViewToggle';
import { CreativeDriftContent } from '@/components/creativeDrift/CreativeDriftContent';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { ThreadActivityFeed } from '@/components/adventure/ThreadActivityFeed';

interface StorySectionProps {
  campaignHandle: string;
  categoryPageId: string;
  activeView: StoryViewId;
  threadsLens: ThreadsLensId;
  filters: StoryFilterState;
  onThreadsLensChange: (lens: ThreadsLensId) => void;
  onHeaderActionsChange?: (actions: ReactNode | null) => void;
}

export function StorySection({
  campaignHandle,
  categoryPageId,
  activeView,
  threadsLens,
  filters,
  onThreadsLensChange,
  onHeaderActionsChange,
}: StorySectionProps) {
  const { flatPages } = useWiki();
  const { playerPreview, isDMUser } = useAdventureWorkspace();

  const basePath = campaignAdventureHubPath(campaignHandle);

  const threadsCategoryId = useMemo(
    () =>
      flatPages.find(
        (p) => parseSystemCategoryKey(p.metadata) === SYSTEM_CATEGORY_NARRATIVE_THREADS,
      )?.id ?? null,
    [flatPages],
  );

  const [sectionData, setSectionData] = useState<AdventureHubPayload | null>(null);
  const [threadHistoryData, setThreadHistoryData] = useState<
    AdventureHubPayload['threadHistory'] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const threadsActivityToolbar = useMemo(() => {
    if (
      activeView !== 'threads' ||
      threadsLens !== 'activity' ||
      !isDMUser ||
      playerPreview
    ) {
      return null;
    }
    return (
      <CategoryIndexToolbar
        createAction={null}
        createLabel="New thread"
        onCreate={() => {}}
        viewControl={
          <ThreadsLensViewToggle
            threadsLens={threadsLens}
            onThreadsLensChange={onThreadsLensChange}
          />
        }
      />
    );
  }, [activeView, isDMUser, onThreadsLensChange, playerPreview, threadsLens]);

  useEffect(() => {
    if (!onHeaderActionsChange) return;
    if (!threadsActivityToolbar) {
      return;
    }
    onHeaderActionsChange(threadsActivityToolbar);
    return () => onHeaderActionsChange(null);
  }, [onHeaderActionsChange, threadsActivityToolbar]);

  if (activeView === 'quests') {
    return (
      <BoardSection
        campaignHandle={campaignHandle}
        categoryPageId={categoryPageId}
        playerPreview={playerPreview}
        onHeaderToolbarChange={onHeaderActionsChange}
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
        categoryPageId={categoryPageId}
        arcHierarchy={
          sectionData?.arcHierarchy as import('@/lib/arcMetadata').ArcHierarchyProjection | null
        }
        actLanes={
          (sectionData?.actLanes as Array<{ id: string; label: string; actIndex?: number }>) ??
          []
        }
        embedded
        onHeaderActionsChange={onHeaderActionsChange}
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
        onThreadsLensChange={onThreadsLensChange}
        playerPreview={playerPreview}
        onHeaderToolbarChange={onHeaderActionsChange}
        isDMUser={isDMUser}
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
        threadsCategoryId={threadsCategoryId}
        embedded
        onHeaderActionsChange={onHeaderActionsChange}
      />
    );
  }

  return null;
}
