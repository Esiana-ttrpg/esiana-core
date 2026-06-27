import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, GitBranch, Network } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  fetchThreadHub,
  resolveWikiParentChain,
} from '@/lib/wiki';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { CreateThreadModal } from '@/components/thread/CreateThreadModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ThreadHubPayload } from '@/types/wiki';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';
import { ThreadHubCard } from '@/components/thread/ThreadHubCard';
import { ThreadHubFiltersPanel } from '@/components/thread/ThreadHubFilters';
import {
  countActiveThreadHubFilters,
  defaultThreadHubFilters,
  groupAuthoredByKind,
  partitionThreadHubNodes,
  threadNodeMatchesFilters,
  type ThreadHubFilterState,
} from '@/lib/threadHubFilters';
import {
  THREAD_KIND_DISPLAY_ORDER,
  THREAD_KIND_GROUP_LABELS,
} from '@/lib/threadMetadata';
import { THREAD_HUB_ZONE_CLASS } from '@/lib/threadVisualTokens';
import { storyViewHref, type ThreadsLensId } from '@/lib/adventureLayout';
import type { StoryFilterState } from '@/lib/workspacePersistence';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { campaignAdventureHubPath } from '@/lib/campaignPaths';

interface ThreadHubViewProps {
  campaignHandle: string;
  categoryPageId: string;
  embedded?: boolean;
  storyFilters?: StoryFilterState;
  threadsLens?: ThreadsLensId;
  onThreadsLensChange?: (lens: ThreadsLensId) => void;
  isDMUser?: boolean;
  playerPreview?: boolean;
  adventureBasePath?: string;
}

export function ThreadHubView({
  campaignHandle,
  categoryPageId,
  embedded = false,
  storyFilters,
  threadsLens = 'all',
  onThreadsLensChange,
  isDMUser: isDMUserProp,
  playerPreview: playerPreviewProp,
  adventureBasePath,
}: ThreadHubViewProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const { flatPages, refresh, campaign } = useWiki();

  const [data, setData] = useState<ThreadHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playerPreviewLocal, setPlayerPreviewLocal] = useState(false);
  const [filters, setFilters] = useState<ThreadHubFilterState>(() =>
    defaultThreadHubFilters(),
  );
  const [collapsedKinds, setCollapsedKinds] = useState<Record<string, boolean>>({});

  const playerPreview = playerPreviewProp ?? playerPreviewLocal;

  const resolvedAdventureBase =
    adventureBasePath ?? campaignAdventureHubPath(campaignHandle);

  useEffect(() => {
    if (embedded && storyFilters?.search !== undefined) {
      setSearchQuery(storyFilters.search);
    }
  }, [embedded, storyFilters?.search]);

  const categoryTitle = data?.category.title ?? 'Narrative Threads';
  const pageById = useMemo(() => buildWikiPageLookup(flatPages), [flatPages]);

  const indexBreadcrumbs = useMemo(() => {
    const parentChain = resolveWikiParentChain(categoryPageId, null, pageById);
    return buildWikiBreadcrumbs(parentChain, {
      id: categoryPageId,
      title: categoryTitle,
    });
  }, [categoryPageId, categoryTitle, pageById]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchThreadHub(campaignHandle, {
        pageId: categoryPageId,
        previewAsPlayer: isDMUser && playerPreview,
      });
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load threads');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, categoryPageId, isDMUser, playerPreview]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.threads.filter((node) => {
      if (!threadNodeMatchesFilters(node, filters, { isDM: isDMUser })) {
        return false;
      }
      if (!q) return true;
      return (
        node.title.toLowerCase().includes(q) ||
        node.snippet.toLowerCase().includes(q) ||
        node.thread.threadKind.includes(q)
      );
    });
  }, [data, filters, isDMUser, searchQuery]);

  const { authored, theories } = useMemo(
    () => partitionThreadHubNodes(filteredNodes),
    [filteredNodes],
  );

  const authoredGroups = useMemo(
    () => groupAuthoredByKind(authored, THREAD_KIND_DISPLAY_ORDER),
    [authored],
  );

  const refineCount = countActiveThreadHubFilters(filters);
  const showLifecycle = isDMUser && !playerPreview && !data?.previewAsPlayer;

  const threadsLensControl =
    embedded && isDMUser && !playerPreview && onThreadsLensChange ? (
      <div className="mb-4 flex gap-1">
        <button
          type="button"
          onClick={() => onThreadsLensChange('all')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            threadsLens === 'all'
              ? 'bg-accent/15 text-accent'
              : 'text-muted hover:bg-elevated/60'
          }`}
        >
          All Threads
        </button>
        <button
          type="button"
          onClick={() => onThreadsLensChange('activity')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            threadsLens === 'activity'
              ? 'bg-accent/15 text-accent'
              : 'text-muted hover:bg-elevated/60'
          }`}
        >
          Recent Activity
        </button>
      </div>
    ) : null;

  if (loading && !data) {
    return <LoadingSpinner label="Loading narrative threads…" />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const listContent = (
    <>
      {threadsLensControl}
      {filteredNodes.length === 0 ? (
        <p className="text-sm text-muted">
          {searchQuery || refineCount > 0
            ? 'No threads match your filters.'
            : 'No narrative threads yet. Create one to track open story pressure.'}
        </p>
      ) : (
        <div className="space-y-8">
          <section className={THREAD_HUB_ZONE_CLASS.authored}>
            {!embedded ? (
              <h2 className={`mb-4 ${META_SECTION_LABEL_CLASS}`}>
                Narrative Threads
              </h2>
            ) : null}
            {authoredGroups.length === 0 ? (
              <p className="text-sm text-muted">No authored threads in this view.</p>
            ) : (
              <div className="space-y-6">
                {authoredGroups.map(({ kind, nodes }) => {
                  const collapsed = collapsedKinds[kind] ?? false;
                  return (
                    <div key={kind}>
                      <button
                        type="button"
                        className="mb-3 flex w-full items-center justify-between text-left META_SECTION_LABEL_CLASS"
                        onClick={() => {
                          setCollapsedKinds((prev) => ({
                            ...prev,
                            [kind]: !prev[kind],
                          }));
                        }}
                      >
                        {THREAD_KIND_GROUP_LABELS[kind]}
                        <span>{collapsed ? 'Show' : 'Hide'}</span>
                      </button>
                      {!collapsed ? (
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {nodes.map((node) => (
                            <li key={node.id}>
                              <ThreadHubCard
                                campaignHandle={campaignHandle}
                                node={node}
                                showLifecycle={showLifecycle}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {theories.length > 0 ? (
            <section className={THREAD_HUB_ZONE_CLASS.theories}>
              <h2 className={`mb-4 ${META_SECTION_LABEL_CLASS} text-cyan-200/90`}>
                Player Theories
              </h2>
              <p className="mb-3 text-xs text-muted">
                Speculative — not authored setup obligations.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {theories.map((node) => (
                  <li key={node.id}>
                    <ThreadHubCard
                      campaignHandle={campaignHandle}
                      node={node}
                      showLifecycle={showLifecycle}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  );

  const toolbar = (
    <CategoryIndexToolbar
      createLabel="New thread"
      onCreate={() => setIsCreateOpen(true)}
      createAction={isDMUser ? undefined : null}
      searchValue={searchQuery}
      searchPlaceholder="Search threads…"
      onSearchChange={setSearchQuery}
      showSearch={!embedded}
      resultCountLabel={
        filteredNodes.length > 0
          ? `${filteredNodes.length} thread${filteredNodes.length === 1 ? '' : 's'}`
          : null
      }
      refineControl={
        <CategoryIndexRefinePopover
          facetDefs={[]}
          refineState={{}}
          children={[]}
          categoryTitle={categoryTitle}
          onRefineChange={() => {}}
          activeCount={refineCount}
          onResetRefine={() => setFilters(defaultThreadHubFilters())}
          customBody={
            <ThreadHubFiltersPanel
              filters={filters}
              isDM={isDMUser}
              onChange={setFilters}
            />
          }
        />
      }
      trailing={
        isDMUser && !embedded ? (
          <div className="flex items-center gap-2">
            {resolvedAdventureBase ? (
              <Link
                to={storyViewHref(resolvedAdventureBase, 'threads')}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
              >
                View in Story
              </Link>
            ) : null}
            {resolvedAdventureBase ? (
              <Link
                to={storyViewHref(resolvedAdventureBase, 'investigation')}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
              >
                <Network className="size-3.5" />
                Investigation
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setPlayerPreviewLocal((value) => !value)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              {playerPreview ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
              {playerPreview ? 'Exit party preview' : 'Preview as party'}
            </button>
          </div>
        ) : null
      }
    />
  );

  const createModal = (
    <CreateThreadModal
      open={isCreateOpen}
      campaignHandle={campaignHandle}
      flatPages={flatPages}
      context={{ launchSurface: 'hub' }}
      onClose={() => setIsCreateOpen(false)}
      onCreated={() => {
        setIsCreateOpen(false);
        void refresh();
        void load();
      }}
    />
  );

  if (embedded) {
    return (
      <>
        {toolbar}
        {refineCount > 0 ? (
          <button
            type="button"
            className="mt-2 text-xs text-muted hover:text-foreground"
            onClick={() => setFilters(defaultThreadHubFilters())}
          >
            Clear filters ({refineCount})
          </button>
        ) : null}
        {listContent}
        {createModal}
      </>
    );
  }

  return (
    <>
      <CategoryHubShell
        breadcrumbs={
          <WikiPageBreadcrumbs crumbs={indexBreadcrumbs} campaignHandle={campaignHandle} />
        }
        title={
          <>
            <GitBranch className="size-6 text-amber-400" strokeWidth={1.25} />
            {categoryTitle}
          </>
        }
        toolbar={toolbar}
        afterToolbar={
          refineCount > 0 ? (
            <button
              type="button"
              className="mt-2 text-xs text-muted hover:text-foreground"
              onClick={() => setFilters(defaultThreadHubFilters())}
            >
              Clear filters ({refineCount})
            </button>
          ) : null
        }
      >
        {listContent}
      </CategoryHubShell>
      {createModal}
    </>
  );
}
