import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { getGameSystemLabel } from '@/components/campaign/GameSystemSelect';

interface CampaignStats {
  wordCount: number;
  pageCount: number;
  mapCount: number;
  assetCount?: number;
  assetStorageBytes?: number;
  storageUsed: number;
  pluginCount: number;
  isPublic: boolean;
  language: string | null;
  gameSystem: string | null;
  customGameSystemName?: string | null;
}

interface CapacityHint {
  tierLabel: string;
  headroom: 'comfortable' | 'approaching' | 'exceeds';
  recommendedDeployment: {
    summary: string;
    cpu: string;
    ram: string;
    database: string;
    storage?: string;
  };
}

interface TopFile {
  name: string;
  url: string;
  sizeKB: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StatusTab() {
  const { campaignHandle } = useParams<{ campaignHandle: string }>();
  const [stats, setStats] = useState<CampaignStats>({ wordCount: 0, pageCount: 0, mapCount: 0, storageUsed: 0, pluginCount: 0, isPublic: false, language: null, gameSystem: null });
  const [capacityHint, setCapacityHint] = useState<CapacityHint | null>(null);
  const [topFiles, setTopFiles] = useState<TopFile[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!campaignHandle) return;
      try {
        const statsResponse = await fetch(`/api/campaigns/${campaignHandle}/status`);
        if (!statsResponse.ok) throw new Error('Failed to fetch stats');
        const statsData = await statsResponse.json();
        setStats(statsData);

        const hintResponse = await fetch(`/api/campaigns/${campaignHandle}/capacity-hint`);
        if (hintResponse.ok) {
          setCapacityHint(await hintResponse.json());
        }

        const filesResponse = await fetch(`/api/campaigns/${campaignHandle}/files`);
        if (!filesResponse.ok) throw new Error('Failed to fetch files');
        const filesData = await filesResponse.json();
        setTopFiles(filesData.files ?? []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load status');
      }
    };
    void fetchData();
  }, [campaignHandle]);

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 text-lg font-semibold">Campaign Status</h2>
      {capacityHint && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-foreground">Estimated size</h3>
          <p className="mt-1 text-sm text-foreground">{capacityHint.tierLabel}</p>
          <p className="mt-2 text-xs text-muted">{capacityHint.recommendedDeployment.summary}</p>
          <p className="mt-2 text-xs text-muted">
            Recommended: {capacityHint.recommendedDeployment.cpu}, {capacityHint.recommendedDeployment.ram},{' '}
            {capacityHint.recommendedDeployment.database}
            {capacityHint.recommendedDeployment.storage
              ? `, ${capacityHint.recommendedDeployment.storage}`
              : ''}
          </p>
          {capacityHint.headroom === 'approaching' && (
            <p className="mt-2 text-xs text-amber-200/90">
              Approaching the next size tier — see self-hosting capacity guidance if performance softens.
            </p>
          )}
          {capacityHint.headroom === 'exceeds' && (
            <p className="mt-2 text-xs text-amber-200/90">
              Above published tier targets — consider more RAM, PostgreSQL, or object storage for media.
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Word Count</h3>
          <p className="text-sm">{stats.wordCount}</p>
        </div>
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Page Count</h3>
          <p className="text-sm">{stats.pageCount}</p>
        </div>
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Map Count</h3>
          <p className="text-sm">{stats.mapCount}</p>
        </div>
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Asset Count</h3>
          <p className="text-sm">{stats.assetCount ?? '—'}</p>
        </div>
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Storage Used</h3>
          <p className="text-sm">
            {stats.assetStorageBytes != null && stats.assetStorageBytes > 0
              ? formatBytes(stats.assetStorageBytes)
              : `${stats.storageUsed} KB`}
          </p>
        </div>
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Plugin Count</h3>
          <p className="text-sm">{stats.pluginCount}</p>
        </div>
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Game System</h3>
          <p className="text-sm">
            {getGameSystemLabel(stats.gameSystem, stats.customGameSystemName)}
          </p>
        </div>
        <div className="border border-border rounded p-3">
          <h3 className="text-sm font-medium">Language</h3>
          <p className="text-sm">{stats.language ?? '—'}</p>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Top 5 Largest Files</h3>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {topFiles.length === 0 && <p className="text-sm text-muted">No files found</p>}
          {topFiles.map((file) => (
            <div key={file.url} className="border border-border rounded p-3 bg-surface">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-white">{file.name}</h4>
                  <p className="text-xs text-muted">{file.url}</p>
                </div>
                <span className="text-sm text-foreground">{file.sizeKB} KB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded bg-red-950 p-3 text-red-200">
          <X className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
