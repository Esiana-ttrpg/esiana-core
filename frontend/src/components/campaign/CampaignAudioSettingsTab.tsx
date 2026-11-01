import { useEffect, useState } from 'react';
import { audioRequest, type AudioSettingsPayload, type ProviderConnection } from '@/lib/sessionAudio';
import { DocsLearnMoreLink } from '@/components/guides/DocsLearnMoreLink';
export function CampaignAudioSettingsTab({ campaignHandle }: { campaignHandle: string }) {
  const [data, setData] = useState<AudioSettingsPayload | null>(null), [providers, setProviders] = useState<ProviderConnection[]>([]);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { void Promise.all([audioRequest<AudioSettingsPayload>(campaignHandle, '/settings'), audioRequest<ProviderConnection[]>(campaignHandle, '/providers')]).then(([settings, rows]) => { setData(settings); setProviders(rows); }).catch((e) => setError(e.message)); }, [campaignHandle]);
  useEffect(() => {
    if (!data) return;
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [data]);
  if (!data) return <p role="status">{error || 'Loading audio settings…'}</p>;
  const settings = data.settings, canEdit = data.capabilities.includes('campaign.settings.edit');
  const set = (patch: Partial<typeof settings>) => setData({ ...data, settings: { ...settings, ...patch } });
  const field = 'mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
  return <form className="max-w-2xl space-y-5" onSubmit={(e) => { e.preventDefault(); setError(''); setMessage('');
    const { enabled, transcriptionEnabled, allowPov, defaultVisibility, defaultConnectionId, defaultModelId, maxStorageBytes, monthlyRequests, monthlyDurationMs } = settings;
    void audioRequest(campaignHandle, '/settings', 'PATCH', { enabled, transcriptionEnabled, allowPov, defaultVisibility, defaultConnectionId, defaultModelId, maxStorageBytes, monthlyRequests, monthlyDurationMs }).then(() => setMessage('Audio settings saved.')).catch((e) => setError(e.message)); }}>
    <h2 id="campaign-audio" className="text-xl font-medium">Campaign Audio</h2><p className="text-sm text-muted">Configure session recordings, transcription, visibility, and storage within instance limits. Role access is managed in Access → Role Capabilities.</p>
    <DocsLearnMoreLink doc="sessionRecordingsPrivacy" label="Recording privacy and consent" />
    {!data.global.enabled && <p className="text-sm text-muted">New audio uploads are disabled by the instance administrator. Existing recordings remain available.</p>}
    {data.usage && <p className="text-sm text-muted">Campaign audio: {(Number(data.usage.storageBytes) / 1073741824).toFixed(2)} GiB of {(Number(settings.maxStorageBytes ?? data.global.maxCampaignBytes) / 1073741824).toFixed(2)} GiB · {data.usage.fileCount} files</p>}
    {error && <p role="alert" className="text-red-400">{error}</p>}{message && <p role="status">{message}</p>}
    <fieldset disabled={!canEdit} className="space-y-4">
      {([['enabled', 'Allow new session recordings'], ['allowPov', 'Allow POV recordings (uploader and authorized campaign managers)'], ['transcriptionEnabled', 'Enable permitted transcription services']] as const).map(([key, label]) => <label key={key} id={key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={settings[key]} onChange={(e) => set({ [key]: e.target.checked })} />{label}</label>)}
      <label className="block text-sm">Default visibility<select className={field} value={settings.defaultVisibility} onChange={(e) => set({ defaultVisibility: e.target.value })}><option value="campaign">Campaign members with session access</option><option value="staff">Authorized narrative staff</option>{settings.allowPov && <option value="uploader_and_managers">Uploader and authorized campaign managers</option>}</select></label>
      <label className="block text-sm">Campaign storage ceiling in GiB (blank inherits instance limit)<input className={field} type="number" min={0.01} step={0.01} value={settings.maxStorageBytes ? Number(settings.maxStorageBytes) / 1073741824 : ''} onChange={(e) => set({ maxStorageBytes: e.target.value ? String(Math.round(Number(e.target.value) * 1073741824)) : null })} /></label>
      <label id="transcription-provider" className="block text-sm">Default transcription provider<select className={field} value={settings.defaultConnectionId ?? ''} onChange={(e) => set({ defaultConnectionId: e.target.value || null, defaultModelId: null })}><option value="">Select a permitted provider</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.enabled ? p.status : 'Disabled'}</option>)}</select></label>
      <label className="block text-sm">Permitted model<select className={field} value={settings.defaultModelId ?? ''} onChange={(e) => set({ defaultModelId: e.target.value || null })}><option value="" disabled={providers.find((p) => p.id === settings.defaultConnectionId)?.requiresModel}>{providers.find((p) => p.id === settings.defaultConnectionId)?.requiresModel ? 'Choose a permitted model' : 'Use provider default'}</option>{providers.find((p) => p.id === settings.defaultConnectionId)?.models.map((m) => <option key={m.id} value={m.id} disabled={!m.enabled}>{m.name}</option>)}</select></label>
      <label className="block text-sm">Monthly request ceiling (blank inherits grant)<input className={field} type="number" min={0} value={settings.monthlyRequests ?? ''} onChange={(e) => set({ monthlyRequests: e.target.value === '' ? null : Number(e.target.value) })} /></label>
      <label className="block text-sm">Monthly audio hours (blank inherits grant)<input className={field} type="number" min={0} step={0.1} value={settings.monthlyDurationMs ? Number(settings.monthlyDurationMs) / 3600000 : ''} onChange={(e) => set({ monthlyDurationMs: e.target.value === '' ? null : String(Math.round(Number(e.target.value) * 3600000)) })} /></label>
      <button className="rounded-md border border-border px-4 py-2 text-sm" type="submit">Save Audio settings</button>
    </fieldset>
  </form>;
}
