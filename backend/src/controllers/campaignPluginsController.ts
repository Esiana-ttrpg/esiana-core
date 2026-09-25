import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { paramString } from '../lib/paramString.js';
import {
  enableCampaignPlugin,
  listAvailableCampaignPlugins,
  listCampaignPluginSettings,
  removeCampaignPlugin,
  updateCampaignPluginSetting,
} from '../lib/campaignPlugins.js';
import { prisma } from '../lib/prisma.js';

async function resolveCampaignId(param: string): Promise<string | null> {
  const byId = await prisma.campaign.findUnique({
    where: { id: param },
    select: { id: true },
  });
  if (byId) return byId.id;

  const bySlug = await prisma.campaign.findUnique({
    where: { handle: param },
    select: { id: true },
  });
  return bySlug?.id ?? null;
}

export async function listCampaignPlugins(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = await resolveCampaignId(paramString(req.params.campaignId));
  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const [available, active, connections] = await Promise.all([
    listAvailableCampaignPlugins(),
    listCampaignPluginSettings(campaignId),
    prisma.pluginConnection.findMany({ select: { pluginId: true, status: true } }),
  ]);
  const connectionStatus = new Map(connections.map((row) => [row.pluginId, row.status]));

  const activeIds = new Set(active.map((row) => row.pluginId));

  res.json({
    available: available.filter((plugin) => !activeIds.has(plugin.id)),
    active: active.map((row) => ({ ...row, connectionStatus: connectionStatus.get(row.pluginId) ?? null })),
  });
}

export async function enableCampaignPluginHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = await resolveCampaignId(paramString(req.params.campaignId));
  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const pluginId = req.params.pluginId;
  if (!pluginId || typeof pluginId !== 'string') {
    res.status(400).json({ error: 'Plugin id is required' });
    return;
  }

  try {
    const plugin = await enableCampaignPlugin(campaignId, pluginId);
    res.status(201).json({ plugin });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to enable plugin',
    });
  }
}

export async function removeCampaignPluginHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = await resolveCampaignId(paramString(req.params.campaignId));
  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const pluginId = req.params.pluginId;
  if (!pluginId || typeof pluginId !== 'string') {
    res.status(400).json({ error: 'Plugin id is required' });
    return;
  }

  try {
    await removeCampaignPlugin(campaignId, pluginId);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : 'Campaign plugin not found',
    });
  }
}

export async function saveCampaignPluginConfig(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = await resolveCampaignId(paramString(req.params.campaignId));
  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const pluginId = req.params.pluginId;
  if (!pluginId || typeof pluginId !== 'string') {
    res.status(400).json({ error: 'Plugin id is required' });
    return;
  }

  const body = req.body as { isEnabled?: unknown };

  const isEnabled =
    body.isEnabled === undefined
      ? undefined
      : typeof body.isEnabled === 'boolean'
        ? body.isEnabled
        : null;

  if (isEnabled === null) {
    res.status(400).json({ error: 'isEnabled must be a boolean when provided' });
    return;
  }

  try {
    const existing = await prisma.campaignPluginSetting.findUnique({ where: { campaignId_pluginId: { campaignId, pluginId } }, select: { config: true } });
    if (!existing) { res.status(404).json({ error: 'Campaign plugin not found' }); return; }
    const row = await updateCampaignPluginSetting(
      campaignId,
      pluginId,
      existing.config as Record<string, unknown>,
      isEnabled,
    );
    res.json({ plugin: row });
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : 'Campaign plugin not found',
    });
  }
}
