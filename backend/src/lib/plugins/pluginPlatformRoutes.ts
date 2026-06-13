import type { IRouter, Request, Response } from 'express';
import { pluginAssetUpload } from '../multer.js';
import type { PluginHostContext } from './pluginHostContext.js';
import { getPluginJailedCampaignId } from './pluginCampaignJail.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';

function sendServiceError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Plugin service error';
  if (message.includes('lacks') || message.includes('permission')) {
    res.status(403).json({ error: message });
    return;
  }
  if (message.includes('campaignId is required') || message.includes('jail')) {
    res.status(400).json({ error: message });
    return;
  }
  console.error('[plugins] platform route error', error);
  res.status(500).json({ error: message });
}

function viewerUserId(req: Request): string | null {
  return (req as AuthenticatedRequest).user?.id ?? null;
}

function resolveContext(
  req: Request,
  res: Response,
  buildContext: (campaignId: string) => PluginHostContext,
): PluginHostContext | null {
  const campaignId = getPluginJailedCampaignId(req);
  if (!campaignId) {
    res.status(400).json({
      error: 'campaignHandle query parameter (or X-Campaign-Handle header) is required',
    });
    return null;
  }
  return buildContext(campaignId);
}

export function mountPluginPlatformRoutes(
  router: IRouter,
  buildContext: (campaignId: string) => PluginHostContext,
): void {
  router.get('/campaign/calendar', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.calendar.getCurrentDate();
      res.json(data);
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/timeline/recent', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const limit = Number.parseInt(String(req.query.limit ?? '20'), 10);
      const data = await context.timeline.getRecentEvents(
        Number.isFinite(limit) ? limit : 20,
      );
      res.json({ events: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/party', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.party.getCurrentParty(viewerUserId(req));
      res.json({ members: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/world', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.world.getSummary();
      res.json(data);
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/lore/characters', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.lore.getCharacters(viewerUserId(req));
      res.json({ entries: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/lore/organizations', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.lore.getOrganizations(viewerUserId(req));
      res.json({ entries: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/lore/locations', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.lore.getLocations(viewerUserId(req));
      res.json({ entries: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/maps', async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.maps.list(viewerUserId(req));
      res.json({ maps: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.post('/assets/upload', pluginAssetUpload.single('file'), async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'file is required' });
        return;
      }
      const label =
        typeof req.body?.label === 'string' && req.body.label.trim()
          ? req.body.label.trim()
          : file.originalname;
      const result = await context.assets.upload({
        buffer: file.buffer,
        contentType: file.mimetype,
        label,
      });
      res.status(201).json(result);
    } catch (error) {
      sendServiceError(res, error);
    }
  });
}
