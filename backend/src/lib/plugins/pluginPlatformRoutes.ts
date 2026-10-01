import type { IRouter, Request, Response } from 'express';
import { pluginAssetUpload } from '../multer.js';
import type { PluginHostContext } from './pluginHostContext.js';
import { getPluginJailedCampaignId } from './pluginCampaignJail.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireTokenScopes } from '../../middleware/auth.js';
import { API_TOKEN_SCOPES } from '../apiToken.js';
import { prisma } from '../prisma.js';
import { ContentSyncError } from './contentSyncService.js';

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
  const readScope = requireTokenScopes([API_TOKEN_SCOPES.CAMPAIGN_READ]);
  const writeScope = requireTokenScopes([API_TOKEN_SCOPES.CAMPAIGN_WRITE]);
  const requireGm = async (req: Request, res: Response, next: () => void) => {
    const campaignId = getPluginJailedCampaignId(req);
    const userId = (req as AuthenticatedRequest).user?.id;
    const membership = campaignId && userId
      ? await prisma.campaignMember.findUnique({ where: { userId_campaignId: { userId, campaignId } }, select: { role: true } })
      : null;
    if (!membership || membership.role !== 'GAMEMASTER') {
      res.status(403).json({ error: 'Game Master access required' });
      return;
    }
    next();
  };
  const sendContentSyncError = (res: Response, error: unknown) => {
    if (error instanceof ContentSyncError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 400;
      res.status(status).json({ error: error.message, code: error.code, current: error.current });
      return;
    }
    sendServiceError(res, error);
  };

  router.get('/content-sync/collections', readScope, requireGm, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      res.json({ collections: context.contentSync.listCollections() });
    } catch (error) { sendContentSyncError(res, error); }
  });

  router.get('/content-sync/collections/:collection/resources', readScope, requireGm, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      res.json(await context.contentSync.list(String(req.params.collection), {
        cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
        limit: Number(req.query.limit) || undefined,
        modifiedSince: typeof req.query.modifiedSince === 'string' ? req.query.modifiedSince : undefined,
      }));
    } catch (error) { sendContentSyncError(res, error); }
  });

  router.get('/content-sync/collections/:collection/resources/:id', readScope, requireGm, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const resource = await context.contentSync.get(String(req.params.collection), String(req.params.id));
      if (!resource) { res.status(404).json({ error: 'Resource not found' }); return; }
      res.json({ resource });
    } catch (error) { sendContentSyncError(res, error); }
  });

  router.post('/content-sync/collections/:collection/resources', writeScope, requireGm, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const resource = await context.contentSync.create(String(req.params.collection), req.body, (req as AuthenticatedRequest).user?.id);
      res.status(201).json({ resource });
    } catch (error) { sendContentSyncError(res, error); }
  });

  router.patch('/content-sync/collections/:collection/resources/:id', writeScope, requireGm, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const resource = await context.contentSync.update(String(req.params.collection), String(req.params.id), req.body, (req as AuthenticatedRequest).user?.id);
      res.json({ resource });
    } catch (error) { sendContentSyncError(res, error); }
  });
  router.get('/campaign/calendar', readScope, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.calendar.getCurrentDate();
      res.json(data);
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/timeline/recent', readScope, async (req, res) => {
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

  router.get('/campaign/party', readScope, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.party.getCurrentParty(viewerUserId(req));
      res.json({ members: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/world', readScope, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.world.getSummary();
      res.json(data);
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/lore/characters', readScope, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.lore.getCharacters(viewerUserId(req));
      res.json({ entries: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/lore/organizations', readScope, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.lore.getOrganizations(viewerUserId(req));
      res.json({ entries: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/lore/locations', readScope, async (req, res) => {
    try {
      const context = resolveContext(req, res, buildContext);
      if (!context) return;
      const data = await context.lore.getLocations(viewerUserId(req));
      res.json({ entries: data });
    } catch (error) {
      sendServiceError(res, error);
    }
  });

  router.get('/campaign/maps', readScope, async (req, res) => {
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
