import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
interface StorageData {
  assets: { id: string; campaignId: string; sizeBytes: string | null; _count: { recordingFiles: number } }[];
  recordings: { campaignId: string; _count: number }[];
  uploads: { id: string; campaignId: string; status: string; offsetBytes: string; sizeBytes: string }[];
  campaigns: { id: string; name: string }[]; transcriptBytes: Record<string, number>;
}
export function RecordingStoragePanel() {
  const [data, setData] = useState<StorageData | null>(null), [error, setError] = useState('');
  const load = () => apiFetch<StorageData>('/admin/audio/storage').then(setData).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  return <section className="space-y-4 rounded-lg border border-border p-5">
    <h2 className="text-lg font-medium">Recordings</h2><p className="text-sm text-muted">Physical storage and upload status. This view does not grant access to audio or transcript content.</p>
    {error && <p role="alert" className="text-red-400">{error}</p>}<button className="rounded border border-border px-3 py-1 text-sm" onClick={() => void load()}>Refresh recordings</button>
    {data && <><p className="text-sm">{(data.assets.reduce((sum, a) => sum + Number(a.sizeBytes ?? 0), 0) / 1073741824).toFixed(2)} GiB · {data.assets.length} physical files · {data.recordings.reduce((sum, r) => sum + r._count, 0)} recordings</p>
      {data.campaigns.filter((c) => data.assets.some((a) => a.campaignId === c.id)).map((c) => <p key={c.id} className="text-sm">{c.name}: {(data.assets.filter((a) => a.campaignId === c.id).reduce((sum, a) => sum + Number(a.sizeBytes ?? 0), 0) / 1073741824).toFixed(2)} GiB audio · {((data.transcriptBytes[c.id] ?? 0) / 1048576).toFixed(2)} MiB transcript text</p>)}
      <h3 className="font-medium">Largest physical files</h3>{data.assets.slice(0, 50).map((a) => <div key={a.id} className="flex flex-wrap items-center gap-3 text-sm"><span>{data.campaigns.find((c) => c.id === a.campaignId)?.name} · {(Number(a.sizeBytes ?? 0) / 1048576).toFixed(1)} MiB · {a._count.recordingFiles ? 'Referenced' : 'Unattached'}</span>
        {!a._count.recordingFiles && <button className="rounded border border-border px-3 py-1" onClick={() => { if (!window.confirm('Permanently purge this unreferenced audio asset?')) return;
          void apiFetch(`/admin/audio/storage/assets/${a.id}`, { method: 'DELETE' }).then(load).catch((e) => setError(e.message)); }}>Purge unreferenced asset</button>}</div>)}
      <h3 className="font-medium">Pending and failed uploads</h3>{data.uploads.map((u) => <p key={u.id} className="text-sm">{data.campaigns.find((c) => c.id === u.campaignId)?.name} · {u.status} · {Math.round(Number(u.offsetBytes) / Number(u.sizeBytes) * 100)}%</p>)}
    </>}
  </section>;
}
