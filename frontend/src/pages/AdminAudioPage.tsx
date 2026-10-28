import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { AUDIO_FORMATS } from '@shared/sessionAudio';
interface GlobalAudio { enabled: boolean; transcriptionEnabled: boolean; maxFileBytes: string; maxSessionBytes: string; maxCampaignBytes: string; maxGlobalBytes: string | null; maxTranscriptBytes: number; uploadConcurrency: number; allowedFormats: string[] }
export function AdminAudioPage() {
  const [settings, setSettings] = useState<GlobalAudio | null>(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { void apiFetch<GlobalAudio>('/admin/audio').then(setSettings).catch((e) => setError(e.message)); }, []);
  if (!settings) return <p className="p-6">{error || 'Loading audio settings…'}</p>;
  const field = 'mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
  return <form className="mx-auto max-w-3xl space-y-5 p-6" onSubmit={(e) => { e.preventDefault(); setError(''); setMessage('');
    const { enabled, transcriptionEnabled, maxFileBytes, maxSessionBytes, maxCampaignBytes, maxGlobalBytes, maxTranscriptBytes, uploadConcurrency, allowedFormats } = settings;
    void apiFetch('/admin/audio', { method: 'PATCH', body: JSON.stringify({ enabled, transcriptionEnabled, maxFileBytes, maxSessionBytes, maxCampaignBytes, maxGlobalBytes, maxTranscriptBytes, uploadConcurrency, allowedFormats }) }).then(() => setMessage('Audio settings saved.')).catch((e) => setError(e.message)); }}>
    <h1 className="text-2xl font-semibold">Audio</h1><p className="text-sm text-muted">System-wide upload policy and transcription availability. Disabling uploads preserves existing recordings and transcripts.</p>
    {error && <p role="alert" className="text-red-400">{error}</p>}{message && <p role="status">{message}</p>}
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />Allow campaigns to enable new audio uploads</label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.transcriptionEnabled} onChange={(e) => setSettings({ ...settings, transcriptionEnabled: e.target.checked })} />Allow explicitly granted transcription services</label>
    <div className="grid gap-4 sm:grid-cols-2">{([['maxFileBytes', 'Maximum file'], ['maxSessionBytes', 'Maximum session audio'], ['maxCampaignBytes', 'Maximum campaign audio'], ['maxGlobalBytes', 'Global storage ceiling (optional)']] as const).map(([key, label]) => <label key={key} className="text-sm">{label} in GiB<input className={field} type="number" min={0.01} step={0.01} required={key !== 'maxGlobalBytes'} value={settings[key] === null ? '' : Number(settings[key]) / 1073741824} onChange={(e) => setSettings({ ...settings, [key]: e.target.value === '' && key === 'maxGlobalBytes' ? null : String(Math.round(Number(e.target.value) * 1073741824)) })} /></label>)}</div>
    <label className="block text-sm">Concurrent uploads per user<input className={field} type="number" min={1} max={20} value={settings.uploadConcurrency} onChange={(e) => setSettings({ ...settings, uploadConcurrency: Number(e.target.value) })} /></label>
    <label className="block text-sm">Maximum transcript size in MiB<input className={field} type="number" min={1} max={100} value={settings.maxTranscriptBytes / 1048576} onChange={(e) => setSettings({ ...settings, maxTranscriptBytes: Math.round(Number(e.target.value) * 1048576) })} /></label>
    <fieldset><legend>Allowed formats</legend>{AUDIO_FORMATS.map((format) => <label key={format} className="mr-4 inline-flex gap-2 text-sm"><input type="checkbox" checked={settings.allowedFormats.includes(format)} onChange={(e) => setSettings({ ...settings, allowedFormats: e.target.checked ? [...settings.allowedFormats, format] : settings.allowedFormats.filter((f) => f !== format) })} />{format.toUpperCase()}</label>)}</fieldset>
    <p className="text-sm text-muted">Configure endpoints, credentials, permitted models, and campaign grants in Providers.</p><button className="rounded-md border border-border px-4 py-2 text-sm">Save Audio settings</button>
  </form>;
}
