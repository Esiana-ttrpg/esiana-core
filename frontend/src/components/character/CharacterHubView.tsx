import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PanelRight, Users } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignCategoryChildPath,
  readCampaignHandle,
} from '@/lib/campaignPaths';
import {
  buildWikiBreadcrumbs,
  buildWikiPageLookup,
  resolveWikiParentChain,
} from '@/lib/wiki';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { createItemLabel } from '@/lib/wikiLabels';
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
  deriveFacetOptions,
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
import { fetchCharacterHub, type CharacterHubPayload } from '@/lib/characterHub';
import {
  enrichCharacterEntries,
  groupCharactersByLocation,
  groupCharactersByPresenceTier,
  resolveSpotlightCharacterId,
} from '@/lib/characterHubGrouping';
import { CharacterPresenceBandSection } from '@/components/character/CharacterPresenceBandSection';
import { CharacterHubTableView } from '@/components/character/CharacterHubTableView';
import { CharacterHubContextRail } from '@/components/character/CharacterHubContextRail';
import { loadCharacterHubRailWidth } from '@/lib/characterHubRailWidthPreference';
import type { WikiTreeNode } from '@/types/wiki';

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

interface CharacterHubViewProps {
  categoryPageId: string;
  campaignHandle: string;
}

export function CharacterHubView({
  categoryPageId,
  campaignHandle,
}: CharacterHubViewProps) {
  const params = useParams<{ campaignHandle?: string }>();
  const { campaignHandle: wikiCampaignSlug, flatPages, refresh, campaign } =
    useWiki();
  const resolvedSlug = readCampaignHandle(params) || wikiCampaignSlug || campaignHandle;
  const navigate = useNavigate();

  const [payload, setPayload] = useState<CharacterHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialTitle, setCreateInitialTitle] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refineState, setRefineState] = useState<CategoryIndexRefineState>({});
  const [viewMode, setViewMode] = useState<CategoryIndexViewMode>(() =>
    getCategoryDefaultView('Characters'),
  );
  const [browseHydrated, setBrowseHydrated] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [railOpen, setRailOpen] = useState(readLargeScreenDefault);
  const [isLargeScreen, setIsLargeScreen] = useState(readLargeScreenDefault);
  const [railWidth, setRailWidth] = useState(loadCharacterHubRailWidth);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLargeScreen(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const categoryTitle = 'Characters';
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

  const loadHub = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCharacterHub(resolvedSlug, categoryPageId);
      setPayload(data);
      setSelectedCharacterId((prev) => prev ?? resolveSpotlightCharacterId(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  }, [resolvedSlug, categoryPageId]);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

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

  const children = payload?.children ?? [];
  const discoverySummary = payload?.discoverySummary ?? null;

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

  const locationGroups = useMemo(() => {
    if (!payload) return [];
    const entries = enrichCharacterEntries(payload, filteredChildren);
    return groupCharactersByLocation(entries, payload.latestSession);
  }, [payload, filteredChildren]);

  const presenceBands = useMemo(() => {
    if (!payload) return [];
    const entries = enrichCharacterEntries(payload, filteredChildren);
    return groupCharactersByPresenceTier(entries, payload.latestSession);
  }, [payload, filteredChildren]);

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
  const similarEntries = useMemo(
    () => {
      if (
        emptyVariant !== 'search_miss' &&
        emptyVariant !== 'search_miss_no_create'
      ) {
        return [];
      }
      return findSimilarCategoryIndexEntries(children, searchQuery);
    },
    [emptyVariant, children, searchQuery],
  );

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
    await loadHub();
    navigate(campaignCategoryChildPath(resolvedSlug, page.id, categoryTitle, flatPages));
  }

  function handleOpenCharacterSettings(pageId: string, focusField?: string) {
    const searchParams = new URLSearchParams();
    searchParams.set('openInspector', '1');
    searchParams.set('openSettings', '1');
    if (focusField) searchParams.set('focusField', focusField);
    navigate(
      `${campaignCategoryChildPath(resolvedSlug, pageId, categoryTitle, flatPages)}?${searchParams.toString()}`,
    );
  }

  function handleLocationFilter(locationTitle: string) {
    const locationFacet = facetDefs.find((facet) => facet.label === 'Location');
    if (!locationFacet) return;
    const options = deriveFacetOptions(children, locationFacet, categoryTitle);
    const nextFacetState = Object.fromEntries(
      options.map((option) => [option, option === locationTitle]),
    );
    setRefineState((prev) => ({
      ...prev,
      [locationFacet.id]: nextFacetState,
    }));
  }

  if (loading) {
    return <LoadingSpinner label="Loading Characters…" />;
  }

  const showInlineRail = railOpen && isLargeScreen;
  const narrativeLayoutStyle = showInlineRail
    ? ({
        '--character-hub-rail-width': `${railWidth}px`,
        gridTemplateColumns: `minmax(0, 1fr) ${railWidth}px`,
      } as CSSProperties)
    : undefined;

  const railContentProps = payload
    ? {
        campaignHandle: resolvedSlug,
        payload,
        selectedCharacterId,
        onLocationFilter: handleLocationFilter,
      }
    : null;

  return (
    <>
      <CategoryHubShell
        composition="codex"
        inlineContextual={showInlineRail}
        narrativeLayoutClassName={
          showInlineRail ? 'narrative-layout--character-hub-inline' : ''
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
            <Users className="size-6 text-primary" strokeWidth={1.25} />
            Campaign Cast
          </>
        }
        toolbar={
          <CategoryIndexToolbar
            createLabel={`Create ${itemLabel}`}
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
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            allowedViews={allowedViews}
            tableViewTitle="Power-user spreadsheet view"
            trailing={
              <button
                type="button"
                onClick={() => setRailOpen((prev) => !prev)}
                aria-pressed={railOpen}
                title={railOpen ? 'Close campaign context' : 'Open campaign context'}
                className={contextRailToggleClass(railOpen)}
              >
                <PanelRight className="size-4" />
                <span className="sr-only">Campaign context</span>
              </button>
            }
          />
        }
        afterToolbar={
          children.length > 0 ? (
            <CategoryIndexActiveRefineChips
              chips={activeRefineChips}
              onRemove={(facetId, optionValue) =>
                setRefineState((prev) => clearRefineChip(prev, facetId, optionValue))
              }
            />
          ) : null
        }
        contextual={
          railContentProps && railOpen ? (
            <div className="hidden min-h-0 lg:block">
              <CharacterHubContextRail
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
          <CharacterHubTableView
            groups={locationGroups}
            categoryPageId={categoryPageId}
            campaignHandle={resolvedSlug}
            pageById={pageById}
            onOpenCharacterSettings={handleOpenCharacterSettings}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
          />
        ) : (
          presenceBands.map((band) => (
            <CharacterPresenceBandSection
              key={band.tier}
              band={band}
              campaignHandle={resolvedSlug}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
            />
          ))
        )}
      </CategoryHubShell>

      {railContentProps && railOpen && !isLargeScreen ? (
        <CharacterHubContextRail
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
