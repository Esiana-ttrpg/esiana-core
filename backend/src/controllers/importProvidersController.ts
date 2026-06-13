import type { Response } from 'express';
import { listImportProviders } from '../lib/plugins/importProviderRegistry.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export function listImportProvidersHandler(
  _req: AuthenticatedRequest,
  res: Response,
): void {
  const core = [
    {
      source: 'core' as const,
      id: 'markdown-zip',
      label: 'Markdown ZIP',
      description: 'Obsidian-style markdown archive',
    },
    {
      source: 'core' as const,
      id: 'esiana-backup',
      label: 'Esiana Backup',
      description: 'Full campaign backup package',
    },
  ];

  const plugins = listImportProviders().map((provider) => ({
    source: 'plugin' as const,
    id: provider.id,
    pluginId: provider.pluginId,
    providerId: provider.providerId,
    label: provider.label,
    description: provider.description ?? '',
    requiresFile: provider.requiresFile ?? false,
    requiresAuth: provider.requiresAuth ?? false,
  }));

  res.json({ core, plugins });
}
