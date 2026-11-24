import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Controls = { enabled: boolean; publicEnabled: boolean; personalEnabled: boolean; recruitingEnabled: boolean; campaignsEnabled: boolean };
const fields: { key: keyof Controls; label: string; routes: string }[] = [
  { key: 'enabled', label: 'Enable OPDS', routes: '/opds and all descendants' },
  { key: 'publicEnabled', label: 'Public catalog', routes: '/opds, /opds/recruiting, /opds/campaigns and descendants' },
  { key: 'personalEnabled', label: 'Personal catalogs', routes: '/opds/me, /opds/me/:id, /opds/me/:id/:module, /opds/me/:id/pages/:pageId (including manifest.json)' },
  { key: 'recruitingEnabled', label: 'Public recruitment', routes: '/opds/recruiting, /opds/recruiting/:id (including manifest.json)' },
  { key: 'campaignsEnabled', label: 'Public campaigns', routes: '/opds/campaigns, /opds/campaigns/:id, /opds/campaigns/:id/:module, /opds/campaigns/:id/pages/:pageId (including manifest.json)' },
];
export function OpdsAdminSettings() {
  const [settings, setSettings] = useState<Controls | null>(null);
  const [stats, setStats] = useState({ authorizedUsers: 0, activeCredentials: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void Promise.all([
    apiFetch<{ settings: { opds: Controls } }>('/admin/settings').then(d => setSettings(d.settings.opds)),
    apiFetch<typeof stats>('/admin/opds/credentials').then(setStats),
  ]).catch(e => setError(String(e))); }, []);
  async function action(fn: () => Promise<void>) { setBusy(true); setError(''); try { await fn(); } catch(e) { setError(String(e)); } finally { setBusy(false); } }
  return <section className="space-y-4 rounded-xl border border-border bg-surface p-6"><h2 className="text-lg font-semibold">OPDS Catalog</h2>
    <p>Control third-party access to written campaign content. Public access also requires the instance login gate to allow anonymous readers.</p>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {settings && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void action(async () => { await apiFetch('/admin/settings', { method: 'PATCH', body: JSON.stringify({ opds: settings }) }); }); }}>
      {fields.map(field => <label key={field.key} className="block"><input type="checkbox" checked={settings[field.key]} onChange={e => setSettings({ ...settings, [field.key]: e.target.checked })} /> {field.label}
        <code className="block break-words text-xs text-muted">{field.routes}</code></label>)}
      <button disabled={busy} className="rounded border border-border p-2" type="submit">Save OPDS settings</button>
    </form>}
    <a className="text-primary underline" href="https://esiana-ttrpg.github.io/docs/features/opds/" target="_blank" rel="noreferrer">OPDS documentation</a>
    <p>Authorized users: {stats.authorizedUsers} · Active credentials: {stats.activeCredentials}</p>
    <button disabled={busy} type="button" className="rounded border border-border p-2" onClick={() => {
      if (window.confirm('Permanently revoke every OPDS reader credential on this instance? This is audited and cannot be undone. Downloaded content cannot be recalled.')) void action(async () => {
        await apiFetch('/admin/opds/credentials', { method: 'DELETE', body: JSON.stringify({ confirmation: 'REVOKE ALL OPDS CREDENTIALS' }) });
        setStats({ authorizedUsers: 0, activeCredentials: 0 });
      });
    }}>Revoke all OPDS credentials</button>
  </section>;
}
