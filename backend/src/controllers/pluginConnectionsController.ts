import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { isCampaignPluginEnabled } from '../lib/campaignPlugins.js';
import { getConnectionProvider } from '../lib/plugins/connectionProviderRegistry.js';
import { disconnectPluginConnection, listPluginConnections, putStaticConnection, revokePluginConnectionBestEffort } from '../lib/plugins/pluginConnectionsService.js';
import { getPluginManifest } from '../plugins/pluginManager.js';
import { prisma } from '../lib/prisma.js';

function context(req: CampaignScopedRequest) {
  const campaign = req.campaign!;
  return { campaignId: campaign.campaignId, userId: req.user!.id, isOwner: campaign.campaignOwnerUserId === req.user!.id, pluginId: String(req.params.pluginId) };
}

async function enabled(pluginId: string, campaignId: string, res: Response): Promise<boolean> {
  if (!getConnectionProvider(pluginId) || !await isCampaignPluginEnabled(campaignId, pluginId)) {
    res.status(404).json({ error: 'Connection provider not found' }); return false;
  }
  return true;
}

export async function listConnections(req: CampaignScopedRequest, res: Response): Promise<void> {
  const ctx = context(req);
  if (!await enabled(ctx.pluginId, ctx.campaignId, res)) return;
  const provider = getConnectionProvider(ctx.pluginId)!;
  res.json({ provider: { id: provider.id, displayName: provider.displayName, authType: provider.auth.type, ownership: provider.ownership }, connections: await listPluginConnections(ctx.pluginId, ctx.campaignId, ctx.userId, ctx.isOwner) });
}

export async function connectStatic(req: CampaignScopedRequest, res: Response): Promise<void> {
  const ctx = context(req);
  if (!await enabled(ctx.pluginId, ctx.campaignId, res)) return;
  const body = req.body as { ownerType?: unknown; credential?: unknown; accountLabel?: unknown };
  if (body.ownerType !== 'campaign' && body.ownerType !== 'user') { res.status(400).json({ error: 'ownerType must be campaign or user' }); return; }
  if (body.ownerType === 'campaign' && !ctx.isOwner) { res.status(403).json({ error: 'Only the campaign owner may manage a campaign connection' }); return; }
  if (typeof body.credential !== 'string') { res.status(400).json({ error: 'credential is required' }); return; }
  try {
    const connection = await putStaticConnection({ pluginId: ctx.pluginId, campaignId: ctx.campaignId, ownerType: body.ownerType, ownerId: body.ownerType === 'campaign' ? ctx.campaignId : ctx.userId, value: body.credential, accountLabel: typeof body.accountLabel === 'string' ? body.accountLabel : undefined });
    res.status(201).json({ connection });
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to connect' }); }
}

export async function disconnectConnection(req: CampaignScopedRequest, res: Response): Promise<void> {
  const ctx = context(req);
  if (!await enabled(ctx.pluginId, ctx.campaignId, res)) return;
  const row = await prisma.pluginConnection.findFirst({ where: { id: String(req.params.connectionId), pluginId: ctx.pluginId, campaignId: ctx.campaignId } });
  if (!row) { res.status(404).json({ error: 'Connection not found' }); return; }
  if ((row.ownerType === 'campaign' && !ctx.isOwner) || (row.ownerType === 'user' && row.ownerId !== ctx.userId)) { res.status(404).json({ error: 'Connection not found' }); return; }
  await revokePluginConnectionBestEffort(row.id, ctx.pluginId, ctx.campaignId, getPluginManifest(ctx.pluginId)?.outboundOrigins ?? []);
  res.json({ connection: await disconnectPluginConnection(row.id, ctx.pluginId, ctx.campaignId) });
}
