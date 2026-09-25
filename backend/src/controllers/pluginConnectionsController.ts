import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getConnectionProvider } from '../lib/plugins/connectionProviderRegistry.js';
import { disconnectPluginConnection, getPluginConnection, putStaticConnection, revokePluginConnectionBestEffort } from '../lib/plugins/pluginConnectionsService.js';
import { getPluginManifest } from '../plugins/pluginManager.js';

function providerFor(req: AuthenticatedRequest, res: Response) {
  const provider = getConnectionProvider(String(req.params.pluginId));
  if (!provider) res.status(404).json({ error: 'Connection provider not found' });
  return provider;
}
export async function getAdminConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const provider = providerFor(req, res); if (!provider) return;
  res.json({ provider: { id: provider.id, displayName: provider.displayName, authType: provider.auth.type }, connection: await getPluginConnection(provider.id) });
}
export async function connectAdminStatic(req: AuthenticatedRequest, res: Response): Promise<void> {
  const provider = providerFor(req, res); if (!provider) return;
  const body = req.body as { credential?: unknown; accountLabel?: unknown };
  if (typeof body.credential !== 'string') { res.status(400).json({ error: 'credential is required' }); return; }
  try { res.status(201).json({ connection: await putStaticConnection({ pluginId: provider.id, value: body.credential, accountLabel: typeof body.accountLabel === 'string' ? body.accountLabel : undefined }) }); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to connect' }); }
}
export async function disconnectAdminConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const provider = providerFor(req, res); if (!provider) return;
  await revokePluginConnectionBestEffort(provider.id, getPluginManifest(provider.id)?.outboundOrigins ?? []);
  try { res.json({ connection: await disconnectPluginConnection(provider.id) }); }
  catch { res.status(404).json({ error: 'Connection not found' }); }
}
