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

function parseConfigBody(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

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

  const [available, active] = await Promise.all([
    listAvailableCampaignPlugins(),
    listCampaignPluginSettings(campaignId),
  ]);

  const activeIds = new Set(active.map((row) => row.pluginId));

  res.json({
    available: available.filter((plugin) => !activeIds.has(plugin.id)),
    active,
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

  const body = req.body as { config?: unknown; isEnabled?: unknown };
  const config = parseConfigBody(body.config);
  if (!config) {
    res.status(400).json({ error: 'config must be a JSON object' });
    return;
  }

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
    const row = await updateCampaignPluginSetting(
      campaignId,
      pluginId,
      config,
      isEnabled,
    );
    res.json({ plugin: row });
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : 'Campaign plugin not found',
    });
  }
}
