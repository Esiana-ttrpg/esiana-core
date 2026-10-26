import '@/styles/map-workspace.css';
import { ImageCreditDisplay } from '@/components/media/ImageCreditDisplay';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Maximize2, Minimize2, Settings, Layers } from 'lucide-react';
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
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
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
  const { tree, flatPages, campaign: wikiCampaign } = useWiki();

  const [detail, setDetail] = useState<CampaignMapDetail | null>(null);
  const [campaignMaps, setCampaignMaps] = useState<CampaignMapAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedCanEdit, setCanEdit] = useState(false);
  const canEdit = wikiCampaign ? wikiCampaign.role === CampaignMemberRoles.GAMEMASTER || wikiCampaign.role === CampaignMemberRoles.WRITER : loadedCanEdit;
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
  const [fullscreen, setFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [markerSearch, setMarkerSearch] = useState('');
  const [interacting, setInteracting] = useState(false);
  const [selectedObject, setSelectedObject] = useState<MapSceneObjectDto | null>(null);
  const objectGuard = useRef<(() => boolean) | null>(null);
  const pinGuard = useRef<(() => boolean) | null>(null);
  const discardProperties = () => (objectGuard.current?.() ?? true) && (pinGuard.current?.() ?? true);
  const selectObject = (object: MapSceneObjectDto) => {
    if (editingObject?.id !== object.id && !discardProperties()) return;
    setSelectedObject(object);
    if (editMode && canEdit) { setEditingObject(object); if (window.matchMedia('(max-width: 639px)').matches) setLegendOpen(false); }
  };
  const changeTool = (tool: MapEditorTool) => {
    if (!discardProperties()) return;
    setEditingObject(null); setEditorTool(tool);
  };
  const toggleEditMode = () => {
    if (editMode && !discardProperties()) return;
    setEditMode(value => !value);
  };
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fullscreenTriggerRef = useRef<HTMLButtonElement>(null);
  const wasFullscreenRef = useRef(false);
  const viewerAnchorRef = useRef<HTMLDivElement>(null);
  // The portal target stays the same while its DOM node moves. React and Leaflet
  // therefore keep the same component and map instances in both presentations.
  const [viewerHost] = useState(() => document.createElement('div'));
  const viewerReady = !loading && !error && Boolean(detail);

  useBodyScrollLock(fullscreen);

  useLayoutEffect(() => {
    const parent = fullscreen ? document.body : viewerAnchorRef.current;
    parent?.appendChild(viewerHost);
    return () => {
      viewerHost.remove();
    };
  }, [fullscreen, viewerHost, viewerReady]);

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
    return enabled[0]?.id ?? null;
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
    active: editMode && canEdit && (editorTool === 'drawRegion' || editorTool === 'drawCircle'),
    circle: editorTool === 'drawCircle',
    campaignHandle,
    assetId,
    width: mapWidth,
    height: mapHeight,
    defaultLayerId,
    defaultLayerName,
    isVisibilityZone: isVisibilityZoneLayer,
    onPersisted: async () => { setEditorTool('select'); await scene.reloadScene(); },
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
    onPersisted: async () => { setEditorTool('select'); await scene.reloadScene(); },
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

  useEffect(() => {
    if (!canEdit) { setEditMode(false); setGhostMode(false); setEditorTool('select'); setEditingObject(null); }
  }, [canEdit]);
  useEffect(() => {
    setSelectedObject(null); setEditingObject(null); setEditMode(false); setEditorTool('select');
    setViewEpochMinute(null); setLegendOpen(false); setMarkerSearch('');
  }, [campaignHandle, assetId]);
  useEffect(() => {
    if (scene.loading) return;
    if (selectedObject && !scene.visibleSceneObjects.some(o => o.id === selectedObject.id)) {
      setSelectedObject(null); setEditingObject(null);
    }
  }, [scene.loading, scene.visibleSceneObjects, selectedObject]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(d => d !== fullscreenRef.current && d.getClientRects().length);
      if (event.key === 'Tab' && fullscreen) {
        const root = dialogs.at(-1) ?? fullscreenRef.current;
        const nodes = Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]') ?? []).filter(el => el.getClientRects().length);
        const index = nodes.indexOf(document.activeElement as HTMLElement);
        if (!nodes.length) { event.preventDefault(); root?.focus(); }
        else if (event.shiftKey ? index <= 0 : index < 0 || index === nodes.length - 1) {
          event.preventDefault(); nodes[event.shiftKey ? nodes.length - 1 : 0].focus();
        }
        return;
      }
      if (event.key !== 'Escape' || dialogs.length || editingObject) return;
      if (regionDraw.isPersisting || pathDraw.isPersisting) { event.preventDefault(); return; }
      if (editMode && editorTool !== 'select') {
        event.preventDefault(); regionDraw.cancel(); pathDraw.cancel(); setEditorTool('select'); return;
      }
      if (fullscreen) { event.preventDefault(); setFullscreen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, editingObject, editorTool, editMode, regionDraw, pathDraw]);

  useEffect(() => {
    if (!fullscreen) {
      if (wasFullscreenRef.current) fullscreenTriggerRef.current?.focus();
      wasFullscreenRef.current = false;
      return;
    }
    wasFullscreenRef.current = true;
    const frame = window.requestAnimationFrame(() => fullscreenRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [fullscreen]);

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
    editMode && canEdit && (editorTool === 'drawRegion' || editorTool === 'drawCircle') ? (
      <MapDrawRegionLayer
        phase={regionDraw.phase}
        spaceHeld={regionDraw.spaceHeld}
        previewLine={editorTool === 'drawCircle' ? [] : regionDraw.previewPositions()}
        closedPreview={regionDraw.closedPreviewPositions()}
        onAddVertex={regionDraw.addVertex}
        onUpdateCursor={regionDraw.updateCursor}
        onClearCursor={regionDraw.clearCursor}
        onDoubleClickFinish={regionDraw.tryFinishOnDoubleClick}
      />
    ) : editMode && canEdit && editorTool === 'drawPath' ? (
      <MapDrawPathLayer
        phase={pathDraw.phase}
        spaceHeld={pathDraw.spaceHeld}
        previewLine={pathDraw.previewPositions()}
        onAddVertex={pathDraw.addVertex}
        onUpdateCursor={pathDraw.updateCursor}
        onClearCursor={pathDraw.clearCursor}
        onDoubleClickFinish={pathDraw.tryFinishOnDoubleClick}
      />
    ) : editMode && canEdit && editorTool === 'placeLabel' ? (
      <MapPlaceObjectLayer
        width={mapWidth}
        height={mapHeight}
        campaignHandle={campaignHandle}
        assetId={assetId}
        defaultLayerId={defaultLayerId}
        onPlaced={async () => { setEditorTool('select'); await scene.reloadScene(); }}
        onError={(message) => setMapActionError(message)}
      />
    ) : null;

  const viewer = (
    <div
      ref={fullscreenRef}
      data-map-tool={editorTool}
      data-draw-phase={regionDraw.phase}
      data-draw-vertices={regionDraw.vertices.length}
      tabIndex={fullscreen ? -1 : undefined}
      role={fullscreen ? 'dialog' : undefined}
      aria-modal={fullscreen ? 'true' : undefined}
      aria-label={fullscreen ? 'Fullscreen map viewer' : undefined}
      className={
        fullscreen
          ? 'map-workspace fixed inset-0 z-[1900] h-[100dvh] w-screen min-w-0 overflow-hidden bg-background'
          : 'map-workspace w-full min-w-0 space-y-3'
      }
    >
      <header className={fullscreen ? 'pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-3 px-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))]' : 'flex shrink-0 flex-wrap items-start justify-between gap-3'}>
        <div className={`min-w-0 space-y-1 ${fullscreen ? 'hidden' : ''}`}>
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
        <div className={`flex shrink-0 flex-wrap items-center justify-end gap-1 ${fullscreen ? 'pointer-events-auto ml-auto max-w-[calc(100%_-_8rem)]' : ''}`}>
          <div className={fullscreen ? 'absolute left-[calc(max(0.75rem,env(safe-area-inset-left))_+_3.25rem)] top-[max(0.75rem,env(safe-area-inset-top))] max-w-[calc(100%_-_7.5rem)] map-float' : ''}>
          {fullscreen && !interacting ? <div className="max-w-52 truncate px-3 pt-2 text-sm font-medium" title={title}>{title}</div> : null}
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
          </div>
          <button
            ref={fullscreenTriggerRef}
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/95 px-3 py-2 text-sm shadow-md hover:bg-muted/10"
            onClick={() => setFullscreen((value) => !value)}
            aria-label={fullscreen ? 'Exit fullscreen map' : 'View map fullscreen'}
            title={fullscreen ? 'Exit fullscreen (Esc)' : 'View fullscreen'}
          >
            {fullscreen ? (
              <Minimize2 className="size-4" aria-hidden />
            ) : (
              <Maximize2 className="size-4" aria-hidden />
            )}
            <span className="sr-only">
              {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </span>
          </button>
          {canEdit && !fullscreen ? (
            <Link
              to={campaignPath(campaignHandle, 'maps', assetId, 'settings')}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/10"
            >
              <Settings className="size-4" />
              Settings
            </Link>
          ) : null}
        </div>
      </header>

      {showBreadcrumbTrail && !fullscreen ? (
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

      <div className={fullscreen ? 'map-legend-shell' : ''}>
        {fullscreen ? <button type="button" className="map-float flex size-11 items-center justify-center" aria-label="Layers & Legend" aria-expanded={legendOpen} aria-controls="map-legend" onClick={() => setLegendOpen(v => !v)}><Layers size={20} /></button> : null}
        <div id="map-legend" hidden={fullscreen && !legendOpen} className={fullscreen ? 'map-legend map-float' : 'space-y-3'}>
          {fullscreen ? <h2 className="mb-3 font-semibold">Layers &amp; Legend</h2> : null}
          <MapVisibilityBar
        compact={fullscreen}
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
          <details className="mt-3" open={!fullscreen}><summary>Annotations</summary><div className="flex flex-wrap gap-3 py-2">{([['label', 'Text'], ['region', 'Areas & circles'], ['path', 'Paths']] as const).map(([kind, label]) => <label key={kind} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={!scene.hiddenAnnotationKinds.has(kind)} onChange={() => scene.toggleAnnotationKind(kind)} />{label}</label>)}</div></details>
          <details open={fullscreen}><summary>Markers &amp; objects</summary>
            <input aria-label="Search markers" placeholder="Search markers..." value={markerSearch} onChange={e => setMarkerSearch(e.target.value)} className="my-2 w-full rounded-md border border-border bg-background p-2 text-sm" />
            <ul>{scene.visibleSceneObjects.filter(o => [o.label, o.targetPageTitle, o.targetMapTitle].some(t => t?.toLowerCase().includes(markerSearch.trim().toLowerCase())) || !markerSearch.trim()).map(object => <li key={object.id}><button type="button" className="min-h-11 w-full rounded px-2 py-1 text-left text-sm hover:bg-muted/10" aria-pressed={selectedObject?.id === object.id} onClick={() => selectObject(object)}>{object.label || object.targetPageTitle || object.targetMapTitle || object.kind}</button></li>)}</ul>
            {!scene.visibleSceneObjects.length ? <p className="text-sm text-muted">No visible objects.</p> : null}
          </details>
          {editMode && canEdit ? <details><summary>Marker groups</summary><MapGroupsPanel
          campaignHandle={campaignHandle}
          assetId={assetId}
          groups={scene.groups}
          hiddenGroupIds={scene.hiddenGroupIds}
          onToggleGroupFilter={scene.toggleGroupFilter}
          onGroupsChanged={() => scene.reloadScene()}
        /></details> : null}
          {editMode && canEdit ? <details><summary>Presentation presets</summary><MapPresentationPresetsPanel
          campaignHandle={campaignHandle}
          assetId={assetId}
          presets={scene.presentationPresets}
          layers={scene.layers}
          viewEpochMinute={viewEpochMinute}
          campaignEpochMinute={campaignEpochMinute}
          timeTracking={timeTracking}
          onChanged={() => scene.reloadScene()}
        /></details> : null}
          {fullscreen ? <details><summary>Image credits</summary><ImageCreditDisplay credit={detail.map.imageCredit} /></details> : null}
        </div>
      </div>

      {mapActionError ? (
        <p className={`rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive ${fullscreen ? 'absolute left-3 right-3 top-16 z-[1000] bg-surface' : ''}`}>
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

      <div className={`${fullscreen ? 'absolute inset-0 overflow-hidden' : ''} lg:flex lg:items-start lg:gap-3`}>
        <div className={`${fullscreen ? 'flex h-full min-h-0 flex-1 flex-col' : 'min-w-0 flex-1'}`}>
          <MapCanvas
            campaignHandle={campaignHandle}
            map={detail.map}
            fullscreen={fullscreen}
            canEdit={canEdit}
            wikiPages={wikiPages}
            campaignMaps={campaignMaps}
            editMode={editMode}
            ghostMode={ghostMode}
            onToggleEditMode={toggleEditMode}
            onToggleGhostMode={() => setGhostMode((v) => !v)}
            scene={scene}
            editorTool={editorTool}
            onEditorToolChange={changeTool}
            onSelectSceneObject={selectObject}
            selectedObject={scene.visibleSceneObjects.find(object => object.id === selectedObject?.id) ?? null}
            editingObject={editingObject}
            onCloseProperties={() => setEditingObject(null)}
            pinGuard={pinGuard}
            onInteractionChange={setInteracting}
            regionDrawOverlay={regionDrawOverlay}
            onCancelDraw={
              () => { regionDraw.cancel(); pathDraw.cancel(); setEditorTool('select'); }
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
            className={fullscreen ? 'h-full min-h-0' : undefined}
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
            open={Boolean(editingObject && editingObject.kind !== 'pin')}
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
            floating={fullscreen}
            guardRef={objectGuard}
          />
        ) : null}
      </div>
    </div>
  );

  return <div ref={viewerAnchorRef}>{createPortal(viewer, viewerHost)}</div>;
}
