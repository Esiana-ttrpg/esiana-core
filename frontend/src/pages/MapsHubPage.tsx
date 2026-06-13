import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import {
  TYPE_DISPLAY_CLASS,
  TYPE_PROSE_CLASS,
} from '@/lib/surfaceLayout';
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
  const breadcrumbs = buildWikiBreadcrumbs(parentChain, {
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

  const resultCountLabel = useMemo(() => {
    if (discoverySummary && !canManage) {
      const total =
        discoverySummary.discoveredCount + discoverySummary.undiscoveredCount;
      return `Showing ${discoverySummary.discoveredCount} of ${total} maps`;
    }
    if (filteredMaps.length === maps.length && !searchQuery.trim()) {
      return null;
    }
    return `Showing ${filteredMaps.length} of ${maps.length}`;
  }, [discoverySummary, canManage, filteredMaps.length, maps.length, searchQuery]);

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

  const cardSize: MapCardSize = 'expanded';
  const gridClass =
    'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  const uploadControl = canManage ? (
    <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50">
      <Plus className="size-4" />
      {uploading ? 'Uploading…' : 'Upload map'}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={uploading}
        onChange={onUpload}
      />
    </label>
  ) : null;

  return (
    <WikiWorkspaceShell
      composition="studio"
      header={
        <div className="mb-4 border-b border-border/40 pb-4">
          <WikiPageBreadcrumbs crumbs={breadcrumbs} campaignHandle={campaignHandle} />
          {maps.length > 0 ? (
            <div className="mt-4">
              <CategoryIndexToolbar
                createLabel="Upload map"
                onCreate={() => {}}
                createAction={canManage ? uploadControl : null}
                searchValue={searchQuery}
                searchPlaceholder="Search maps…"
                onSearchChange={setSearchQuery}
                resultCountLabel={resultCountLabel}
                refineControl={null}
                viewMode={viewMode}
                onViewModeChange={(mode) =>
                  setViewMode(mode as MapsBrowseViewMode)
                }
              />
            </div>
          ) : null}
          {maps.length === 0 && canManage ? (
            <div className="mt-4">{uploadControl}</div>
          ) : null}
        </div>
      }
    >
      <div>
        <h1
          className={`${TYPE_DISPLAY_CLASS} flex items-center gap-2 text-2xl text-focal-foreground sm:text-3xl`}
        >
          <Map className="size-7 text-primary" strokeWidth={1.25} />
          Maps
        </h1>
        <p className={`${TYPE_PROSE_CLASS} mt-2 text-sm text-focal-muted`}>
          Campaign cartography — upload, link to locations, nest detail maps,
          and place pins.
        </p>
      </div>

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
      ) : maps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <Map className="mx-auto mb-3 size-10 text-muted" />
          <p className="text-muted">No maps uploaded yet.</p>
          {canManage ? (
            <p className="mt-2 text-sm text-muted">
              Upload a PNG, JPEG, or WebP to get started.
            </p>
          ) : null}
        </div>
      ) : filteredMaps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
          <p className="text-muted">No maps match your search.</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
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
    </WikiWorkspaceShell>
  );
}
