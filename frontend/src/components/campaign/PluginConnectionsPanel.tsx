import { useEffect, useState } from 'react';
import { connectStaticPlugin, disconnectPluginConnection, fetchPluginConnections, startPluginOAuth, type PluginConnectionsResponse } from '@/lib/campaignPlugins';

export function PluginConnectionsPanel({ campaignId, pluginId, origins }: { campaignId: string; pluginId: string; origins: string[] }) {
  const [data, setData] = useState<PluginConnectionsResponse | null>(null);
  const [credential, setCredential] = useState('');
  const [ownerType, setOwnerType] = useState<'user' | 'campaign'>('user');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => fetchPluginConnections(campaignId, pluginId).then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load connections'));
  useEffect(() => { void load(); }, [campaignId, pluginId]);
  if (!data) return error ? <p className="text-sm text-red-300">{error}</p> : <p className="text-sm text-muted">Loading connections…</p>;
  return <section className="space-y-3 rounded-lg border border-border bg-surface/50 p-4">
    <div><h4 className="font-medium text-foreground">Connections</h4><p className="text-xs text-muted">This trusted backend plugin can use connected credentials against the approved origins and inspect returned data. Raw credentials are not disclosed through the connection API.</p></div>
    {origins.length ? <div className="text-xs text-muted"><span className="font-semibold text-foreground">Approved origins:</span> {origins.join(', ')}</div> : null}
    {data.connections.map((connection) => <div key={connection.id} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 text-sm">
      <div><span className="text-foreground">{connection.ownerType === 'campaign' ? 'Shared campaign' : 'Personal'}</span><span className="ml-2 text-muted">{connection.accountLabel || connection.status}</span></div>
      {connection.status === 'connected' ? <button type="button" className="text-red-300" onClick={() => { setBusy(true); void disconnectPluginConnection(campaignId, pluginId, connection.id).then(load).catch((err) => setError(err instanceof Error ? err.message : 'Unable to disconnect')).finally(() => setBusy(false)); }} disabled={busy}>Disconnect</button> : null}
    </div>)}
    {data.provider.authType === 'oauth2' ? <div className="flex gap-2"><select value={ownerType} onChange={(e) => setOwnerType(e.target.value as 'user' | 'campaign')} className="rounded border border-border bg-background px-2 py-1.5 text-sm"><option value="user">Personal</option><option value="campaign">Shared campaign</option></select><button type="button" disabled={busy} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-background" onClick={() => { setBusy(true); void startPluginOAuth(campaignId, pluginId, ownerType, window.location.pathname + window.location.search).then(({ authorizationUrl }) => { window.location.assign(authorizationUrl); }).catch((err) => { setError(err instanceof Error ? err.message : 'Unable to start OAuth'); setBusy(false); }); }}>Connect with OAuth</button></div> : <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); setBusy(true); setError(null); void connectStaticPlugin(campaignId, pluginId, { ownerType, credential }).then(() => { setCredential(''); return load(); }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to connect')).finally(() => setBusy(false)); }}>
      <div className="flex gap-2"><select value={ownerType} onChange={(e) => setOwnerType(e.target.value as 'user' | 'campaign')} className="rounded border border-border bg-background px-2 py-1.5 text-sm"><option value="user">Personal</option><option value="campaign">Shared campaign</option></select><input type="password" autoComplete="off" value={credential} onChange={(e) => setCredential(e.target.value)} placeholder={data.provider.authType === 'apiKey' ? 'API key' : 'Bearer token'} className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm" /><button disabled={busy || !credential} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-background">Connect</button></div>
    </form>}
    {error ? <p className="text-sm text-red-300">{error}</p> : null}
  </section>;
}
