import { useEffect, useMemo, useState } from 'react';
import { fetchCampaignAssets, formatCampaignAssetLabel, type CampaignUploadAsset } from '@/lib/campaigns';
import { fetchCampaignMaps, mapAssetImageUrl } from '@/lib/maps';
import { mapDisplayTitle } from '@/types/maps';

interface HavenAssetIdFieldProps {
  campaignHandle: string;
  label: string;
  value: string | null;
  onChange: (assetId: string | null) => void;
  allowMultiple?: false;
}

interface HavenAssetGalleryFieldProps {
  campaignHandle: string;
  label: string;
  value: string[];
  onChange: (assetIds: string[]) => void;
  allowMultiple: true;
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
  }, [campaignHandle]);

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
          <ul className="flex flex-wrap gap-2">
            {selected.map((assetId) => {
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
      </div>
    );
  }

  const { value, onChange } = props;

  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
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
    </label>
  );
}
