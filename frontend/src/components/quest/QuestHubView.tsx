import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  ScrollText,
} from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  fetchQuestHub,
  resolveWikiParentChain,
} from '@/lib/wiki';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import { resolveMasterCalendarLike } from '@/lib/chronologyCalendar';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { CreateQuestModal } from '@/components/quest/CreateQuestModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QuestCard } from '@/components/quest/QuestCard';
import { QuestKanbanBoard } from '@/components/quest/QuestKanbanBoard';
import {
  QuestHubFilters,
  DEFAULT_QUEST_HUB_STATUS_FILTERS,
  DEFAULT_QUEST_HUB_TYPE_FILTERS,
} from '@/components/quest/QuestHubFilters';
import {
  flattenQuestHubTree,
  readStoredQuestHubViewMode,
  writeStoredQuestHubViewMode,
  type QuestHubViewMode,
} from '@/lib/questHubLayout';
import {
  countVisibleQuestNodes,
  questNodeMatchesFilters,
  type QuestHubStatusFilters,
  type QuestHubTypeFilters,
} from '@/lib/questHubFilters';
import { useCampaignActor } from '@/hooks/useCampaignActor';
import type { QuestHubNode, QuestHubPayload, WikiTreeNode } from '@/types/wiki';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';
import { CategoryIndexActiveRefineChips } from '@/components/wiki/indexBrowse/CategoryIndexActiveRefineChips';
import { CategoryIndexEmptyStatePanel } from '@/components/wiki/indexBrowse/CategoryIndexEmptyStatePanel';
import {
  compareQuestHubSearchRank,
  countActiveQuestHubRefine,
  findSimilarQuestHubEntries,
  hasActiveQuestHubRefine,
  listQuestHubRefineChips,
  matchesQuestHubSearch,
} from '@/lib/questHubBrowse';
import {
  readQuestHubBrowseSnapshot,
  writeQuestHubBrowseSnapshot,
} from '@/lib/categoryIndexBrowseStorage';
import { resolveCategoryIndexEmptyVariant } from '@/lib/categoryIndexEmptyState';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  formatWorkspaceHubCountHint,
  resolveCategoryCountNouns,
} from '@/lib/workspaceHeaderPolicy';
import type { StoryFilterState } from '@/lib/workspacePersistence';

interface QuestHubViewProps {
  campaignHandle: string;
  categoryPageId: string;
  /** When true, render quest workspace only (inside Adventure shell). */
  embedded?: boolean;
  storyFilters?: StoryFilterState;
  playerPreview?: boolean;
  /** Hoist toolbar into Adventure hub header when embedded. */
  onHeaderToolbarChange?: (toolbar: ReactNode | null) => void;
}

function questNodesToSimilarChildren(nodes: QuestHubNode[]): CategoryIndexChild[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title,
    parentId: node.parentId,
    visibility: node.visibility,
    updatedAt: node.updatedAt,
    snippet: node.snippet,
  }));
}

export function QuestHubView({
  campaignHandle,
  categoryPageId,
  embedded = false,
  playerPreview: playerPreviewProp,
  onHeaderToolbarChange,
}: QuestHubViewProps) {
  const { flatPages, refresh, campaign } = useWiki();
  const navigate = useNavigate();
  const [playerPreviewLocal, setPlayerPreviewLocal] = useState(false);
  const playerPreview = playerPreviewProp ?? playerPreviewLocal;
  const { previewAsPlayer, isElevated } = useCampaignActor({
    previewAsPlayer: playerPreview,
  });
  const isDMUser = isElevated();

  const [data, setData] = useState<QuestHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<QuestHubViewMode>(readStoredQuestHubViewMode);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialTitle, setCreateInitialTitle] = useState<string | null>(null);
  const [calendarLike, setCalendarLike] = useState<FantasyCalendarLike | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [browseHydrated, setBrowseHydrated] = useState(false);
  const [statusFilters, setStatusFilters] = useState<QuestHubStatusFilters>(
    () => ({ ...DEFAULT_QUEST_HUB_STATUS_FILTERS }),
  );
  const [typeFilters, setTypeFilters] = useState<QuestHubTypeFilters>(
    () => ({ ...DEFAULT_QUEST_HUB_TYPE_FILTERS }),
  );

  const canCreate = true;
  const categoryTitle = data?.category.title ?? 'Adventure';

  const pageById = useMemo(() => buildWikiPageLookup(flatPages), [flatPages]);

  const tagsPageId = useMemo(
    () =>
      flatPages.find((page) => page.title.trim().toLowerCase() === 'tags')?.id ??
      null,
    [flatPages],
  );

  const indexBreadcrumbs = useMemo(() => {
    const parentChain = resolveWikiParentChain(
      categoryPageId,
      null,
      pageById,
    );
    return buildWikiBreadcrumbs(parentChain, {
      id: categoryPageId,
      title: categoryTitle,
    });
  }, [categoryPageId, categoryTitle, pageById]);

  const loadHub = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchQuestHub(campaignHandle, {
        pageId: categoryPageId,
        previewAsPlayer,
      });
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quest hub');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, categoryPageId, previewAsPlayer]);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  useEffect(() => {
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (!cancelled) {
          setCalendarLike(resolveMasterCalendarLike(bundle));
        }
      })
      .catch(() => {
        if (!cancelled) setCalendarLike(null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  useEffect(() => {
    if (!campaignHandle || !categoryPageId || browseHydrated) return;
    const snapshot = readQuestHubBrowseSnapshot(campaignHandle, categoryPageId);
    if (snapshot?.searchQuery !== undefined) {
      setSearchQuery(snapshot.searchQuery);
    }
    if (snapshot?.viewMode === 'list' || snapshot?.viewMode === 'board') {
      setViewMode(snapshot.viewMode);
    } else if (snapshot?.viewMode === undefined) {
      setViewMode(readStoredQuestHubViewMode());
    }
    if (snapshot?.statusFilters) {
      setStatusFilters({ ...DEFAULT_QUEST_HUB_STATUS_FILTERS, ...snapshot.statusFilters });
    }
    if (snapshot?.typeFilters) {
      setTypeFilters({ ...DEFAULT_QUEST_HUB_TYPE_FILTERS, ...snapshot.typeFilters });
    }
    setBrowseHydrated(true);
  }, [campaignHandle, categoryPageId, browseHydrated]);

  useEffect(() => {
    if (!browseHydrated) return;
    writeQuestHubBrowseSnapshot(campaignHandle, categoryPageId, {
      searchQuery,
      viewMode,
      statusFilters,
      typeFilters,
    });
    writeStoredQuestHubViewMode(viewMode);
  }, [
    browseHydrated,
    campaignHandle,
    categoryPageId,
    searchQuery,
    viewMode,
    statusFilters,
    typeFilters,
  ]);

  function handleViewModeChange(mode: QuestHubViewMode) {
    setViewMode(mode);
  }

  const handleCreate = useCallback(() => {
    setCreateInitialTitle(null);
    setIsCreateOpen(true);
  }, []);

  function handleCreateFromSearch(title: string) {
    setCreateInitialTitle(title);
    setIsCreateOpen(true);
  }

  async function handlePageCreated(page: WikiTreeNode) {
    setIsCreateOpen(false);
    setCreateInitialTitle(null);
    await refresh();
    await loadHub();
    navigate(
      campaignCategoryChildPath(campaignHandle, page.id, categoryTitle, flatPages),
    );
  }

  const handleQuestsChange = useCallback((quests: QuestHubNode[]) => {
    setData((prev) => (prev ? { ...prev, quests } : prev));
  }, []);

  const flatQuestNodes = useMemo(
    () => (data ? flattenQuestHubTree(data.quests) : []),
    [data],
  );

  const showStatusRefine = viewMode === 'list';

  const hasActiveRefine = hasActiveQuestHubRefine(
    statusFilters,
    typeFilters,
    showStatusRefine,
  );

  const searchFilteredNodes = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    let nodes = flatQuestNodes.filter((node) =>
      matchesQuestHubSearch(node, searchQuery),
    );
    if (normalized) {
      nodes = [...nodes].sort((a, b) =>
        compareQuestHubSearchRank(a, b, searchQuery),
      );
    }
    return nodes;
  }, [flatQuestNodes, searchQuery]);

  const filteredListNodes = useMemo(
    () =>
      searchFilteredNodes.filter((node) =>
        questNodeMatchesFilters(node, statusFilters, typeFilters),
      ),
    [searchFilteredNodes, statusFilters, typeFilters],
  );

  const filteredBoardCount = useMemo(() => {
    return searchFilteredNodes.filter((node) =>
      questNodeMatchesFilters(
        node,
        {
          available: true,
          active: true,
          completed: true,
          failed: true,
        },
        typeFilters,
      ),
    ).length;
  }, [searchFilteredNodes, typeFilters]);

  const totalQuestCount = data ? countVisibleQuestNodes(data.quests) : 0;
  const filteredQuestCount =
    viewMode === 'list' ? filteredListNodes.length : filteredBoardCount;

  const resultCountLabel = formatWorkspaceHubCountHint({
    total: totalQuestCount,
    matching: filteredQuestCount,
    singular: resolveCategoryCountNouns(categoryTitle).singular,
    plural: resolveCategoryCountNouns(categoryTitle).plural,
    searchQuery,
    hasActiveRefine,
  });

  const emptyVariant = resolveCategoryIndexEmptyVariant({
    totalCount: totalQuestCount,
    filteredCount: filteredQuestCount,
    searchQuery,
    hasActiveRefine,
    canCreate,
  });

  const similarEntries = useMemo(() => {
    if (emptyVariant !== 'search_miss' && emptyVariant !== 'search_miss_no_create') {
      return [];
    }
    return questNodesToSimilarChildren(
      findSimilarQuestHubEntries(flatQuestNodes, searchQuery),
    );
  }, [flatQuestNodes, searchQuery, emptyVariant]);

  const questRefineChips = listQuestHubRefineChips(
    statusFilters,
    typeFilters,
    showStatusRefine,
  );

  function handleRemoveQuestChip(facetId: string) {
    if (facetId.startsWith('status-')) {
      const id = facetId.replace('status-', '') as keyof QuestHubStatusFilters;
      setStatusFilters((prev) => ({ ...prev, [id]: false }));
      return;
    }
    if (facetId.startsWith('type-')) {
      const preset = facetId.replace('type-', '') as keyof QuestHubTypeFilters;
      setTypeFilters((prev) => ({ ...prev, [preset]: false }));
    }
  }

  const workspace = (
    <>
      {error && (
        <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!data || totalQuestCount === 0 ? (
        <CategoryIndexEmptyStatePanel
          totalCount={0}
          filteredCount={0}
          searchQuery=""
          hasActiveRefine={false}
          canCreate={canCreate}
          categoryTitle={categoryTitle}
          itemLabel="Quest"
          campaignHandle={campaignHandle}
          similarEntries={[]}
          headerCreateLabel="New quest"
          onCreate={handleCreate}
          onCreateFromSearch={handleCreateFromSearch}
          onClearSearch={() => setSearchQuery('')}
          onResetRefine={() => {
            setStatusFilters({ ...DEFAULT_QUEST_HUB_STATUS_FILTERS });
            setTypeFilters({ ...DEFAULT_QUEST_HUB_TYPE_FILTERS });
          }}
          icon={<ScrollText className="mx-auto mb-3 size-10 text-muted" />}
        />
      ) : emptyVariant !== null ? (
        <CategoryIndexEmptyStatePanel
          totalCount={totalQuestCount}
          filteredCount={filteredQuestCount}
          searchQuery={searchQuery}
          hasActiveRefine={hasActiveRefine}
          canCreate={canCreate}
          categoryTitle={categoryTitle}
          itemLabel="Quest"
          campaignHandle={campaignHandle}
          similarEntries={similarEntries}
          headerCreateLabel="New quest"
          onCreate={handleCreate}
          onCreateFromSearch={handleCreateFromSearch}
          onClearSearch={() => setSearchQuery('')}
          onResetRefine={() => {
            setStatusFilters({ ...DEFAULT_QUEST_HUB_STATUS_FILTERS });
            setTypeFilters({ ...DEFAULT_QUEST_HUB_TYPE_FILTERS });
          }}
        />
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredListNodes.map((quest) => (
            <QuestCard
              key={quest.id}
              node={{ ...quest, children: [] }}
              campaignHandle={campaignHandle}
              tagsPageId={tagsPageId}
              playerPreview={playerPreview || data.previewAsPlayer}
              calendarLike={calendarLike}
            />
          ))}
        </div>
      ) : (
        <QuestKanbanBoard
          campaignHandle={campaignHandle}
          tagsPageId={tagsPageId}
          data={data}
          playerPreview={playerPreview || data.previewAsPlayer}
          onQuestsChange={handleQuestsChange}
          calendarLike={calendarLike}
          typeFilters={typeFilters}
          searchQuery={searchQuery}
        />
      )}
    </>
  );

  const createModal = (
    <CreateQuestModal
      open={isCreateOpen}
      onClose={() => {
        setIsCreateOpen(false);
        setCreateInitialTitle(null);
      }}
      onCreated={handlePageCreated}
      campaignHandle={campaignHandle}
      questsRootId={categoryPageId}
      initialTitle={createInitialTitle}
    />
  );

  const questHubToolbar = useMemo(
    () => (
      <CategoryIndexToolbar
        createLabel="New quest"
        onCreate={handleCreate}
        resultCountLabel={resultCountLabel}
        refineControl={
          <CategoryIndexRefinePopover
            facetDefs={[]}
            refineState={{}}
            children={[]}
            categoryTitle={categoryTitle}
            onRefineChange={() => {}}
            activeCount={
              countActiveQuestHubRefine(statusFilters, typeFilters, showStatusRefine) +
                (searchQuery.trim() ? 1 : 0) || undefined
            }
            onResetRefine={() => {
              setStatusFilters({ ...DEFAULT_QUEST_HUB_STATUS_FILTERS });
              setTypeFilters({ ...DEFAULT_QUEST_HUB_TYPE_FILTERS });
              setSearchQuery('');
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Filter quests…"
            customBody={
              <QuestHubFilters
                statusFilters={statusFilters}
                typeFilters={typeFilters}
                onStatusFiltersChange={setStatusFilters}
                onTypeFiltersChange={setTypeFilters}
                showStatusFilters={showStatusRefine}
              />
            }
          />
        }
        viewControl={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-elevated/50 p-1">
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm ${
                viewMode === 'list'
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <List className="size-4" />
              List
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('board')}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm ${
                viewMode === 'board'
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <LayoutGrid className="size-4" />
              Board
            </button>
          </div>
        }
        trailing={
          isDMUser && !embedded ? (
            <button
              type="button"
              onClick={() => setPlayerPreviewLocal((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                playerPreview
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {playerPreview ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
              Player preview
            </button>
          ) : null
        }
      />
    ),
    [
      categoryTitle,
      embedded,
      handleCreate,
      isDMUser,
      playerPreview,
      resultCountLabel,
      searchQuery,
      showStatusRefine,
      statusFilters,
      typeFilters,
      viewMode,
    ],
  );

  const toolbar =
    embedded && onHeaderToolbarChange
      ? questHubToolbar
      : totalQuestCount > 0
        ? questHubToolbar
        : null;

  const hoistToolbar = embedded && onHeaderToolbarChange != null;

  useEffect(() => {
    if (!hoistToolbar || !onHeaderToolbarChange) return;
    if (loading) {
      onHeaderToolbarChange(null);
      return;
    }
    onHeaderToolbarChange(questHubToolbar);
    return () => onHeaderToolbarChange(null);
  }, [hoistToolbar, onHeaderToolbarChange, loading, questHubToolbar]);

  if (loading) {
    return <LoadingSpinner label={embedded ? 'Loading quests…' : 'Loading Adventure…'} />;
  }

  const refineChips =
    totalQuestCount > 0 && questRefineChips.length > 0 ? (
      <CategoryIndexActiveRefineChips
        chips={questRefineChips}
        onRemove={(facetId) => handleRemoveQuestChip(facetId)}
      />
    ) : null;

  if (embedded) {
    return (
      <>
        {!hoistToolbar ? toolbar : null}
        {refineChips}
        {workspace}
        {createModal}
      </>
    );
  }

  return (
    <>
      <CategoryHubShell
        breadcrumbs={
          <WikiPageBreadcrumbs
            crumbs={indexBreadcrumbs}
            campaignHandle={campaignHandle}
          />
        }
        breadcrumbCrumbs={indexBreadcrumbs}
        title={
          <>
            <ScrollText className="size-6 text-primary" strokeWidth={1.25} />
            {categoryTitle}
          </>
        }
        actions={toolbar}
        activeFilters={refineChips}
      >
      {workspace}
      </CategoryHubShell>

      {createModal}
    </>
  );
}
