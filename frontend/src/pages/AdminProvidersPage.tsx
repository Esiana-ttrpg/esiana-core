import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { ProviderConnection } from '@/lib/sessionAudio';
import { PROCESSING_CAPABILITIES } from '@shared/sessionAudio';
const button = 'rounded-md border border-border px-3 py-2 text-sm hover:bg-surface disabled:opacity-50';
const field = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
type Grant = { id: string; campaignId: string; connectionId: string; enabled: boolean; modelIds: string[]; monthlyRequests: number | null; monthlyDurationMs: string | null };
type Usage = { id: string; jobId: string; campaignId: string; connectionId: string; status: string; durationMs: string; requestCount: number; failureCode: string | null; month: string; startedRequests: number; completedRequests: number; completedDurationMs: string };
type UsageSummary = { campaignId: string; connectionId: string; status: string; _count: number; _sum: { startedRequests: number; completedRequests: number; completedDurationMs: string; requestCount: number } };
export function AdminProvidersPage() {
  const [tab, setTab] = useState('connections'), [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [policies, setPolicies] = useState<{ grants: Grant[]; campaigns: { id: string; name: string }[] }>({ grants: [], campaigns: [] });
  const [usage, setUsage] = useState<Usage[]>([]), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [summaries, setSummaries] = useState<UsageSummary[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]), [grantConnection, setGrantConnection] = useState('');
  const [grantModels, setGrantModels] = useState<string[]>([]), [requestLimit, setRequestLimit] = useState(''), [durationLimit, setDurationLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const initial = { name: '', protocol: 'whisper_cpp', endpoint: '', enabled: false, allowPrivateNetwork: false,
    capabilities: ['audio.transcribe'], credential: '', operatorLabel: '', billingLabel: '', concurrency: 1, timeoutSeconds: 3600,
    maxRequestBytes: '1073741824', formats: ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac'], monthlyRequests: null as number | null, monthlyDurationMs: null as string | null };
  const [form, setForm] = useState(initial);
  async function load() {
    const [rows, grants, metrics, totals] = await Promise.all([apiFetch<ProviderConnection[]>('/admin/providers'),
      apiFetch<typeof policies>('/admin/providers/policies/all'), apiFetch<Usage[]>('/admin/providers/usage/all'), apiFetch<UsageSummary[]>('/admin/providers/usage/summary')]);
    setConnections(rows); setPolicies(grants); setUsage(metrics); setSummaries(totals);
  }
  async function run(fn: () => Promise<unknown>) { setError(''); setMessage(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save'); } }
  useEffect(() => { void run(load); }, []);
  const chosen = connections.find((c) => c.id === grantConnection);
  return <div className="mx-auto max-w-5xl space-y-6 p-6">
    <header><h1 className="text-2xl font-semibold">Providers</h1><p className="mt-2 text-sm text-muted">Manage shared AI and processing services. Campaign access requires an explicit grant.</p></header>
    <nav className="flex flex-wrap gap-2" aria-label="Provider settings">{['connections', 'capabilities', 'access policies', 'usage'].map((value) => <button key={value} className={button} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</nav>
    {error && <p role="alert" className="text-red-400">{error}</p>}{message && <p role="status">{message}</p>}
    {tab === 'connections' && <>
      <div className="space-y-4">{connections.map((c) => <article key={c.id} className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="font-medium">{c.name} · {c.enabled ? c.status : 'Disabled'}</h2><p className="text-sm text-muted">{c.protocol} · {c.capabilities.join(', ')} · {c.hasCredential ? 'Credential configured' : 'No credential'}</p>
        <div className="flex flex-wrap gap-2"><button className={button} onClick={() => { setEditingId(c.id); setForm({ name: c.name, protocol: c.protocol, endpoint: c.endpoint ?? '', enabled: c.enabled,
          allowPrivateNetwork: c.allowPrivateNetwork ?? false, capabilities: c.capabilities, credential: '', operatorLabel: c.operatorLabel ?? '', billingLabel: c.billingLabel ?? '',
          concurrency: c.concurrency, timeoutSeconds: c.timeoutSeconds, maxRequestBytes: c.maxRequestBytes, formats: c.formats, monthlyRequests: c.monthlyRequests, monthlyDurationMs: c.monthlyDurationMs }); }}>Edit connection</button>
          <button className={button} onClick={() => void run(async () => { const result = await apiFetch<{ status: string }>(`/admin/providers/${c.id}/test`, { method: 'POST' }); setMessage(`Connection ${result.status}. Capability compatibility is checked when used.`); await load(); })}>Test connection</button>
          <button className={button} onClick={() => void run(async () => { const key = window.prompt('Provider model identifier'); if (!key) return;
            const name = window.prompt('Display name', key); if (!name) return;
            await apiFetch(`/admin/providers/${c.id}/models/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ name, enabled: true, capabilities: c.capabilities }) }); await load(); })}>Add model</button></div>
        <ul className="text-sm">{c.models.map((m) => <li key={m.id} className="mt-2 flex flex-wrap items-center gap-2">{m.name} ({m.key}) · {m.capabilities.join(', ')}
          <button className={button} onClick={() => void run(async () => { await apiFetch(`/admin/providers/${c.id}/models/${encodeURIComponent(m.key)}`, { method: 'PUT', body: JSON.stringify({ name: m.name, enabled: !m.enabled, capabilities: m.capabilities }) }); await load(); })}>{m.enabled ? 'Disable' : 'Enable'}</button></li>)}</ul>
      </article>)}</div>
      <form className="space-y-4 rounded-lg border border-border p-4" onSubmit={(e) => { e.preventDefault(); void run(async () => {
        const data = { ...form, ...(editingId && !form.credential ? { credential: undefined } : {}) };
        await apiFetch(`/admin/providers${editingId ? `/${editingId}` : ''}`, { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(data) }); setForm(initial); setEditingId(null); await load(); setMessage('Provider saved.'); }); }}>
        <h2 className="text-lg font-medium">{editingId ? 'Edit connection' : 'Add provider'}</h2>
        <label className="block text-sm">Display name<input className={field} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block text-sm">Protocol<select className={field} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}><option value="whisper_cpp">whisper.cpp HTTP</option><option value="openai_transcription">OpenAI-compatible transcription</option></select></label>
        <label className="block text-sm">Full transcription endpoint<input className={field} type="url" required placeholder="http://localhost:8080/inference" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} /></label>
        <label className="block text-sm">Bearer credential {editingId && '(leave blank to retain)'}<input className={field} type="password" autoComplete="new-password" value={form.credential} onChange={(e) => setForm({ ...form, credential: e.target.value })} /></label>
        <label className="block text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Enable connection</label>
        <label className="block text-sm"><input type="checkbox" checked={form.allowPrivateNetwork} onChange={(e) => setForm({ ...form, allowPrivateNetwork: e.target.checked })} /> Explicitly approve this endpoint for local/private network access</label>
        <div className="grid gap-3 sm:grid-cols-2">{(['operatorLabel', 'billingLabel'] as const).map((key) => <label key={key} className="text-sm">{key === 'operatorLabel' ? 'Operator' : 'Billing attribution'}<input className={field} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
          {(['concurrency', 'timeoutSeconds'] as const).map((key) => <label key={key} className="text-sm">{key === 'concurrency' ? 'Concurrent requests' : 'Timeout (seconds)'}<input type="number" min={1} className={field} value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></label>)}
          <label className="text-sm">Maximum request bytes<input className={field} inputMode="numeric" value={form.maxRequestBytes} onChange={(e) => setForm({ ...form, maxRequestBytes: e.target.value })} /></label>
          <label className="text-sm">Global monthly request ceiling (optional)<input className={field} type="number" min={0} value={form.monthlyRequests ?? ''} onChange={(e) => setForm({ ...form, monthlyRequests: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          <label className="text-sm">Global monthly audio hours (optional)<input className={field} type="number" min={0} step={0.1} value={form.monthlyDurationMs ? Number(form.monthlyDurationMs) / 3600000 : ''} onChange={(e) => setForm({ ...form, monthlyDurationMs: e.target.value === '' ? null : String(Math.round(Number(e.target.value) * 3600000)) })} /></label>
        </div>
        <fieldset><legend className="text-sm">Declared capabilities</legend>{PROCESSING_CAPABILITIES.map((c) => <label key={c} className="mr-4 inline-flex gap-2 text-sm"><input type="checkbox" checked={form.capabilities.includes(c)} onChange={(e) => setForm({ ...form, capabilities: e.target.checked ? [...form.capabilities, c] : form.capabilities.filter((v) => v !== c) })} />{c}</label>)}</fieldset>
        <label className="block text-sm">Accepted formats (comma separated)<input className={field} value={form.formats.join(',')} onChange={(e) => setForm({ ...form, formats: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></label>
        <div className="flex gap-2"><button className={button}>Save provider</button>{editingId && <button type="button" className={button} onClick={() => { setEditingId(null); setForm(initial); }}>Cancel edit</button>}</div>
      </form>
    </>}
    {tab === 'capabilities' && <div className="space-y-3">{connections.map((c) => <article key={c.id} className="rounded-lg border border-border p-4"><h2>{c.name}</h2><p className="text-sm text-muted">Declared connection capabilities: {c.capabilities.join(', ') || 'None'}</p>{c.models.map((m) => <p key={m.id} className="text-sm">{m.name}: {m.capabilities.join(', ')}</p>)}</article>)}<p className="text-sm text-muted">Transcription is the first executable capability. Other capability identifiers reserve future integrations.</p></div>}
    {tab === 'access policies' && <section className="space-y-4">
      <p className="text-sm text-muted">New campaigns have no provider access. Choose campaigns and explicitly grant or revoke transcription access.</p>
      <label className="block text-sm">Provider<select className={field} value={grantConnection} onChange={(e) => { setGrantConnection(e.target.value); setGrantModels([]); }}><option value="">Select provider</option>{connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <fieldset><legend>Permitted models</legend>{chosen?.models.map((m) => <label key={m.id} className="mr-3 inline-flex gap-2 text-sm"><input type="checkbox" checked={grantModels.includes(m.id)} onChange={(e) => setGrantModels(e.target.checked ? [...grantModels, m.id] : grantModels.filter((id) => id !== m.id))} />{m.name}</label>)}</fieldset>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Monthly request ceiling (blank for none)<input className={field} type="number" min={0} value={requestLimit} onChange={(e) => setRequestLimit(e.target.value)} /></label><label className="text-sm">Monthly audio hours (blank for none)<input className={field} type="number" min={0} step={0.1} value={durationLimit} onChange={(e) => setDurationLimit(e.target.value)} /></label></div>
      <fieldset className="space-y-2"><legend>Campaigns</legend>{policies.campaigns.map((c) => <label key={c.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selectedCampaigns.includes(c.id)} onChange={(e) => setSelectedCampaigns(e.target.checked ? [...selectedCampaigns, c.id] : selectedCampaigns.filter((id) => id !== c.id))} />{c.name} · {policies.grants.some((g) => g.campaignId === c.id && g.connectionId === grantConnection && g.enabled) ? 'Granted' : 'No access'}</label>)}</fieldset>
      <div className="flex gap-2">{[true, false].map((enabled) => <button key={String(enabled)} className={button} disabled={!grantConnection || !selectedCampaigns.length} onClick={() => void run(async () => { await apiFetch('/admin/providers/policies/bulk', { method: 'PUT', body: JSON.stringify({ campaignIds: selectedCampaigns, connectionId: grantConnection, feature: 'session_audio', capability: 'audio.transcribe', enabled, modelIds: grantModels, monthlyRequests: requestLimit === '' ? null : Number(requestLimit), monthlyDurationMs: durationLimit === '' ? null : String(Math.round(Number(durationLimit) * 3600000)) }) }); await load(); setMessage(enabled ? 'Access granted.' : 'Access revoked. Existing campaign content is retained.'); })}>{enabled ? 'Grant selected campaigns' : 'Revoke selected campaigns'}</button>)}</div>
    </section>}
    {tab === 'usage' && <section className="space-y-4"><p className="text-sm text-muted">Current UTC month. Usage and failure information does not grant access to campaign recordings or transcripts.</p><button className={button} onClick={() => void run(load)}>Refresh usage</button>
      <h2 className="font-medium">All campaign totals</h2>{summaries.map((u) => <p key={`${u.campaignId}:${u.connectionId}:${u.status}`} className="text-sm">{policies.campaigns.find((c) => c.id === u.campaignId)?.name ?? u.campaignId} · {connections.find((c) => c.id === u.connectionId)?.name} · {u._sum.startedRequests ?? 0} submitted requests · {u._sum.completedRequests ?? 0} completed · {(Number(u._sum.completedDurationMs ?? 0) / 3600000).toFixed(2)} completed audio hours · {u._count} {u.status} jobs</p>)}
      <h2 className="font-medium">Most recent 500 jobs</h2>{usage.map((u) => <div key={u.id} className="rounded-lg border border-border p-3 text-sm"><p>{policies.campaigns.find((c) => c.id === u.campaignId)?.name ?? u.campaignId} · {connections.find((c) => c.id === u.connectionId)?.name ?? 'Removed provider'}</p><p>{u.startedRequests} submitted requests · {u.completedRequests} completed · {(Number(u.completedDurationMs) / 3600000).toFixed(2)} completed audio hours · {u.status}{u.failureCode ? ` · ${u.failureCode}` : ''}</p>
        {u.status === 'reserved' && <button className={button} onClick={() => void run(async () => { await apiFetch(`/admin/providers/usage/${u.jobId}/cancel`, { method: 'POST' }); await load(); })}>Cancel processing job</button>}</div>)}
    </section>}
  </div>;
}
