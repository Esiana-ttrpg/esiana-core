import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { fetchCampaignMap, fetchCampaignMaps, resolveMapsHubPath } from '@/lib/maps';
import { fetchTimeTracking, type TimeTrackingBundle } from '@/lib/timeTrackingApi';
import { campaignPath, campaignWikiPath, readCampaignHandle } from '@/lib/campaignPaths';
import { MapCanvas } from '@/components/maps/MapCanvas';
import { MapViewerToolbar } from '@/components/maps/MapViewerToolbar';
import { MapChronologyBar } from '@/components/maps/MapChronologyBar';
import { MapPresentationPresetsPanel } from '@/components/maps/MapPresentationPresetsPanel';
import { MapVisibilityBar } from '@/components/maps/MapVisibilityBar';
import { MapGroupsPanel } from '@/components/maps/MapGroupsPanel';
import { MapDrawRegionLayer } from '@/components/maps/MapDrawRegionLayer';
import { MapDrawPathLayer } from '@/components/maps/MapDrawPathLayer';
import { MapPlaceObjectLayer } from '@/components/maps/MapPlaceObjectLayer';
import { MapSceneObjectEditorSheet } from '@/components/maps/MapSceneObjectEditorSheet';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { fetchCampaign } from '@/lib/campaigns';
import { CampaignMemberRoles } from '@/types/domain';
import { useWiki } from '@/contexts/WikiContext';
import { flattenWikiTree } from '@/lib/wiki';
import { isPageUnderOrganizationsCategory } from '@/lib/questHubLayout';
import { useMapScene } from '@/hooks/useMapScene';
import { useMapRegionDraw } from '@/hooks/useMapRegionDraw';
import { useMapPathDraw } from '@/hooks/useMapPathDraw';
import { VISIBILITY_ZONES_LAYER_NAME } from '@/lib/mapScene';
import type {
  CampaignMapAsset,
  CampaignMapDetail,
  MapBreadcrumbItem,
  MapEditorTool,
  MapSceneObjectDto,
} from '@/types/maps';
import { mapDisplayTitle } from '@/types/maps';

export function MapViewerPage() {
  const params = useParams<{ campaignHandle: string; assetId: string }>();
  const campaignHandle = readCampaignHandle(params);
  const assetId = params.assetId ?? '';
  const navigate = useNavigate();
  const { tree, flatPages } = useWiki();

  const [detail, setDetail] = useState<CampaignMapDetail | null>(null);
  const [campaignMaps, setCampaignMaps] = useState<CampaignMapAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<MapBreadcrumbItem[]>([]);
  const [timeTracking, setTimeTracking] = useState<TimeTrackingBundle | null>(null);
  const [campaignEpochMinute, setCampaignEpochMinute] = useState<string | null>(null);
  const [viewEpochMinute, setViewEpochMinute] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [editorTool, setEditorTool] = useState<MapEditorTool>('select');
  const [editingObject, setEditingObject] = useState<MapSceneObjectDto | null>(null);
  const [mapActionError, setMapActionError] = useState<string | null>(null);
  const [knowledgeFogEnabled, setKnowledgeFogEnabled] = useState(true);

  const wikiPages = useMemo(
    () => flattenWikiTree(tree).map((page) => ({ id: page.id, title: page.title })),
    [tree],
  );

  const scene = useMapScene({
    campaignHandle,
    mapAssetId: assetId,
    canEdit,
    viewEpochMinute,
    campaignEpochMinute,
    ghostMode,
    knowledgeFogEnabled,
  });

  const mapWidth = detail?.map.width ?? 1000;
  const mapHeight = detail?.map.height ?? 1000;

  const defaultLayerId = useMemo(() => {
    const enabled = scene.layers.filter((l) => scene.enabledLayerIds.has(l.id));
    return enabled[0]?.id ?? scene.layers[0]?.id ?? null;
  }, [scene.layers, scene.enabledLayerIds]);

  const defaultLayerName = useMemo(() => {
    if (!defaultLayerId) return null;
    return scene.layers.find((l) => l.id === defaultLayerId)?.name ?? null;
  }, [scene.layers, defaultLayerId]);

  const isVisibilityZoneLayer =
    defaultLayerName?.trim() === VISIBILITY_ZONES_LAYER_NAME;

  const organizationPages = useMemo(
    () =>
      flatPages
        .filter((p) => isPageUnderOrganizationsCategory(p.id, flatPages))
        .map((p) => ({ id: p.id, title: p.title })),
    [flatPages],
  );

  const regionDraw = useMapRegionDraw({
    active: editMode && canEdit && editorTool === 'drawRegion',
    campaignHandle,
    assetId,
    width: mapWidth,
    height: mapHeight,
    defaultLayerId,
    defaultLayerName,
    isVisibilityZone: isVisibilityZoneLayer,
    onPersisted: () => scene.reloadScene(),
    onError: (message) => setMapActionError(message),
  });

  const pathDraw = useMapPathDraw({
    active: editMode && canEdit && editorTool === 'drawPath',
    campaignHandle,
    assetId,
    width: mapWidth,
    height: mapHeight,
    defaultLayerId,
    defaultLayerName,
    onPersisted: () => scene.reloadScene(),
    onError: (message) => setMapActionError(message),
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCampaignMap(campaignHandle, assetId),
      fetchCampaign(campaignHandle),
      fetchCampaignMaps(campaignHandle).then((data) => data.maps),
      fetchTimeTracking(campaignHandle).catch(() => null),
    ])
      .then(([mapDetail, campaign, maps, tracking]) => {
        if (cancelled) return;
        setDetail(mapDetail);
        setCampaignMaps(maps);
        const elevated =
          campaign.role === CampaignMemberRoles.GAMEMASTER ||
          campaign.role === CampaignMemberRoles.WRITER;
        setCanEdit(elevated);
        if (tracking) {
          setTimeTracking(tracking);
          setCampaignEpochMinute(tracking.currentEpochMinute);
        }
        const title = mapDisplayTitle(mapDetail.map);
        setBreadcrumbs((current) => {
          const existingIndex = current.findIndex((item) => item.assetId === assetId);
          if (existingIndex >= 0) return current.slice(0, existingIndex + 1);
          if (current.length === 0) return [{ assetId, title }];
          return [...current, { assetId, title }];
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load map');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, assetId]);

  useEffect(() => {
    if (!editMode) {
      setGhostMode(false);
      setEditorTool('select');
      setEditingObject(null);
    }
  }, [editMode]);

  useEffect(() => {
    if (editorTool !== 'select') {
      setEditingObject(null);
    }
  }, [editorTool]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <MascotErrorPanel
        code={404}
        title="Map unavailable"
        description={error ?? 'This map could not be loaded.'}
      />
    );
  }

  const title = mapDisplayTitle(detail.map);
  const mapsHubPath = resolveMapsHubPath(campaignHandle);

  const showBreadcrumbTrail = breadcrumbs.length > 1;

  const regionDrawOverlay =
    editMode && editorTool === 'drawRegion' ? (
      <MapDrawRegionLayer
        phase={regionDraw.phase}
        spaceHeld={regionDraw.spaceHeld}
        previewLine={regionDraw.previewPositions()}
        closedPreview={regionDraw.closedPreviewPositions()}
        onAddVertex={regionDraw.addVertex}
        onUpdateCursor={regionDraw.updateCursor}
        onClearCursor={regionDraw.clearCursor}
        onDoubleClickFinish={regionDraw.tryFinishOnDoubleClick}
      />
    ) : editMode && editorTool === 'drawPath' ? (
      <MapDrawPathLayer
        phase={pathDraw.phase}
        spaceHeld={pathDraw.spaceHeld}
        previewLine={pathDraw.previewPositions()}
        onAddVertex={pathDraw.addVertex}
        onUpdateCursor={pathDraw.updateCursor}
        onClearCursor={pathDraw.clearCursor}
        onDoubleClickFinish={pathDraw.tryFinishOnDoubleClick}
      />
    ) : editMode && editorTool === 'placeLabel' ? (
      <MapPlaceObjectLayer
        width={mapWidth}
        height={mapHeight}
        campaignHandle={campaignHandle}
        assetId={assetId}
        defaultLayerId={defaultLayerId}
        onPlaced={() => scene.reloadScene()}
        onError={(message) => setMapActionError(message)}
      />
    ) : null;

  return (
    <div className="w-full min-w-0 space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            to={mapsHubPath}
            className="inline-block text-sm text-muted hover:text-foreground"
          >
            ← Maps
          </Link>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">
            Interactive cartography · {detail.map.width ?? '?'} × {detail.map.height ?? '?'}{' '}
            px
          </p>
        </div>
        {canEdit ? (
          <Link
            to={campaignPath(campaignHandle, 'maps', assetId, 'settings')}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/10"
          >
            <Settings className="size-4" />
            Settings
          </Link>
        ) : null}
      </header>

      {showBreadcrumbTrail ? (
        <MapViewerToolbar
          mapsHubHref={mapsHubPath}
          breadcrumbs={breadcrumbs}
          onNavigateMap={(nextAssetId, nextTitle) => {
            if (nextTitle) {
              setBreadcrumbs((current) => [
                ...current,
                { assetId: nextAssetId, title: nextTitle },
              ]);
            }
            navigate(campaignPath(campaignHandle, 'maps', nextAssetId));
          }}
        />
      ) : null}

      <MapChronologyBar
        viewEpochMinute={viewEpochMinute}
        campaignEpochMinute={campaignEpochMinute}
        timeTracking={timeTracking}
        canEdit={canEdit}
        presentationPresets={scene.presentationPresets}
        activeEraPresetId={scene.activeEraPresetId}
        onViewEpochMinuteChange={setViewEpochMinute}
        onSelectPreset={(preset) => {
          scene.applyPresentationPreset(preset, setViewEpochMinute);
        }}
      />

      {editMode && canEdit ? (
        <MapPresentationPresetsPanel
          campaignHandle={campaignHandle}
          assetId={assetId}
          presets={scene.presentationPresets}
          layers={scene.layers}
          viewEpochMinute={viewEpochMinute}
          campaignEpochMinute={campaignEpochMinute}
          timeTracking={timeTracking}
          onChanged={() => scene.reloadScene()}
        />
      ) : null}

      <MapVisibilityBar
        layers={scene.layers}
        enabledLayerIds={scene.enabledLayerIds}
        hiddenPinTypes={scene.hiddenTypes}
        onToggleLayer={scene.toggleLayer}
        onTogglePinType={scene.togglePinType}
        onEnableAllLayers={scene.enableAllLayers}
        onDisableAllLayers={scene.disableAllLayers}
        editMode={editMode && canEdit}
        onUpdateLayer={async (layerId, updates) => {
          const { updateMapLayer } = await import('@/lib/mapScene');
          await updateMapLayer(campaignHandle, assetId, layerId, updates);
          await scene.reloadScene();
        }}
        onDeleteLayer={async (layerId) => {
          const { deleteMapLayer } = await import('@/lib/mapScene');
          await deleteMapLayer(campaignHandle, assetId, layerId);
          await scene.reloadScene();
        }}
        onAddPoliticalBordersLayer={async () => {
          await scene.handleCreatePoliticalBordersLayer();
        }}
        onAddMigrationFlowsLayer={async () => {
          await scene.handleCreateMigrationFlowsLayer();
        }}
        onAddTradeRoutesLayer={async () => {
          await scene.handleCreateTradeRoutesLayer();
        }}
        onAddTravelRoutesLayer={async () => {
          await scene.handleCreateTravelRoutesLayer();
        }}
        onAddWeatherClimateLayer={async () => {
          await scene.handleCreateWeatherClimateLayer();
        }}
        onAddVisibilityZonesLayer={async () => {
          await scene.handleCreateVisibilityZonesLayer();
        }}
        showKnowledgeFogToggle={!canEdit || !editMode}
        knowledgeFogEnabled={knowledgeFogEnabled}
        onToggleKnowledgeFog={() => setKnowledgeFogEnabled((v) => !v)}
      />

      {editMode && canEdit ? (
        <MapGroupsPanel
          campaignHandle={campaignHandle}
          assetId={assetId}
          groups={scene.groups}
          hiddenGroupIds={scene.hiddenGroupIds}
          onToggleGroupFilter={scene.toggleGroupFilter}
          onGroupsChanged={() => scene.reloadScene()}
        />
      ) : null}

      {mapActionError ? (
        <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {mapActionError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setMapActionError(null)}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="lg:flex lg:items-start lg:gap-3">
        <div className="min-w-0 flex-1">
          <MapCanvas
            campaignHandle={campaignHandle}
            map={detail.map}
            canEdit={canEdit}
            wikiPages={wikiPages}
            campaignMaps={campaignMaps}
            editMode={editMode}
            ghostMode={ghostMode}
            onToggleEditMode={() => setEditMode((v) => !v)}
            onToggleGhostMode={() => setGhostMode((v) => !v)}
            scene={scene}
            editorTool={editorTool}
            onEditorToolChange={setEditorTool}
            onSelectSceneObject={setEditingObject}
            regionDrawOverlay={regionDrawOverlay}
            onCancelDraw={
              editorTool === 'drawPath' ? pathDraw.cancel : regionDraw.cancel
            }
            onFinishDraw={() =>
              void (editorTool === 'drawPath' ? pathDraw.finish() : regionDraw.finish())
            }
            canFinishDraw={
              editorTool === 'drawPath' ? pathDraw.canFinish : regionDraw.canFinish
            }
            isPersistingDraw={
              editorTool === 'drawPath' ? pathDraw.isPersisting : regionDraw.isPersisting
            }
            onNavigateWiki={(pageId) =>
              navigate(campaignWikiPath(campaignHandle, pageId, flatPages))
            }
            onNavigateMap={(nextAssetId, nextTitle) => {
              if (nextTitle) {
                setBreadcrumbs((current) => [
                  ...current,
                  { assetId: nextAssetId, title: nextTitle },
                ]);
              }
              navigate(campaignPath(campaignHandle, 'maps', nextAssetId));
            }}
          />
        </div>

        {editMode && canEdit ? (
          <MapSceneObjectEditorSheet
            open={Boolean(editingObject)}
            object={editingObject}
            campaignHandle={campaignHandle}
            assetId={assetId}
            layers={scene.layers}
            groups={scene.groups}
            viewEpochMinute={viewEpochMinute}
            campaignEpochMinute={campaignEpochMinute}
            timeTracking={timeTracking}
            organizationPages={organizationPages}
            wikiPages={wikiPages}
            onClose={() => setEditingObject(null)}
            onUpdated={() => scene.reloadScene()}
            variant="panel"
          />
        ) : null}
      </div>
    </div>
  );
}
