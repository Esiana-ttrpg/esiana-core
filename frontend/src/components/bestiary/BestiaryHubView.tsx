import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PanelRight, Skull } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignCategoryChildPath,
  readCampaignHandle,
} from '@/lib/campaignPaths';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  fetchCategoryIndex,
  resolveWikiParentChain,
  type CategoryIndexChild,
} from '@/lib/wiki';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { createItemLabel } from '@/lib/wikiLabels';
import type { WikiTreeNode } from '@/types/wiki';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreatePageModal } from '@/components/CreatePageModal';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';
import { CategoryIndexActiveRefineChips } from '@/components/wiki/indexBrowse/CategoryIndexActiveRefineChips';
import { CategoryIndexEmptyStatePanel } from '@/components/wiki/indexBrowse/CategoryIndexEmptyStatePanel';
import {
  clearRefineChip,
  createDefaultRefineState,
  findSimilarCategoryIndexEntries,
  formatCategoryIndexResultCount,
  getCategoryIndexFacetDefs,
  getCategoryIndexSearchPlaceholder,
  hasActiveCategoryIndexRefine,
  listActiveRefineChips,
  mergeRefineStateWithNewOptions,
  projectCategoryIndexBrowseChildren,
  resetCategoryIndexRefine,
  type CategoryIndexRefineState,
} from '@/lib/categoryIndexBrowse';
import {
  readCategoryIndexBrowseSnapshot,
  writeCategoryIndexBrowseSnapshot,
  type CategoryIndexViewMode,
} from '@/lib/categoryIndexBrowseStorage';
import { CampaignMemberRoles } from '@/types/domain';
import {
  getCategoryAllowedViews,
  getCategoryDefaultView,
} from '@/lib/categoryBrowseRegistry';
import { resolveCategoryIndexEmptyVariant } from '@/lib/categoryIndexEmptyState';
import { CategoryIndexDiscoveryBanner } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';
import type { CategoryDiscoverySummary } from '@/lib/wiki';
import {
  filterOnlyCatalogued,
  pickRecentSightings,
} from '@/lib/bestiaryBrowseProjection';
import {
  groupCreatures,
  type BestiaryGroupMode,
} from '@/lib/bestiaryHubGrouping';
import { BestiaryHabitatSection } from './BestiaryHabitatSection';
import { BestiaryRecentSightingsBand } from './BestiaryRecentSightingsBand';
import { BestiaryHubContextRail } from './BestiaryHubContextRail';
import { BestiaryBrowseModeToggle } from './BestiaryBrowseModeToggle';
import { BestiaryHubTableView } from './BestiaryHubTableView';
import { loadBestiaryHubRailWidth } from '@/lib/bestiaryHubRailWidthPreference';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

function readLargeScreenDefault(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(min-width: 1024px)').matches;
}

function contextRailToggleClass(active: boolean): string {
  return [
    'inline-flex items-center justify-center rounded-lg border p-2 transition-colors',
    active
      ? 'border-primary/40 bg-primary/15 text-primary'
      : 'border-border bg-elevated/50 text-muted hover:text-foreground',
  ].join(' ');
}

interface BestiaryHubViewProps {
  categoryPageId: string;
  campaignHandle: string;
}

export function BestiaryHubView({
  categoryPageId,
  campaignHandle,
}: BestiaryHubViewProps) {
  const params = useParams<{ campaignHandle?: string }>();
  const { campaignHandle: wikiCampaignSlug, flatPages, refresh, campaign } =
    useWiki();
  const resolvedSlug = readCampaignHandle(params) || wikiCampaignSlug || campaignHandle;
  const navigate = useNavigate();

  const [children, setChildren] = useState<CategoryIndexChild[]>([]);
  const [discoverySummary, setDiscoverySummary] =
    useState<CategoryDiscoverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialTitle, setCreateInitialTitle] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refineState, setRefineState] = useState<CategoryIndexRefineState>({});
  const [viewMode, setViewMode] = useState<CategoryIndexViewMode>(() =>
    getCategoryDefaultView('Bestiary'),
  );
  const [browseHydrated, setBrowseHydrated] = useState(false);
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(
    null,
  );
  const [railOpen, setRailOpen] = useState(readLargeScreenDefault);
  const [isLargeScreen, setIsLargeScreen] = useState(readLargeScreenDefault);
  const [railWidth, setRailWidth] = useState(loadBestiaryHubRailWidth);
  const [groupMode, setGroupMode] = useState<BestiaryGroupMode>('habitat');
  const [onlyCatalogued, setOnlyCatalogued] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLargeScreen(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const categoryTitle = 'Bestiary';
  const itemLabel = createItemLabel(categoryTitle);
  const allowedViews = getCategoryAllowedViews(categoryTitle);

  const isDMUser =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const facetDefs = useMemo(
    () => getCategoryIndexFacetDefs(categoryTitle, isDMUser),
    [isDMUser],
  );

  const pageById = useMemo(
    () => buildWikiPageLookup(flatPages),
    [flatPages],
  );

  const parentChain = resolveWikiParentChain(categoryPageId, null, pageById);
  const indexBreadcrumbs = buildWikiBreadcrumbs(parentChain, {
    id: categoryPageId,
    title: categoryTitle,
  });

  const loadIndex = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategoryIndex(resolvedSlug, categoryPageId);
      setChildren(data.children ?? []);
      setDiscoverySummary(data.discoverySummary ?? null);
      setSelectedCreatureId((prev) => {
        if (prev && data.children?.some((c) => c.id === prev)) return prev;
        return data.children?.[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bestiary');
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedSlug, categoryPageId]);

  useEffect(() => {
    void loadIndex();
  }, [loadIndex]);

  useEffect(() => {
    const snapshot = readCategoryIndexBrowseSnapshot(
      resolvedSlug,
      categoryPageId,
    );
    if (snapshot?.searchQuery !== undefined) {
      setSearchQuery(snapshot.searchQuery);
    }
    if (snapshot?.refineState) {
      setRefineState(snapshot.refineState);
    }
    if (snapshot?.viewMode) {
      const normalized =
        snapshot.viewMode === 'hierarchy' ? 'card' : snapshot.viewMode;
      if (allowedViews.includes(normalized)) {
        setViewMode(normalized);
      }
    }
    setBrowseHydrated(true);
  }, [resolvedSlug, categoryPageId, allowedViews]);

  useEffect(() => {
    if (!browseHydrated) return;
    writeCategoryIndexBrowseSnapshot(resolvedSlug, categoryPageId, {
      searchQuery,
      refineState,
      viewMode,
    });
  }, [
    browseHydrated,
    resolvedSlug,
    categoryPageId,
    searchQuery,
    refineState,
    viewMode,
  ]);

  useEffect(() => {
    if (children.length === 0 || facetDefs.length === 0) return;
    setRefineState((prev) => {
      const hasKeys = Object.keys(prev).length > 0;
      if (!hasKeys) {
        return createDefaultRefineState(facetDefs, children, categoryTitle);
      }
      return mergeRefineStateWithNewOptions(
        prev,
        facetDefs,
        children,
        categoryTitle,
      );
    });
  }, [children, facetDefs, categoryTitle]);

  const hasActiveRefine = useMemo(
    () =>
      hasActiveCategoryIndexRefine(
        refineState,
        facetDefs,
        children,
        categoryTitle,
      ),
    [refineState, facetDefs, children, categoryTitle],
  );

  const filteredChildren = useMemo(() => {
    const projected = projectCategoryIndexBrowseChildren(children, {
      searchQuery,
      refineState,
      facetDefs,
      categoryTitle,
    });
    return filterOnlyCatalogued(projected, onlyCatalogued, isDMUser);
  }, [
    children,
    searchQuery,
    refineState,
    facetDefs,
    onlyCatalogued,
    isDMUser,
  ]);

  const sections = useMemo(
    () => groupCreatures(filteredChildren, groupMode, isDMUser),
    [filteredChildren, groupMode, isDMUser],
  );

  const recentSightings = useMemo(
    () => pickRecentSightings(filteredChildren, isDMUser),
    [filteredChildren, isDMUser],
  );

  const flatOrderedIds = useMemo(
    () => sections.flatMap((s) => s.entries.map((e) => e.id)),
    [sections],
  );

  const snapshots = useMemo((): WikiPageLineageSnapshot[] => {
    return children.map((child) => ({
      id: child.id,
      title: child.title,
      templateType: 'DEFAULT',
      metadata: child.metadata,
    }));
  }, [children]);

  const activeRefineChips = useMemo(
    () =>
      listActiveRefineChips(
        refineState,
        facetDefs,
        children,
        categoryTitle,
      ),
    [refineState, facetDefs, children, categoryTitle],
  );

  const resultCountLabel = formatCategoryIndexResultCount(
    children.length,
    filteredChildren.length,
    categoryTitle,
    searchQuery,
    hasActiveRefine || onlyCatalogued,
  );

  const emptyVariant = resolveCategoryIndexEmptyVariant({
    totalCount: children.length,
    filteredCount: filteredChildren.length,
    searchQuery,
    hasActiveRefine: hasActiveRefine || onlyCatalogued,
    canCreate: true,
  });

  const similarEntries = useMemo(() => {
    if (
      emptyVariant !== 'search_miss' &&
      emptyVariant !== 'search_miss_no_create'
    ) {
      return [];
    }
    return findSimilarCategoryIndexEntries(children, searchQuery);
  }, [emptyVariant, children, searchQuery]);

  function handleOpenCreature(creatureId: string) {
    navigate(
      campaignCategoryChildPath(resolvedSlug, creatureId, categoryTitle, flatPages),
    );
  }

  function handleCreate() {
    setCreateInitialTitle(null);
    setIsCreateOpen(true);
  }

  function handleCreateFromSearch(title: string) {
    setCreateInitialTitle(title);
    setIsCreateOpen(true);
  }

  async function handlePageCreated(page: WikiTreeNode) {
    setIsCreateOpen(false);
    setCreateInitialTitle(null);
    await refresh();
    await loadIndex();
    navigate(campaignCategoryChildPath(resolvedSlug, page.id, categoryTitle, flatPages));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }
      if (flatOrderedIds.length === 0) return;

      event.preventDefault();
      const currentIdx = selectedCreatureId
        ? flatOrderedIds.indexOf(selectedCreatureId)
        : -1;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIdx = Math.max(
        0,
        Math.min(flatOrderedIds.length - 1, currentIdx + delta),
      );
      setSelectedCreatureId(flatOrderedIds[nextIdx] ?? null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flatOrderedIds, selectedCreatureId]);

  if (loading) {
    return <LoadingSpinner label="Loading Bestiary…" />;
  }

  const showInlineRail = railOpen && isLargeScreen;
  const narrativeLayoutStyle = showInlineRail
    ? ({
        '--bestiary-hub-rail-width': `${railWidth}px`,
        gridTemplateColumns: `minmax(0, 1fr) ${railWidth}px`,
      } as CSSProperties)
    : undefined;

  const railContentProps = {
    campaignHandle: resolvedSlug,
    children: filteredChildren,
    selectedCreatureId,
    snapshots,
    isDMUser,
  };

  return (
    <>
      <CategoryHubShell
        composition="codex"
        inlineContextual={showInlineRail}
        narrativeLayoutClassName={
          showInlineRail ? 'narrative-layout--bestiary-hub-inline' : ''
        }
        narrativeLayoutStyle={narrativeLayoutStyle}
        catalogGridClass="space-y-8"
        breadcrumbs={
          <WikiPageBreadcrumbs
            crumbs={indexBreadcrumbs}
            campaignHandle={resolvedSlug}
          />
        }
        title={
          <>
            <Skull className="size-6 text-primary" strokeWidth={1.25} />
            Hunter Catalog
          </>
        }
        toolbar={
          <CategoryIndexToolbar
            createLabel={`Catalog ${itemLabel}`}
            onCreate={handleCreate}
            searchValue={searchQuery}
            searchPlaceholder={getCategoryIndexSearchPlaceholder(categoryTitle)}
            onSearchChange={setSearchQuery}
            resultCountLabel={children.length > 0 ? resultCountLabel : null}
            refineControl={
              facetDefs.length > 0 ? (
                <CategoryIndexRefinePopover
                  facetDefs={facetDefs}
                  refineState={refineState}
                  children={children}
                  categoryTitle={categoryTitle}
                  onRefineChange={setRefineState}
                />
              ) : null
            }
            trailing={
              <>
                <BestiaryBrowseModeToggle
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
                <button
                  type="button"
                  onClick={() => setRailOpen((prev) => !prev)}
                  aria-pressed={railOpen}
                  title={railOpen ? 'Close field intel' : 'Open field intel'}
                  className={contextRailToggleClass(railOpen)}
                >
                  <PanelRight className="size-4" />
                  <span className="sr-only">Field intel</span>
                </button>
              </>
            }
          />
        }
        afterToolbar={
          children.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-elevated/50 p-1">
                  <button
                    type="button"
                    onClick={() => setGroupMode('habitat')}
                    className={`rounded px-2.5 py-1 text-xs transition-colors ${
                      groupMode === 'habitat'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                    aria-pressed={groupMode === 'habitat'}
                  >
                    Group by Habitat
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode('type')}
                    className={`rounded px-2.5 py-1 text-xs transition-colors ${
                      groupMode === 'type'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                    aria-pressed={groupMode === 'type'}
                  >
                    Group by Type
                  </button>
                </div>
                {!isDMUser ? (
                  <button
                    type="button"
                    onClick={() => setOnlyCatalogued((prev) => !prev)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      onlyCatalogued
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-border text-muted hover:text-foreground'
                    }`}
                    aria-pressed={onlyCatalogued}
                  >
                    Only catalogued
                  </button>
                ) : null}
              </div>
              <CategoryIndexActiveRefineChips
                chips={activeRefineChips}
                onRemove={(facetId, optionValue) =>
                  setRefineState((prev) =>
                    clearRefineChip(prev, facetId, optionValue),
                  )
                }
              />
            </div>
          ) : null
        }
        contextual={
          railOpen ? (
            <div className="hidden min-h-0 lg:block">
              <BestiaryHubContextRail
                layout="inline"
                open
                onWidthChange={setRailWidth}
                {...railContentProps}
              />
            </div>
          ) : null
        }
      >
        {error ? (
          <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {discoverySummary && discoverySummary.undiscoveredCount > 0 ? (
          <div className="mb-4">
            <CategoryIndexDiscoveryBanner
              undiscoveredCount={discoverySummary.undiscoveredCount}
              discoveredCount={discoverySummary.discoveredCount}
              itemLabel={itemLabel.toLowerCase()}
            />
          </div>
        ) : null}

        {emptyVariant !== null ? (
          <CategoryIndexEmptyStatePanel
            totalCount={children.length}
            filteredCount={filteredChildren.length}
            searchQuery={searchQuery}
            hasActiveRefine={hasActiveRefine || onlyCatalogued}
            canCreate
            categoryTitle={categoryTitle}
            itemLabel={itemLabel}
            campaignHandle={resolvedSlug}
            similarEntries={similarEntries}
            onCreate={handleCreate}
            onCreateFromSearch={handleCreateFromSearch}
            onClearSearch={() => setSearchQuery('')}
            onResetRefine={() => {
              setOnlyCatalogued(false);
              setRefineState(
                resetCategoryIndexRefine(facetDefs, children, categoryTitle),
              );
            }}
          />
        ) : viewMode === 'table' ? (
          <BestiaryHubTableView
            sections={sections}
            categoryPageId={categoryPageId}
            campaignHandle={resolvedSlug}
            pageById={pageById}
            selectedCreatureId={selectedCreatureId}
            onSelectCreature={setSelectedCreatureId}
            onOpenCreature={handleOpenCreature}
          />
        ) : (
          <>
            <BestiaryRecentSightingsBand
              entries={recentSightings}
              selectedCreatureId={selectedCreatureId}
              onSelectCreature={setSelectedCreatureId}
              onOpenCreature={handleOpenCreature}
            />
            {sections.map((section) => (
              <BestiaryHabitatSection
                key={section.label}
                section={section}
                selectedCreatureId={selectedCreatureId}
                onSelectCreature={setSelectedCreatureId}
                onOpenCreature={handleOpenCreature}
              />
            ))}
          </>
        )}
      </CategoryHubShell>

      {railOpen && !isLargeScreen ? (
        <BestiaryHubContextRail
          layout="overlay"
          open
          onClose={() => setRailOpen(false)}
          onWidthChange={setRailWidth}
          {...railContentProps}
        />
      ) : null}

      <CreatePageModal
        open={isCreateOpen}
        campaignHandle={resolvedSlug}
        parentId={categoryPageId}
        categoryTitle={categoryTitle}
        flatPages={flatPages}
        initialTitle={createInitialTitle}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateInitialTitle(null);
        }}
        onCreated={handlePageCreated}
      />
    </>
  );
}
