import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, Plus } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { fetchCampaign } from '@/lib/campaigns';
import { CampaignMemberRoles } from '@/types/domain';
import {
  deleteCampaignMap,
  fetchCampaignMaps,
  uploadCampaignMap,
} from '@/lib/maps';
import type { CampaignMapAsset } from '@/types/maps';
import { mapDisplayTitle } from '@/types/maps';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CategoryIndexDiscoveryBanner } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';
import type { CategoryDiscoverySummary } from '@/lib/wiki';
import { MapCard, type MapCardSize } from '@/components/maps/MapCard';
import { MapHubTable } from '@/components/maps/MapHubTable';
import { MapDeleteDialog } from '@/components/maps/MapDeleteDialog';
import { MapsHierarchyView } from '@/components/maps/MapsHierarchyView';
import {
  buildWikiBreadcrumbs,
  resolveWikiParentChain,
  buildWikiPageLookup,
} from '@/lib/wiki';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';
import { CategoryIndexEmptyStatePanel } from '@/components/wiki/indexBrowse/CategoryIndexEmptyStatePanel';
import { WORKSPACE_CREATE_BUTTON_CLASS } from '@/components/layout/WorkspaceActionBar';
import {
  formatWorkspaceHubCountHint,
  resolveCategoryCountNouns,
} from '@/lib/workspaceHeaderPolicy';
import { resolveCategoryIndexEmptyVariant } from '@/lib/categoryIndexEmptyState';
import {
  filterMapsBySearch,
  type MapsBrowseViewMode,
} from '@/lib/mapsBrowse';
import {
  readMapsHubBrowseSnapshot,
  readStoredMapsHubViewModeFromLegacy,
  writeMapsHubBrowseSnapshot,
} from '@/lib/categoryIndexBrowseStorage';

interface MapsHubPageProps {
  campaignHandle: string;
  categoryPageId: string;
}

export function MapsHubPage({ campaignHandle, categoryPageId }: MapsHubPageProps) {
  const { flatPages } = useWiki();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [maps, setMaps] = useState<CampaignMapAsset[]>([]);
  const [discoverySummary, setDiscoverySummary] =
    useState<CategoryDiscoverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<MapsBrowseViewMode>('hierarchy');
  const [browseHydrated, setBrowseHydrated] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CampaignMapAsset | null>(null);

  const pageById = buildWikiPageLookup(flatPages);
  const parentChain = resolveWikiParentChain(categoryPageId, null, pageById);
  const indexBreadcrumbs = buildWikiBreadcrumbs(parentChain, {
    id: categoryPageId,
    title: 'Maps',
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mapsPayload, campaign] = await Promise.all([
        fetchCampaignMaps(campaignHandle),
        fetchCampaign(campaignHandle),
      ]);
      setMaps(mapsPayload.maps);
      setDiscoverySummary(mapsPayload.discoverySummary ?? null);
      setCanManage(
        campaign.role === CampaignMemberRoles.GAMEMASTER ||
          campaign.role === CampaignMemberRoles.WRITER,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load maps');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!campaignHandle || !categoryPageId || browseHydrated) return;
    const snapshot = readMapsHubBrowseSnapshot(campaignHandle, categoryPageId);
    if (snapshot?.searchQuery !== undefined) {
      setSearchQuery(snapshot.searchQuery);
    }
    if (snapshot?.viewMode) {
      setViewMode(snapshot.viewMode);
    } else {
      const legacy = readStoredMapsHubViewModeFromLegacy();
      if (legacy) setViewMode(legacy);
    }
    setBrowseHydrated(true);
  }, [campaignHandle, categoryPageId, browseHydrated]);

  useEffect(() => {
    if (!browseHydrated) return;
    writeMapsHubBrowseSnapshot(campaignHandle, categoryPageId, {
      searchQuery,
      viewMode,
    });
  }, [browseHydrated, campaignHandle, categoryPageId, searchQuery, viewMode]);

  const filteredMaps = useMemo(
    () => filterMapsBySearch(maps, searchQuery),
    [maps, searchQuery],
  );

  const hasActiveSearch = searchQuery.trim().length > 0;
  const countNouns = resolveCategoryCountNouns('Maps');

  const resultCountLabel = useMemo(() => {
    if (discoverySummary && !canManage) {
      const total =
        discoverySummary.discoveredCount + discoverySummary.undiscoveredCount;
      return `Showing ${discoverySummary.discoveredCount} of ${total} maps`;
    }
    return formatWorkspaceHubCountHint({
      total: maps.length,
      matching: filteredMaps.length,
      singular: countNouns.singular,
      plural: countNouns.plural,
      searchQuery,
      hasActiveRefine: hasActiveSearch,
    });
  }, [
    discoverySummary,
    canManage,
    maps.length,
    filteredMaps.length,
    searchQuery,
    hasActiveSearch,
    countNouns,
  ]);

  const emptyVariant = resolveCategoryIndexEmptyVariant({
    totalCount: maps.length,
    filteredCount: filteredMaps.length,
    searchQuery,
    hasActiveRefine: false,
    canCreate: canManage,
  });

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadCampaignMap(campaignHandle, file);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const uploadControl = canManage ? (
    <>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={uploading}
        onChange={onUpload}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => uploadInputRef.current?.click()}
        className={WORKSPACE_CREATE_BUTTON_CLASS}
      >
        <Plus className="size-4" />
        {uploading ? 'Uploading…' : 'Upload map'}
      </button>
    </>
  ) : null;

  const cardSize: MapCardSize = 'expanded';
  const gridClass =
    'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <CategoryHubShell
      composition="studio"
      catalogGridClass="space-y-6"
      breadcrumbs={
        <WikiPageBreadcrumbs
          crumbs={indexBreadcrumbs}
          campaignHandle={campaignHandle}
        />
      }
      breadcrumbCrumbs={indexBreadcrumbs}
      title={
        <>
          <Map className="size-6 text-primary" strokeWidth={1.25} />
          Maps
        </>
      }
      actions={
        <CategoryIndexToolbar
          createLabel="Upload map"
          onCreate={() => uploadInputRef.current?.click()}
          createAction={canManage ? uploadControl : null}
          resultCountLabel={resultCountLabel}
          refineControl={
            <CategoryIndexRefinePopover
              facetDefs={[]}
              refineState={{}}
              children={[]}
              categoryTitle="Maps"
              onRefineChange={() => {}}
              customBody={<div />}
              activeCount={hasActiveSearch ? 1 : undefined}
              onResetRefine={() => setSearchQuery('')}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search maps…"
            />
          }
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode as MapsBrowseViewMode)}
        />
      }
    >
      {error ? (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {discoverySummary && discoverySummary.undiscoveredCount > 0 ? (
        <CategoryIndexDiscoveryBanner
          undiscoveredCount={discoverySummary.undiscoveredCount}
          discoveredCount={discoverySummary.discoveredCount}
          itemLabel="maps"
        />
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : emptyVariant ? (
        <CategoryIndexEmptyStatePanel
          categoryTitle="Maps"
          itemLabel="Map"
          campaignHandle={campaignHandle}
          similarEntries={[]}
          totalCount={maps.length}
          filteredCount={filteredMaps.length}
          searchQuery={searchQuery}
          hasActiveRefine={false}
          canCreate={canManage}
          onCreate={() => uploadInputRef.current?.click()}
          onCreateFromSearch={() => {}}
          onClearSearch={() => setSearchQuery('')}
          onResetRefine={() => setSearchQuery('')}
          headerCreateLabel="Upload map"
          icon={<Map className="mx-auto mb-3 size-10 text-muted" />}
        />
      ) : viewMode === 'table' ? (
        <MapHubTable
          maps={filteredMaps}
          campaignHandle={campaignHandle}
          canManage={canManage}
          onDelete={setDeleteTarget}
        />
      ) : viewMode === 'hierarchy' ? (
        <MapsHierarchyView
          filteredMaps={filteredMaps}
          allMaps={maps}
          campaignHandle={campaignHandle}
          categoryPageId={categoryPageId}
          canManage={canManage}
        />
      ) : (
        <div className={gridClass}>
          {filteredMaps.map((map) => (
            <MapCard
              key={map.id}
              map={map}
              campaignHandle={campaignHandle}
              canManage={canManage}
              cardSize={cardSize}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <MapDeleteDialog
        open={Boolean(deleteTarget)}
        mapTitle={deleteTarget ? mapDisplayTitle(deleteTarget) : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteCampaignMap(campaignHandle, deleteTarget.id);
          setDeleteTarget(null);
          await reload();
        }}
      />
    </CategoryHubShell>
  );
}
