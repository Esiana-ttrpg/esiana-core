import { useEffect, useMemo, useState } from 'react';
import type { MapLayerDto, MapObjectGroupDto, MapSceneObjectDto } from '@/types/maps';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import {
  batchRevealMapObjects,
  deleteMapSceneObject,
  updateMapSceneObject,
} from '@/lib/mapScene';
import { parseObjectStyle } from '@/lib/mapSceneStyles';
import { MapObjectTemporalPanel } from '@/components/maps/MapObjectTemporalPanel';
import {
  inferMapLayerKind,
  MapObjectSemanticRole,
  mergeObjectStyleWithOverlay,
  parseMapObjectOverlayStyle,
} from '@shared/mapOverlayTypes';

interface WikiPageOption {
  id: string;
  title: string;
}

interface MapSceneObjectEditorSheetProps {
  open: boolean;
  object: MapSceneObjectDto | null;
  campaignHandle: string;
  assetId: string;
  layers: MapLayerDto[];
  groups: MapObjectGroupDto[];
  viewEpochMinute?: string | null;
  campaignEpochMinute?: string | null;
  timeTracking?: TimeTrackingBundle | null;
  organizationPages?: WikiPageOption[];
  wikiPages?: WikiPageOption[];
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  variant?: 'modal' | 'panel';
}

export function MapSceneObjectEditorSheet({
  open,
  object,
  campaignHandle,
  assetId,
  layers,
  groups,
  viewEpochMinute = null,
  campaignEpochMinute = null,
  timeTracking = null,
  organizationPages = [],
  wikiPages = [],
  onClose,
  onUpdated,
  variant = 'modal',
}: MapSceneObjectEditorSheetProps) {
  const [label, setLabel] = useState('');
  const [layerId, setLayerId] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [controllingOrgPageId, setControllingOrgPageId] = useState('');
  const [targetPageId, setTargetPageId] = useState('');
  const [revelation, setRevelation] = useState<'REVEALED' | 'HIDDEN' | 'DRAFT'>('REVEALED');
  const [fillColor, setFillColor] = useState('');
  const [strokeColor, setStrokeColor] = useState('');
  const [fillOpacity, setFillOpacity] = useState('0.2');
  const [fontSize, setFontSize] = useState('14');
  const [textColor, setTextColor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === layerId) ?? null,
    [layers, layerId],
  );

  const layerKind = selectedLayer
    ? inferMapLayerKind({ name: selectedLayer.name })
    : null;

  useEffect(() => {
    if (!object) return;
    setLabel(object.label ?? '');
    setLayerId(object.layerId ?? '');
    setGroupId(object.groupId ?? '');
    setRevelation(
      (object.revelation as 'REVEALED' | 'HIDDEN' | 'DRAFT') || 'REVEALED',
    );
    const overlay = parseMapObjectOverlayStyle(object.style);
    setControllingOrgPageId(overlay.controllingOrgPageId ?? '');
    setTargetPageId(object.targetPageId ?? '');
    const style = parseObjectStyle(object.style);
    setFillColor(style.fillColor ?? '');
    setStrokeColor(style.strokeColor ?? '');
    setFillOpacity(String(style.fillOpacity ?? 0.2));
    setFontSize(String(style.fontSize ?? 14));
    setTextColor(style.color ?? '');
    setError(null);
  }, [object]);

  if (!open || !object) return null;

  const objectStyle = parseObjectStyle(object.style);
  const isVisibilityZone = objectStyle.isVisibilityZone === true;

  const kindLabel =
    object.kind === 'region'
      ? 'Region'
      : object.kind === 'label'
        ? 'Label'
        : object.kind === 'path'
          ? 'Path'
          : 'Object';

  const buildStylePayload = (): Record<string, unknown> => {
    const overlay = parseMapObjectOverlayStyle(object.style);
    const semanticRole =
      overlay.semanticRole ??
      (layerKind === 'political_border'
        ? MapObjectSemanticRole.POLITICAL_BORDER
        : MapObjectSemanticRole.REGION);

    const visual =
      object.kind === 'region'
        ? {
            fillColor: fillColor || undefined,
            strokeColor: strokeColor || undefined,
            fillOpacity: Number.isFinite(Number(fillOpacity))
              ? Number(fillOpacity)
              : undefined,
          }
        : object.kind === 'label'
          ? {
              fontSize: Number.isFinite(Number(fontSize)) ? Number(fontSize) : undefined,
              color: textColor || undefined,
            }
          : {};

    return mergeObjectStyleWithOverlay(
      {
        ...parseObjectStyle(object.style),
        ...visual,
        ...(isVisibilityZone ? { isVisibilityZone: true } : {}),
      },
      {
        semanticRole,
        controllingOrgPageId: controllingOrgPageId.trim() || undefined,
        layerKind: layerKind ?? undefined,
      },
    );
  };

  const save = async () => {
    if (isVisibilityZone && !targetPageId.trim()) {
      setError('Link a wiki page for this visibility zone.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateMapSceneObject(campaignHandle, assetId, object.id, {
        label: label.trim() || null,
        layerId: layerId || null,
        groupId: groupId || null,
        revelation,
        targetPageId: targetPageId.trim() || null,
        style: buildStylePayload(),
      });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete this ${kindLabel.toLowerCase()}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMapSceneObject(campaignHandle, assetId, object.id);
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete');
    } finally {
      setBusy(false);
    }
  };

  const reveal = async () => {
    setBusy(true);
    try {
      await batchRevealMapObjects(campaignHandle, assetId, [object.id]);
      await onUpdated();
      setRevelation('REVEALED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reveal');
    } finally {
      setBusy(false);
    }
  };

  const editorContent = (
    <>
      <h2 id="scene-object-editor-title" className="text-lg font-semibold">
        Edit {kindLabel}
      </h2>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Label</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Layer</span>
          <p className="mt-1 text-xs text-muted/80">
            Political borders, routes, and geographic regions use layers for presence filtering.
          </p>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
            value={layerId}
            onChange={(e) => setLayerId(e.target.value)}
          >
            <option value="">No layer</option>
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
        </label>

        {(object.kind === 'region' || object.kind === 'path') &&
        organizationPages.length > 0 ? (
          <label className="block text-sm">
            <span className="text-muted">Controlling organization (optional)</span>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              value={controllingOrgPageId}
              onChange={(e) => setControllingOrgPageId(e.target.value)}
            >
              <option value="">None</option>
              {organizationPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isVisibilityZone ? (
          <label className="block text-sm">
            <span className="text-muted">Linked wiki page (required)</span>
            <p className="mt-1 text-xs text-muted/80">
              Party fog uses wiki visibility and discovery for this location.
            </p>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              value={targetPageId}
              onChange={(e) => setTargetPageId(e.target.value)}
            >
              <option value="">Select page…</option>
              {wikiPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {groups.length > 0 ? (
          <label className="block text-sm">
            <span className="text-muted">Group (editor organize only)</span>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">Ungrouped</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-sm">
          <span className="text-muted">Revelation</span>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
            value={revelation}
            onChange={(e) =>
              setRevelation(e.target.value as 'REVEALED' | 'HIDDEN' | 'DRAFT')
            }
          >
            <option value="REVEALED">Revealed</option>
            <option value="HIDDEN">Hidden</option>
            <option value="DRAFT">Draft</option>
          </select>
        </label>

        {object.kind === 'region' ? (
          <>
            <label className="block text-sm">
              <span className="text-muted">Fill color</span>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
                placeholder="#c9a227"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Stroke color</span>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
                placeholder="#c9a227"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Fill opacity (0 to 1)</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
                value={fillOpacity}
                onChange={(e) => setFillOpacity(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {object.kind === 'label' ? (
          <>
            <label className="block text-sm">
              <span className="text-muted">Font size</span>
              <input
                type="number"
                min={10}
                max={48}
                step={1}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Text color</span>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
                placeholder="#f8fafc"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>

      {timeTracking ? (
        <MapObjectTemporalPanel
          campaignHandle={campaignHandle}
          assetId={assetId}
          object={object}
          viewEpochMinute={viewEpochMinute}
          campaignEpochMinute={campaignEpochMinute}
          timeTracking={timeTracking}
          captureGeometry={object.kind === 'region' || object.kind === 'path' ? object.geometry : undefined}
          onUpdated={onUpdated}
        />
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          onClick={() => void save()}
          disabled={busy}
        >
          Save
        </button>
        {revelation !== 'REVEALED' ? (
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/10 disabled:opacity-50"
            onClick={() => void reveal()}
            disabled={busy}
          >
            Reveal to party
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          onClick={() => void remove()}
          disabled={busy}
        >
          Delete
        </button>
        <button
          type="button"
          className="ml-auto rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </>
  );

  if (variant === 'panel') {
    return (
      <div
        className="w-80 shrink-0 overflow-y-auto border-l border-border bg-surface/95 p-4"
        role="complementary"
        aria-labelledby="scene-object-editor-title"
      >
        {editorContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[700] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
        role="dialog"
        aria-labelledby="scene-object-editor-title"
      >
        {editorContent}
      </div>
    </div>
  );
}
