import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignCategoryChildPath,
  readCampaignHandle,
} from '@/lib/campaignPaths';
import { FileText, FolderOpen } from 'lucide-react';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  fetchCategoryIndex,
  formatIndexLocationTrail,
  resolveWikiParentChain,
  type CategoryIndexChild,
} from '@/lib/wiki';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { createItemLabel } from '@/lib/wikiLabels';
import type { WikiTreeNode } from '@/types/wiki';
import {
  getDisplayMetadata,
} from '@/lib/wikiMetadata';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreatePageModal } from '@/components/CreatePageModal';
import { IndexGridView } from '@/components/IndexGridView';
import { LocationTrailChips } from '@/components/wiki/LocationTrailChips';
import { CodexHierarchyView } from '@/components/wiki/indexBrowse/CodexHierarchyView';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';
import { CategoryIndexActiveRefineChips } from '@/components/wiki/indexBrowse/CategoryIndexActiveRefineChips';
import { CategoryIndexEmptyStatePanel } from '@/components/wiki/indexBrowse/CategoryIndexEmptyStatePanel';
import {
  clearRefineChip,
  createDefaultRefineState,
  projectCategoryIndexBrowseChildren,
  findSimilarCategoryIndexEntries,
  getCategoryIndexFacetDefs,
  getCategoryIndexSearchPlaceholder,
  hasActiveCategoryIndexRefine,
  listActiveRefineChips,
  mergeRefineStateWithNewOptions,
  resetCategoryIndexRefine,
  type CategoryIndexRefineState,
} from '@/lib/categoryIndexBrowse';
import {
  formatWorkspaceHubCountHint,
  resolveCategoryCountNouns,
} from '@/lib/workspaceHeaderPolicy';
import {
  readCategoryIndexBrowseSnapshot,
  writeCategoryIndexBrowseSnapshot,
  type CategoryIndexViewMode,
} from '@/lib/categoryIndexBrowseStorage';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { BrowseVisibilityIndicator } from '@/components/narrative/VisibilityTierChip';
import {
  getCategoryDefaultView,
  isEntityCatalogCategory,
} from '@/lib/categoryBrowseRegistry';
import { EntityCatalogTile } from '@/components/wiki/indexBrowse/EntityCatalogTile';
import { resolveCategoryIndexEmptyVariant } from '@/lib/categoryIndexEmptyState';
import { CategoryIndexDiscoveryBanner, DiscoveryStateBadge } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';
import type { CategoryDiscoverySummary } from '@/lib/wiki';

interface WikiIndexViewProps {
  categoryPageId: string;
  categoryTitle: string;
}

/**
 * Codex category browser (card / table / hierarchy).
 *
 * **Projection drift guard:** `searchQuery` and `refineState` are the only
 * browse inputs. All three view modes must render `filteredChildren` from
 * `projectCategoryIndexBrowseChildren` — never re-run search/refine in
 * IndexGridView, CodexHierarchyView, or IndexCardView. Facet definitions
 * and search placeholders are registry-driven via `getCategoryIndexFacetDefs`
 * and `getCategoryIndexSearchPlaceholder` (categoryBrowseRegistry).
 *
 * @see projectCategoryIndexBrowseChildren
 * @see entityBrowserProjection.test.ts
 */
export function EntityBrowserView({
  categoryPageId,
  categoryTitle,
}: WikiIndexViewProps) {
  const { t } = useTranslation();
  const params = useParams<{ campaignHandle?: string }>();
  const { campaignHandle: wikiCampaignSlug, flatPages, refresh, campaign } =
    useWiki();
  const campaignHandle = readCampaignHandle(params) || wikiCampaignSlug;
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
    getCategoryDefaultView(categoryTitle),
  );
  const [browseHydrated, setBrowseHydrated] = useState(false);

  const itemLabel = createItemLabel(categoryTitle);

  const isDMUser = useElevatedNarrativeView();

  const canCreate = true;

  const facetDefs = useMemo(
    () => getCategoryIndexFacetDefs(categoryTitle, isDMUser),
    [categoryTitle, isDMUser],
  );

  const pageById = useMemo(
    () => buildWikiPageLookup(flatPages),
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

  const loadIndex = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategoryIndex(campaignHandle, categoryPageId);
      setChildren(data.children ?? []);
      setDiscoverySummary(data.discoverySummary ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('campaign.characters.loadIndexFailed'),
      );
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, categoryPageId, t]);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  useEffect(() => {
    if (!campaignHandle || !categoryPageId || browseHydrated) return;
    const snapshot = readCategoryIndexBrowseSnapshot(
      campaignHandle,
      categoryPageId,
    );
    if (snapshot?.searchQuery !== undefined) {
      setSearchQuery(snapshot.searchQuery);
    }
    if (snapshot?.viewMode) {
      setViewMode(snapshot.viewMode);
    }
    if (snapshot?.refineState) {
      setRefineState(snapshot.refineState);
    }
    setBrowseHydrated(true);
  }, [campaignHandle, categoryPageId, browseHydrated]);

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

  useEffect(() => {
    if (!browseHydrated || !campaignHandle) return;
    writeCategoryIndexBrowseSnapshot(campaignHandle, categoryPageId, {
      searchQuery,
      refineState,
      viewMode,
    });
  }, [
    browseHydrated,
    campaignHandle,
    categoryPageId,
    searchQuery,
    refineState,
    viewMode,
  ]);

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
    [children, searchQuery, refineState, facetDefs, categoryTitle],
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

  const resultCountLabel = useMemo(() => {
    if (discoverySummary && !isDMUser) {
      const total =
        discoverySummary.discoveredCount + discoverySummary.undiscoveredCount;
      const base = `Showing ${discoverySummary.discoveredCount} of ${total} ${itemLabel.toLowerCase()}`;
      if (searchQuery.trim() || hasActiveRefine) {
        return `${base} · ${filteredChildren.length} match filters`;
      }
      return base;
    }
    return formatWorkspaceHubCountHint({
      total: children.length,
      matching: filteredChildren.length,
      singular: resolveCategoryCountNouns(categoryTitle).singular,
      plural: resolveCategoryCountNouns(categoryTitle).plural,
      searchQuery,
      hasActiveRefine,
    });
  }, [
    discoverySummary,
    isDMUser,
    itemLabel,
    searchQuery,
    hasActiveRefine,
    children.length,
    filteredChildren.length,
    categoryTitle,
  ]);

  const emptyVariant = resolveCategoryIndexEmptyVariant({
    totalCount: children.length,
    filteredCount: filteredChildren.length,
    searchQuery,
    hasActiveRefine,
    canCreate,
  });

  const similarEntries = useMemo(() => {
    if (emptyVariant !== 'search_miss' && emptyVariant !== 'search_miss_no_create') {
      return [];
    }
    return findSimilarCategoryIndexEntries(children, searchQuery);
  }, [children, searchQuery, emptyVariant]);

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
    navigate(campaignCategoryChildPath(campaignHandle, page.id, categoryTitle, flatPages));
  }

  function handleOpenCharacterSettings(pageId: string, focusField?: string) {
    const searchParams = new URLSearchParams();
    searchParams.set('openSettings', '1');
    if (focusField) searchParams.set('focusField', focusField);
    navigate(
      `${campaignCategoryChildPath(campaignHandle, pageId, categoryTitle, flatPages)}?${searchParams.toString()}`,
    );
  }

  if (loading) {
    return (
      <LoadingSpinner
        label={t('campaign.characters.loadingIndex', { title: categoryTitle })}
      />
    );
  }

  return (
    <>
      <CategoryHubShell
        catalogGridClass={
          isEntityCatalogCategory(categoryTitle) && viewMode === 'card'
            ? 'entity-catalog-grid'
            : 'hub-stagger-grid'
        }
        breadcrumbs={
          <WikiPageBreadcrumbs
            crumbs={indexBreadcrumbs}
            campaignHandle={campaignHandle}
          />
        }
        breadcrumbCrumbs={indexBreadcrumbs}
        title={
          <>
            <FolderOpen className="size-6 text-primary" strokeWidth={1.25} />
            {categoryTitle}
          </>
        }
        actions={
          <CategoryIndexToolbar
            createLabel={`Create ${itemLabel}`}
            onCreate={handleCreate}
            resultCountLabel={resultCountLabel}
            refineControl={
              facetDefs.length > 0 ? (
                <CategoryIndexRefinePopover
                  facetDefs={facetDefs}
                  refineState={refineState}
                  children={children}
                  categoryTitle={categoryTitle}
                  onRefineChange={setRefineState}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder={getCategoryIndexSearchPlaceholder(categoryTitle)}
                  onResetRefine={() => {
                    setRefineState(
                      resetCategoryIndexRefine(facetDefs, children, categoryTitle),
                    );
                    setSearchQuery('');
                  }}
                />
              ) : null
            }
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        }
        activeFilters={
          activeRefineChips.length > 0 ? (
            <CategoryIndexActiveRefineChips
              chips={activeRefineChips}
              onRemove={(facetId, optionValue) =>
                setRefineState((prev) => clearRefineChip(prev, facetId, optionValue))
              }
            />
          ) : null
        }
      >
      {error && (
        <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

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
          canCreate={canCreate}
          categoryTitle={categoryTitle}
          itemLabel={itemLabel}
          campaignHandle={campaignHandle}
          similarEntries={similarEntries}
          headerCreateLabel={`Create ${itemLabel}`}
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
        <IndexGridView
          children={filteredChildren}
          categoryPageId={categoryPageId}
          categoryTitle={categoryTitle}
          campaignHandle={campaignHandle}
          pageById={pageById}
          onOpenCharacterSettings={
            categoryTitle === 'Characters' ? handleOpenCharacterSettings : undefined
          }
        />
      ) : viewMode === 'hierarchy' ? (
        <CodexHierarchyView
          filteredChildren={filteredChildren}
          allChildren={children}
          categoryPageId={categoryPageId}
          categoryTitle={categoryTitle}
          campaignHandle={campaignHandle}
        />
      ) : isEntityCatalogCategory(categoryTitle) ? (
        <>
          {filteredChildren.map((child) => (
            <EntityCatalogTile
              key={child.id}
              child={child}
              categoryPageId={categoryPageId}
              categoryTitle={categoryTitle}
              campaignHandle={campaignHandle}
              pageById={pageById}
            />
          ))}
        </>
      ) : (
        <>
          {filteredChildren.map((child) => (
            <IndexCardView
              key={child.id}
              child={child}
              categoryPageId={categoryPageId}
              categoryTitle={categoryTitle}
              campaignHandle={campaignHandle}
              pageById={pageById}
            />
          ))}
        </>
      )}
      </CategoryHubShell>

      <CreatePageModal
        open={isCreateOpen}
        campaignHandle={campaignHandle}
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

interface CardViewProps {
  child: CategoryIndexChild;
  categoryPageId: string;
  categoryTitle: string;
  campaignHandle: string;
  pageById: Map<string, WikiTreeNode>;
}

function IndexCardView({
  child,
  categoryPageId,
  categoryTitle,
  campaignHandle,
  pageById,
}: CardViewProps) {
  const isDMUser = useElevatedNarrativeView();
  const displayMetadata = getDisplayMetadata(child.metadata, categoryTitle);
  const locationTrailLabel =
    child.locationTrailLabel ??
    formatIndexLocationTrail(child, categoryPageId, categoryTitle, pageById);
  const locationAncestors = child.locationAncestors ?? [];

  return (
    <Link
      to={campaignCategoryChildPath(
        campaignHandle,
        child.id,
        categoryTitle,
        Array.from(pageById.values()),
      )}
      className="region-depth-3 group flex flex-col rounded-md p-5 transition-all hover:bg-focal-elevated"
    >
      <FileText className="mb-3 size-6 text-primary/70 group-hover:text-primary" />
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-focal-foreground group-hover:text-primary">
          {child.title}
        </h3>
        <DiscoveryStateBadge discovery={child.discovery} surface="browse" compact />
        <BrowseVisibilityIndicator
          pageVisibility={child.visibility}
          narrativeStatus={child.narrativeStatus?.status ?? null}
          showWhenElevated={isDMUser}
          compact
        />
      </div>
      {(locationAncestors.length > 0 || locationTrailLabel) && (
        <div className="mt-1">
          <LocationTrailChips
            ancestors={locationAncestors}
            trailLabel={locationTrailLabel}
          />
        </div>
      )}

      {displayMetadata.length > 0 && (
        <div className="my-3 space-y-1 border-t border-focal-muted/20 pt-3">
          {displayMetadata.map((field) => (
            <div key={field.key} className="flex gap-2 text-xs">
              <span className="font-medium text-muted">{field.key}:</span>
              <span className="text-foreground">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-auto line-clamp-2 flex-1 text-sm text-muted">
        {child.snippet || 'No preview content yet.'}
      </p>
      <p className="mt-3 text-xs text-muted">
        Updated{' '}
        {new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
        }).format(new Date(child.updatedAt))}
      </p>
    </Link>
  );
}
