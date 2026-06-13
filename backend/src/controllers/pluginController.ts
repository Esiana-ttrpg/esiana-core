import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { fetchAndValidateManifestFromUrl, parseTargetUrl } from '../lib/fetchPluginManifest.js';
import { assertGlobalScope } from '../lib/pluginManifest.js';
import {
  registerGlobalPluginFromManifest,
  serializeSystemPlugin,
} from '../lib/systemPlugins.js';

export async function installPluginFromLink(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const body = req.body as { url?: unknown };
  const target = parseTargetUrl(body.url);

  if (!target) {
    res.status(400).json({
      error: 'A valid http or https manifest URL is required',
    });
    return;
  }

  const fetched = await fetchAndValidateManifestFromUrl(target);
  if (!fetched.ok) {
    res.status(fetched.status).json({
      error: fetched.error,
      ...(fetched.details ? { details: fetched.details } : {}),
    });
    return;
  }

  const scopeError = assertGlobalScope(fetched.manifest);
  if (scopeError) {
    res.status(400).json({ error: scopeError });
    return;
  }

  const row = await registerGlobalPluginFromManifest(fetched.manifest);
  res.status(201).json({ plugin: serializeSystemPlugin(row) });
}
