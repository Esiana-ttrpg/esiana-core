import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
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
  groupAncestries,
  type AncestryGroupMode,
} from '@/lib/ancestryHubGrouping';
import { BestiaryBrowseModeToggle } from '@/components/bestiary/BestiaryBrowseModeToggle';
import { AncestryHubSection } from './AncestryHubSection';
import { AncestryHubTableView } from './AncestryHubTableView';

interface AncestryHubViewProps {
  categoryPageId: string;
  campaignHandle: string;
}

export function AncestryHubView({
  categoryPageId,
  campaignHandle,
}: AncestryHubViewProps) {
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
    getCategoryDefaultView('Ancestries'),
  );
  const [browseHydrated, setBrowseHydrated] = useState(false);
  const [selectedAncestryId, setSelectedAncestryId] = useState<string | null>(
    null,
  );
  const [groupMode, setGroupMode] = useState<AncestryGroupMode>('taxonomy');

  const categoryTitle = 'Ancestries';
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

  const titleById = useMemo(
    () => new Map(flatPages.map((page) => [page.id, page.title])),
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
      setSelectedAncestryId((prev) => {
        if (prev && data.children?.some((child) => child.id === prev)) {
          return prev;
        }
        return data.children?.[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ancestries');
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

  const filteredChildren = useMemo(
    () =>
      projectCategoryIndexBrowseChildren(children, {
        searchQuery,
        refineState,
        facetDefs,
        categoryTitle,
      }),
    [children, searchQuery, refineState, facetDefs],
  );

  const effectiveGroupMode: AncestryGroupMode =
    viewMode === 'table' ? 'table' : groupMode;

  const sections = useMemo(
    () => groupAncestries(filteredChildren, effectiveGroupMode, titleById),
    [filteredChildren, effectiveGroupMode, titleById],
  );

  const flatOrderedIds = useMemo(
    () => sections.flatMap((section) => section.entries.map((entry) => entry.id)),
    [sections],
  );

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
    hasActiveRefine,
  );

  const emptyVariant = resolveCategoryIndexEmptyVariant({
    totalCount: children.length,
    filteredCount: filteredChildren.length,
    searchQuery,
    hasActiveRefine,
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

  function handleOpenAncestry(ancestryId: string) {
    navigate(
      campaignCategoryChildPath(resolvedSlug, ancestryId, categoryTitle, flatPages),
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
      const currentIdx = selectedAncestryId
        ? flatOrderedIds.indexOf(selectedAncestryId)
        : -1;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIdx = Math.max(
        0,
        Math.min(flatOrderedIds.length - 1, currentIdx + delta),
      );
      setSelectedAncestryId(flatOrderedIds[nextIdx] ?? null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flatOrderedIds, selectedAncestryId]);

  if (loading) {
    return <LoadingSpinner label="Loading Ancestries…" />;
  }

  const showTaxonomyTree =
    viewMode === 'card' && effectiveGroupMode === 'taxonomy';

  return (
    <>
      <CategoryHubShell
        composition="codex"
        catalogGridClass="space-y-8"
        breadcrumbs={
          <WikiPageBreadcrumbs
            crumbs={indexBreadcrumbs}
            campaignHandle={resolvedSlug}
          />
        }
        title={
          <>
            <Users className="size-6 text-primary" strokeWidth={1.25} />
            Peoples &amp; Lineages
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
              <BestiaryBrowseModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            }
          />
        }
        afterToolbar={
          children.length > 0 && viewMode === 'card' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-elevated/50 p-1">
                  <button
                    type="button"
                    onClick={() => setGroupMode('taxonomy')}
                    className={`rounded px-2.5 py-1 text-xs transition-colors ${
                      groupMode === 'taxonomy'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                    aria-pressed={groupMode === 'taxonomy'}
                  >
                    Taxonomy
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode('homelands')}
                    className={`rounded px-2.5 py-1 text-xs transition-colors ${
                      groupMode === 'homelands'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                    aria-pressed={groupMode === 'homelands'}
                  >
                    Group by Homeland
                  </button>
                </div>
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
          ) : children.length > 0 ? (
            <CategoryIndexActiveRefineChips
              chips={activeRefineChips}
              onRemove={(facetId, optionValue) =>
                setRefineState((prev) =>
                  clearRefineChip(prev, facetId, optionValue),
                )
              }
            />
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
            hasActiveRefine={hasActiveRefine}
            canCreate
            categoryTitle={categoryTitle}
            itemLabel={itemLabel}
            campaignHandle={resolvedSlug}
            similarEntries={similarEntries}
            onCreate={handleCreate}
            onCreateFromSearch={handleCreateFromSearch}
            onClearSearch={() => setSearchQuery('')}
            onResetRefine={() =>
              setRefineState(
                resetCategoryIndexRefine(facetDefs, children, categoryTitle),
              )
            }
          />
        ) : viewMode === 'table' ? (
          <AncestryHubTableView
            sections={sections}
            categoryPageId={categoryPageId}
            campaignHandle={resolvedSlug}
            pageById={pageById}
            selectedAncestryId={selectedAncestryId}
            onSelectAncestry={setSelectedAncestryId}
          />
        ) : (
          sections.map((section) => (
            <AncestryHubSection
              key={section.label || '__all__'}
              section={section}
              flatPages={flatPages}
              pageById={pageById}
              selectedAncestryId={selectedAncestryId}
              showTaxonomyTree={showTaxonomyTree}
              onSelectAncestry={setSelectedAncestryId}
              onOpenAncestry={handleOpenAncestry}
            />
          ))
        )}
      </CategoryHubShell>

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
