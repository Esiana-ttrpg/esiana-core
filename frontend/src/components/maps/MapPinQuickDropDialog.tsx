import { useMemo, useState } from 'react';
import type { CampaignMapAsset, MapPinType } from '@/types/maps';
import { MAP_PIN_TYPE_VALUES, mapDisplayTitle } from '@/types/maps';
import { getWikiFolderForMapPinType } from '@/lib/maps';

interface WikiPageOption {
  id: string;
  title: string;
}

interface MapPinQuickDropDialogProps {
  open: boolean;
  x: number;
  y: number;
  wikiPages: WikiPageOption[];
  campaignMaps?: CampaignMapAsset[];
  currentAssetId?: string;
  onClose: () => void;
  onBindExisting: (pageId: string, pinType: MapPinType) => void;
  onQuickCreate: (title: string, pinType: MapPinType) => void;
  onNestedMap: (targetAssetId: string, pinType: MapPinType) => void;
}

export function MapPinQuickDropDialog({
  open,
  x,
  y,
  wikiPages,
  campaignMaps = [],
  currentAssetId,
  onClose,
  onBindExisting,
  onQuickCreate,
  onNestedMap,
}: MapPinQuickDropDialogProps) {
  const [mode, setMode] = useState<'choose' | 'bind' | 'create' | 'nested'>('choose');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [pinType, setPinType] = useState<MapPinType>('Location');
  const destinationFolder = getWikiFolderForMapPinType(pinType);

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wikiPages.slice(0, 20);
    return wikiPages
      .filter((page) => page.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [search, wikiPages]);

  const nestedMapOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaignMaps
      .filter((map) => map.id !== currentAssetId)
      .filter((map) => {
        if (!q) return true;
        return mapDisplayTitle(map).toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [campaignMaps, currentAssetId, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Add map pin"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Add map pin</h3>
            <p className="text-sm text-muted">
              Coordinates ({Math.round(x)}, {Math.round(y)})
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

        {mode === 'choose' ? (
          <div className="grid gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-left hover:bg-muted/10"
              onClick={() => setMode('bind')}
            >
              Bind to existing wiki page
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-left hover:bg-muted/10"
              onClick={() => setMode('create')}
            >
              <span className="block font-medium">Create new {pinType} page</span>
              <span className="mt-0.5 block text-xs text-muted">
                Stored in: Wiki -&gt; {destinationFolder}
              </span>
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-left hover:bg-muted/10"
              onClick={() => setMode('nested')}
            >
              <span className="block font-medium">Open nested map</span>
              <span className="mt-0.5 block text-xs text-muted">
                Link this pin to another map layer (e.g. a city inside a nation map).
              </span>
            </button>
          </div>
        ) : null}

        {mode === 'bind' ? (
          <div className="space-y-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search wiki pages…"
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <div className="max-h-56 overflow-y-auto rounded-md border border-border">
              {filteredPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-muted/10"
                  onClick={() => onBindExisting(page.id, pinType)}
                >
                  {page.title}
                </button>
              ))}
              {filteredPages.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted">No pages found</div>
              ) : null}
            </div>
            <button
              type="button"
              className="text-sm text-muted hover:underline"
              onClick={() => setMode('choose')}
            >
              Back
            </button>
          </div>
        ) : null}

        {mode === 'nested' ? (
          <div className="space-y-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaign maps…"
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <div className="max-h-56 overflow-y-auto rounded-md border border-border">
              {nestedMapOptions.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-muted/10"
                  onClick={() => onNestedMap(map.id, pinType)}
                >
                  {mapDisplayTitle(map)}
                </button>
              ))}
              {nestedMapOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted">No other maps found</div>
              ) : null}
            </div>
            <button
              type="button"
              className="text-sm text-muted hover:underline"
              onClick={() => setMode('choose')}
            >
              Back
            </button>
          </div>
        ) : null}

        {mode === 'create' ? (
          <div className="space-y-3">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder={`${pinType} name`}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <p className="text-xs text-muted">
              Stored in: Wiki -&gt; {destinationFolder}
            </p>
            <button
              type="button"
              disabled={!newTitle.trim()}
              className="w-full rounded-md bg-accent px-3 py-2 text-accent-foreground disabled:opacity-50"
              onClick={() => onQuickCreate(newTitle.trim(), pinType)}
            >
              Create and pin
            </button>
            <button
              type="button"
              className="text-sm text-muted hover:underline"
              onClick={() => setMode('choose')}
            >
              Back
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
