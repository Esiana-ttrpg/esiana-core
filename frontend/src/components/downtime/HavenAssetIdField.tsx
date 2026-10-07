import { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { fetchCampaignAssets, formatCampaignAssetLabel, uploadCampaignImage, type CampaignUploadAsset } from '@/lib/campaigns';
import { fetchCampaignMaps, mapAssetImageUrl } from '@/lib/maps';
import { mapDisplayTitle } from '@/types/maps';

interface HavenAssetIdFieldProps {
  campaignHandle: string;
  label: string;
  value: string | null;
  onChange: (assetId: string | null) => void;
  allowMultiple?: false;
  linkedLocationAssetId?: string | null;
  onUploadPendingChange?: (pending: boolean) => void;
}

interface HavenAssetGalleryFieldProps {
  campaignHandle: string;
  label: string;
  value: string[];
  onChange: (assetIds: string[]) => void;
  allowMultiple: true;
  linkedLocationAssetId?: string | null;
  onUploadPendingChange?: (pending: boolean) => void;
}

type Props = HavenAssetIdFieldProps | HavenAssetGalleryFieldProps;

function sortAssetsForPicker(
  assets: CampaignUploadAsset[],
  labelFor: (asset: CampaignUploadAsset) => string,
): CampaignUploadAsset[] {
  return [...assets].sort((a, b) => {
    const aIsMap = a.type === 'map';
    const bIsMap = b.type === 'map';
    if (aIsMap !== bIsMap) return aIsMap ? -1 : 1;
    return labelFor(a).localeCompare(labelFor(b), undefined, { sensitivity: 'base' });
  });
}

export function HavenAssetIdField(props: Props) {
  const { campaignHandle, label } = props;
  const [assets, setAssets] = useState<CampaignUploadAsset[]>([]);
  const [mapTitleById, setMapTitleById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      fetchCampaignAssets(campaignHandle),
      fetchCampaignMaps(campaignHandle).catch(() => ({ maps: [] })),
    ])
      .then(([assetList, mapsPayload]) => {
        if (cancelled) return;
        setAssets(assetList);
        const titles = new Map<string, string>();
        for (const map of mapsPayload.maps) {
          titles.set(map.id, mapDisplayTitle(map));
        }
        setMapTitleById(titles);
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
          setMapTitleById(new Map());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, refreshKey]);

  async function upload(file: File) {
    setUploading(true);
    props.onUploadPendingChange?.(true);
    setUploadError(null);
    try {
      const result = await uploadCampaignImage(campaignHandle, file);
      if (props.allowMultiple) {
        if (!props.value.includes(result.asset.id)) props.onChange([...props.value, result.asset.id]);
      } else {
        props.onChange(result.asset.id);
      }
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image.');
    } finally {
      setUploading(false);
      props.onUploadPendingChange?.(false);
    }
  }

  const uploadControl = (
    <>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} />
      <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/60 disabled:opacity-50">
        <Upload className="size-3.5" aria-hidden /> {uploading ? 'Uploading…' : 'Upload'}
      </button>
    </>
  );

  const labelFor = useMemo(
    () => (asset: CampaignUploadAsset) => formatCampaignAssetLabel(asset, mapTitleById),
    [mapTitleById],
  );

  const sortedAssets = useMemo(
    () => sortAssetsForPicker(assets, labelFor),
    [assets, labelFor],
  );

  if (props.allowMultiple) {
    const selected = props.value;
    const addId = (assetId: string) => {
      if (!selected.includes(assetId)) {
        props.onChange([...selected, assetId]);
      }
    };
    const removeId = (assetId: string) => {
      props.onChange(selected.filter((id) => id !== assetId));
    };

    return (
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {selected.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {selected.map((assetId, index) => {
              const asset = assets.find((entry) => entry.id === assetId);
              const name = asset ? labelFor(asset) : 'Selected image';
              return (
                <li
                  key={assetId}
                  className="flex items-center gap-2 rounded border border-border px-2 py-1"
                >
                  <img
                    src={mapAssetImageUrl(assetId, 'thumb')}
                    alt=""
                    className="h-8 w-8 rounded object-cover"
                  />
                  <span className="max-w-[10rem] truncate text-sm text-foreground">{name}</span>
                  <span className="ml-auto flex shrink-0">
                    <button type="button" aria-label={`Move ${name} left`} disabled={index === 0} onClick={() => { const next = [...selected]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; props.onChange(next); }} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronLeft className="size-3.5" /></button>
                    <button type="button" aria-label={`Move ${name} right`} disabled={index === selected.length - 1} onClick={() => { const next = [...selected]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; props.onChange(next); }} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronRight className="size-3.5" /></button>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeId(assetId)}
                    className="text-xs text-muted-foreground hover:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <select
          className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
          value=""
          disabled={loading}
          onChange={(event) => {
            const id = event.target.value;
            if (id) addId(id);
          }}
        >
          <option value="">{loading ? 'Loading assets…' : 'Add gallery image…'}</option>
          {sortedAssets
            .filter((asset) => !selected.includes(asset.id))
            .map((asset) => (
              <option key={asset.id} value={asset.id}>
                {labelFor(asset)}
              </option>
            ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {uploadControl}
          {props.linkedLocationAssetId && !selected.includes(props.linkedLocationAssetId) ? <button type="button" onClick={() => addId(props.linkedLocationAssetId!)} className="rounded border border-border px-2.5 py-1.5 text-xs font-medium hover:border-primary/60">Use linked location image</button> : null}
        </div>
        {uploadError ? <p className="text-xs text-destructive" role="alert">{uploadError}</p> : null}
      </div>
    );
  }

  const { value, onChange } = props;

  return (
    <div className="block text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="mt-1 flex items-center gap-2">
        {value ? (
          <img
            src={mapAssetImageUrl(value, 'thumb')}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-cover"
          />
        ) : null}
        <select
          value={value ?? ''}
          disabled={loading}
          onChange={(event) => onChange(event.target.value || null)}
          className="min-w-0 flex-1 rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
        >
          <option value="">{loading ? 'Loading assets…' : 'None'}</option>
          {sortedAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {labelFor(asset)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {uploadControl}
        {props.linkedLocationAssetId ? <button type="button" onClick={() => onChange(props.linkedLocationAssetId!)} className="rounded border border-border px-2.5 py-1.5 text-xs font-medium hover:border-primary/60">Use linked location image</button> : null}
      </div>
      {uploadError ? <p className="mt-1 text-xs text-destructive" role="alert">{uploadError}</p> : null}
    </div>
  );
}
