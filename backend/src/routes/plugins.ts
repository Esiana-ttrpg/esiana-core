import { Router } from 'express';
import {
  type AuthenticatedRequest,
  authenticateApiOrSession,
  requireAuthenticatedApiOrSession,
  requireTokenScopes,
} from '../middleware/auth.js';
import { API_TOKEN_SCOPES } from '../lib/apiToken.js';
import { prisma } from '../lib/prisma.js';
import {
  getLoadedPlugins,
  reloadPluginHost,
  setPluginEnabled,
  syncPluginCatalog,
} from '../plugins/pluginManager.js';
import {
  listGlobalFrontendRuntime,
} from '../controllers/frontendPluginsController.js';
import { uninstallPlugin } from '../lib/plugins/pluginUninstall.js';
import { clearPluginQuarantineState } from '../lib/pluginRuntime/pluginDiagnostics.js';

export function createPluginsRouter(): Router {
  const router = Router();

  router.use(authenticateApiOrSession);
  router.use(requireAuthenticatedApiOrSession);

  router.get(
    '/frontend-runtime',
    requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_READ]),
    listGlobalFrontendRuntime,
  );

  router.get(
    '/',
    requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_READ]),
    async (_req, res) => {
      const plugins = await prisma.installedPlugin.findMany({
        orderBy: { name: 'asc' },
      });
      res.json({ plugins, loaded: getLoadedPlugins().map((p) => p.name) });
    },
  );

  router.post(
    '/sync',
    requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_MANAGE]),
    async (_req, res) => {
      const count = await syncPluginCatalog();
      res.json({ synced: count });
    },
  );

  router.post(
    '/:name/install',
    requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_MANAGE]),
    async (req, res) => {
      const name = String(req.params.name);
      const synced = await syncPluginCatalog();
      const plugin = await prisma.installedPlugin.findUnique({
        where: { name },
      });

      if (!plugin) {
        res.status(404).json({
          error: `Plugin "${name}" not found in catalog. Synced ${synced} from disk.`,
        });
        return;
      }

      res.json({ plugin, message: 'Plugin registered. Enable to activate.' });
    },
  );

  router.patch(
    '/:name/enable',
    requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_MANAGE]),
    async (req: AuthenticatedRequest, res) => {
      const name = String(req.params.name);
      const { enabled } = req.body as { enabled?: boolean };

      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'Body must include { enabled: boolean }' });
        return;
      }

      const existing = await prisma.installedPlugin.findUnique({
        where: { name },
      });
      if (!existing) {
        res.status(404).json({ error: 'Plugin not installed' });
        return;
      }

      await setPluginEnabled(name, enabled);
      if (enabled) {
        await clearPluginQuarantineState(name);
      }
      await reloadPluginHost();

      const plugin = await prisma.installedPlugin.findUnique({
        where: { name },
      });
      res.json({ plugin, loaded: getLoadedPlugins().map((p) => p.name) });
    },
  );

  router.delete(
    '/:name',
    requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_MANAGE]),
    async (req, res) => {
      const name = String(req.params.name);
      try {
        await uninstallPlugin(name);
        res.json({ ok: true, message: `Plugin "${name}" uninstalled` });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Uninstall failed';
        res.status(400).json({ error: message });
      }
    },
  );

  return router;
}
