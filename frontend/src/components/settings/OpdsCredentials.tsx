import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Credential { id: string; name: string; scopes: string[]; createdAt: string; expiresAt: string; lastUsedAt: string | null }

export function OpdsCredentials({ userId }: { userId?: string }) {
  const base = userId ? `/admin/users/${encodeURIComponent(userId)}/opds/credentials` : '/user/opds/credentials';
  const [rows, setRows] = useState<Credential[]>([]);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() { const data = await apiFetch<{ credentials: Credential[] }>(base); setRows(data.credentials); }
  useEffect(() => { setSecret(null); void load().catch(e => setError(String(e))); }, [base]);
  async function act(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); await load(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-lg border border-border p-4">
    <h3 className="font-semibold">OPDS Catalog</h3>
    {!userId && <><p>Read campaign descriptions and lore in an OPDS 2.0 reader. Read-only access.</p>
      <p><a className="text-primary underline" href="/opds/me">{window.location.origin}/opds/me</a></p>
      <p className="text-sm text-muted">Use any username and your reader credential as the HTTP Basic password. Credentials expire after one year.</p></>}
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {secret && <div role="status" className="space-y-2"><p>Copy this reader secret now. It is shown once.</p><code className="break-all select-all">{secret}</code>
      <button type="button" onClick={() => setSecret(null)} className="block underline">Dismiss secret</button></div>}
    {!rows.length && <p className="text-sm text-muted">No reader credentials.</p>}
    <ul className="space-y-3">{rows.map(row => <li key={row.id} className="border-b border-border pb-2">
      <strong>{row.name}</strong><p className="text-sm text-muted">Reader credential · {row.scopes.join(', ')}<br />
        Created {new Date(row.createdAt).toLocaleDateString()} · Expires {new Date(row.expiresAt).toLocaleDateString()}<br />
        Last used {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : 'never'}</p>
      <button type="button" disabled={busy} className="text-primary underline" onClick={() => void act(() => apiFetch(`${base}/${row.id}`, { method: 'DELETE' }))}>Revoke</button>
    </li>)}</ul>
    {!!rows.length && <button type="button" disabled={busy} className="underline" onClick={() => {
      if (window.confirm('Revoke all reader credentials for this account? Downloaded content cannot be recalled.')) void act(() => apiFetch(base, { method: 'DELETE' }));
    }}>Revoke all reader credentials</button>}
    {!userId && <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void act(async () => {
      const data = await apiFetch<{ secret: string }>(base, { method: 'POST', body: JSON.stringify({ name }) }); setSecret(data.secret); setName('');
    }); }}><input aria-label="Reader credential name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Tablet Reader" className="rounded border border-border bg-background p-2" />
      <button type="submit" disabled={busy || !name.trim()} className="rounded border border-border p-2">Create reader credential</button></form>}
  </section>;
}
