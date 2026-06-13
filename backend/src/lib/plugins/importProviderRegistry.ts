import type { IRouter } from 'express';

export interface ImportProviderDefinition {
  id: string;
  label: string;
  description?: string;
  requiresFile?: boolean;
  requiresAuth?: boolean;
  validate?: (input: Record<string, unknown>) => Promise<void> | void;
  import: (input: {
    campaignId: string;
    userId: string;
    payload: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>;
}

const importProviders = new Map<string, ImportProviderDefinition>();

const KEY_SEP = '::';

export function registerImportProvider(
  pluginId: string,
  definition: ImportProviderDefinition,
): void {
  importProviders.set(`${pluginId}${KEY_SEP}${definition.id}`, definition);
}

export function listImportProviders(): Array<
  ImportProviderDefinition & { pluginId: string; providerId: string }
> {
  return [...importProviders.entries()].map(([key, def]) => {
    const [pluginId, providerId] = key.split(KEY_SEP);
    return {
      ...def,
      pluginId,
      providerId,
      id: `${pluginId}:${providerId}`,
    };
  });
}

export function getImportProvider(
  compositeId: string,
): ImportProviderDefinition | undefined {
  return importProviders.get(compositeId);
}

export function clearImportProviderRegistry(): void {
  importProviders.clear();
}

export type ImportProviderRegisterFn = (router: IRouter) => void;
