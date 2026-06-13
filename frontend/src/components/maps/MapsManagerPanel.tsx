import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCampaignMaps,
  uploadCampaignMap,
} from '@/lib/maps';
import { campaignPath } from '@/lib/campaignPaths';
import type { CampaignMapAsset } from '@/types/maps';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface MapsManagerPanelProps {
  campaignHandle: string;
}

export function MapsManagerPanel({ campaignHandle }: MapsManagerPanelProps) {
  const [maps, setMaps] = useState<CampaignMapAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setMaps((await fetchCampaignMaps(campaignHandle)).maps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load maps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignHandle]);

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

  return (
    <section className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Campaign maps</h2>
          <p className="text-sm text-muted">
            Upload cartography assets and open the interactive viewer.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/10">
          {uploading ? 'Uploading…' : 'Upload map'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={onUpload}
          />
        </label>
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : maps.length === 0 ? (
        <p className="text-sm text-muted">No map assets uploaded yet.</p>
      ) : (
        <ul className="grid gap-2">
          {maps.map((map) => (
            <li
              key={map.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2"
            >
              <div>
                <div className="font-medium">{map.id.slice(0, 8)}…</div>
                <div className="text-xs text-muted">
                  {map.width ?? '?'} × {map.height ?? '?'} px
                </div>
              </div>
              <Link
                to={campaignPath(campaignHandle, 'maps', map.id)}
                className="rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground"
              >
                Open viewer
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
