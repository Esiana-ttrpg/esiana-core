import { useEffect, useMemo, useState } from 'react';
import type {
  CampaignMapAsset,
  MapObjectGroupDto,
  MapPinDto,
  MapPinType,
  MapSceneObjectDto,
} from '@/types/maps';
import { MAP_PIN_TYPE_VALUES, mapDisplayTitle } from '@/types/maps';
import { deleteMapPin, updateMapPin } from '@/lib/maps';
import { batchRevealMapObjects, updateMapSceneObject } from '@/lib/mapScene';

interface MapPinEditorSheetProps {
  open: boolean;
  pin: MapPinDto | null;
  campaignHandle: string;
  assetId: string;
  wikiPages: { id: string; title: string }[];
  campaignMaps: CampaignMapAsset[];
  groups: MapObjectGroupDto[];
  sceneObjects: MapSceneObjectDto[];
  onClose: () => void;
  onUpdated: (pin: MapPinDto) => void;
  onDeleted: (pinId: string) => void;
}

export function MapPinEditorSheet({
  open,
  pin,
  campaignHandle,
  assetId,
  wikiPages,
  campaignMaps,
  groups,
  sceneObjects,
  onClose,
  onUpdated,
  onDeleted,
}: MapPinEditorSheetProps) {
  const [label, setLabel] = useState('');
  const [pinType, setPinType] = useState<MapPinType>('Location');
  const [targetPageId, setTargetPageId] = useState<string | null>(null);
  const [targetAssetId, setTargetAssetId] = useState<string | null>(null);
  const [pageSearch, setPageSearch] = useState('');
  const [mapSearch, setMapSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState('');
  const [revelation, setRevelation] = useState<'REVEALED' | 'HIDDEN' | 'DRAFT'>(
    'REVEALED',
  );

  useEffect(() => {
    if (!pin) return;
    setLabel(pin.label ?? '');
    setPinType(pin.pinType as MapPinType);
    setTargetPageId(pin.targetPageId);
    setTargetAssetId(pin.targetAssetId);
    setPageSearch('');
    setMapSearch('');
    const object = pin.sceneObjectId
      ? sceneObjects.find((entry) => entry.id === pin.sceneObjectId)
      : sceneObjects.find((entry) => entry.mapPinId === pin.id);
    setGroupId(object?.groupId ?? '');
    setError(null);
    setRevelation('REVEALED');
  }, [pin, sceneObjects]);

  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    if (!q) return wikiPages.slice(0, 20);
    return wikiPages
      .filter((page) => page.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [pageSearch, wikiPages]);

  const filteredMaps = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return campaignMaps
      .filter((map) => map.id !== assetId)
      .filter((map) => {
        if (!q) return true;
        return mapDisplayTitle(map).toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [campaignMaps, assetId, mapSearch]);

  if (!open || !pin) return null;

  const save = async () => {
    if (!targetPageId && !targetAssetId) {
      setError('Pin must link to a wiki page or nested map.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateMapPin(campaignHandle, assetId, pin.id, {
        label: label.trim() || null,
        pinType,
        targetPageId,
        targetAssetId,
        revelation,
      });
      if (pin.sceneObjectId) {
        await updateMapSceneObject(campaignHandle, assetId, pin.sceneObjectId, {
          groupId: groupId || null,
        });
      }
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save pin');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteMapPin(campaignHandle, assetId, pin.id);
      onDeleted(pin.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete pin');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Edit map pin"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Edit pin</h3>
            <p className="text-sm text-muted">
              ({Math.round(pin.x)}, {Math.round(pin.y)})
            </p>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-muted/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {error ? (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        ) : null}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Label (optional)</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Pin type</span>
          <select
            value={pinType}
            onChange={(event) => setPinType(event.target.value as MapPinType)}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          >
            {MAP_PIN_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Player visibility (map)</span>
          <select
            value={revelation}
            onChange={(event) =>
              setRevelation(event.target.value as 'REVEALED' | 'HIDDEN' | 'DRAFT')
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="REVEALED">Revealed to players</option>
            <option value="HIDDEN">Hidden from players</option>
            <option value="DRAFT">Draft (GM only)</option>
          </select>
          {pin.sceneObjectId && revelation === 'HIDDEN' ? (
            <button
              type="button"
              className="mt-2 text-xs text-accent hover:underline"
              onClick={() => {
                void batchRevealMapObjects(campaignHandle, assetId, [
                  pin.sceneObjectId!,
                ]).then(() => setRevelation('REVEALED'));
              }}
            >
              Reveal now
            </button>
          ) : null}
        </label>

        {pin.sceneObjectId && groups.length > 0 ? (
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium">Group (editor organize only)</span>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
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

        <div className="mb-3 space-y-2">
          <div className="text-sm font-medium">Wiki page target</div>
          {targetPageId ? (
            <div className="flex items-center justify-between text-sm">
              <span>
                {wikiPages.find((page) => page.id === targetPageId)?.title ??
                  'Linked page'}
              </span>
              <button
                type="button"
                className="text-muted hover:underline"
                onClick={() => setTargetPageId(null)}
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <input
                value={pageSearch}
                onChange={(event) => setPageSearch(event.target.value)}
                placeholder="Search wiki pages…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <ul className="max-h-32 overflow-y-auto rounded-md border border-border">
                {filteredPages.map((page) => (
                  <li key={page.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/10"
                      onClick={() => setTargetPageId(page.id)}
                    >
                      {page.title}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="mb-4 space-y-2">
          <div className="text-sm font-medium">Nested map target</div>
          {targetAssetId ? (
            <div className="flex items-center justify-between text-sm">
              <span>
                {(() => {
                  const selected = campaignMaps.find((map) => map.id === targetAssetId);
                  if (selected) return mapDisplayTitle(selected);
                  return pin.targetMapTitle ?? 'Linked map';
                })()}
              </span>
              <button
                type="button"
                className="text-muted hover:underline"
                onClick={() => setTargetAssetId(null)}
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <input
                value={mapSearch}
                onChange={(event) => setMapSearch(event.target.value)}
                placeholder="Search campaign maps…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <ul className="max-h-32 overflow-y-auto rounded-md border border-border">
                {filteredMaps.map((map) => (
                  <li key={map.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/10"
                      onClick={() => setTargetAssetId(map.id)}
                    >
                      {mapDisplayTitle(map)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="rounded-md border border-red-900/40 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40"
            disabled={busy}
            onClick={() => void remove()}
          >
            Delete pin
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/10"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground disabled:opacity-50"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? 'Saving…' : 'Save pin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
