import type {
  SourceLocator,
  SourceMetadata,
  SourceOpenTarget,
  SourceProviderCapabilities,
  SourceProviderPresentation,
  SourceReference,
  SourceSearchResult,
} from '../../../../shared/sourceReferences.js';

const PROVIDER_TIMEOUT_MS = 3_000;
const MAX_RESULTS = 50;

export interface SourceProviderContext {
  campaignId: string;
  userId: string;
  limit: number;
  signal: AbortSignal;
}

export interface SourceProviderDefinition {
  id: string;
  displayName: string;
  aliases?: string[];
  icon?: string;
  origin?: string;
  capabilities?: SourceProviderCapabilities;
  searchSources(query: string, context: SourceProviderContext): Promise<SourceSearchResult[]>;
  resolveSource(sourceId: string, context: SourceProviderContext): Promise<SourceMetadata | null>;
  resolveOpenTarget?(sourceId: string, locator: SourceLocator | undefined, context: SourceProviderContext): Promise<SourceOpenTarget | null>;
}

type Registration = {
  pluginId: string;
  definition: SourceProviderDefinition;
  isEnabledForCampaign: (campaignId: string) => Promise<boolean>;
};

const providers = new Map<string, Registration>();

function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('storage://asset/')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function presentation(registration: Registration): SourceProviderPresentation {
  const def = registration.definition;
  return {
    id: def.id,
    displayName: def.displayName.slice(0, 128),
    ...(def.aliases?.length ? { aliases: def.aliases.map((alias) => alias.slice(0, 64)).slice(0, 12) } : {}),
    ...(safeUrl(def.icon) ? { icon: safeUrl(def.icon) } : {}),
    ...(safeUrl(def.origin) ? { origin: safeUrl(def.origin) } : {}),
    capabilities: { search: true, resolve: true, open: Boolean(def.resolveOpenTarget), locators: def.capabilities?.locators ?? false },
  };
}

export function registerSourceProvider(pluginId: string, definition: SourceProviderDefinition, isEnabledForCampaign: Registration['isEnabledForCampaign']): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id)) throw new Error('Source provider id must be lowercase kebab-case');
  if (definition.id !== pluginId) throw new Error(`Plugin "${pluginId}" source provider id must match its plugin id`);
  if (providers.has(definition.id)) throw new Error(`Source provider "${definition.id}" is already registered`);
  providers.set(definition.id, { pluginId, definition, isEnabledForCampaign });
}

export function clearSourceProviderRegistry(): void { providers.clear(); }

async function enabledProviders(campaignId: string, providerId?: string): Promise<Registration[]> {
  const candidates = providerId ? [providers.get(providerId)].filter((value): value is Registration => Boolean(value)) : [...providers.values()];
  const enabled = await Promise.all(candidates.map(async (item) => item.isEnabledForCampaign(campaignId).catch(() => false)));
  return candidates.filter((_, index) => enabled[index]);
}

async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Provider timed out')); }, PROVIDER_TIMEOUT_MS);
  });
  try { return await Promise.race([operation(controller.signal), timeout]); }
  finally { if (timer) clearTimeout(timer); }
}

function normalizeMetadata(metadata: SourceMetadata): SourceMetadata | null {
  if (!metadata || typeof metadata.title !== 'string' || !metadata.title.trim()) return null;
  return {
    title: metadata.title.trim().slice(0, 512),
    ...(metadata.subtitle ? { subtitle: metadata.subtitle.slice(0, 512) } : {}),
    ...(Array.isArray(metadata.authors) ? { authors: metadata.authors.filter((v): v is string => typeof v === 'string').slice(0, 32).map((v) => v.slice(0, 256)) } : {}),
    ...(metadata.publisher ? { publisher: metadata.publisher.slice(0, 256) } : {}),
    ...(Number.isInteger(metadata.year) ? { year: metadata.year } : {}),
    ...(metadata.library ? { library: metadata.library.slice(0, 256) } : {}),
    ...(safeUrl(metadata.thumbnail) ? { thumbnail: safeUrl(metadata.thumbnail) } : {}),
    ...(['book', 'document', 'web', 'compendium', 'other'].includes(String(metadata.kind)) ? { kind: metadata.kind } : {}),
  };
}

export async function listSourceProviders(campaignId: string): Promise<SourceProviderPresentation[]> {
  return (await enabledProviders(campaignId)).map(presentation);
}

export async function searchSources(input: { campaignId: string; userId: string; query: string; providerId?: string; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), MAX_RESULTS);
  const active = await enabledProviders(input.campaignId, input.providerId);
  const settled = await Promise.all(active.map(async (registration) => {
    try {
      const results = await bounded((signal) => registration.definition.searchSources(input.query, { campaignId: input.campaignId, userId: input.userId, limit, signal }));
      return { providerId: registration.definition.id, results: results.slice(0, limit).flatMap((result) => {
        const metadata = normalizeMetadata(result.metadata);
        if (!metadata || result.identity.providerId !== registration.definition.id || !result.identity.sourceId) return [];
        return [{ identity: { providerId: registration.definition.id, sourceId: result.identity.sourceId.slice(0, 512) }, metadata }];
      }) };
    } catch (error) {
      return { providerId: registration.definition.id, results: [], diagnostic: error instanceof Error && error.message === 'Provider timed out' ? 'timeout' : 'unavailable' };
    }
  }));
  return { results: settled.flatMap((entry) => entry.results).slice(0, limit), diagnostics: settled.filter((entry) => entry.diagnostic).map(({ providerId, diagnostic }) => ({ providerId, status: diagnostic })) };
}

async function requireProvider(campaignId: string, providerId: string): Promise<Registration | null> {
  return (await enabledProviders(campaignId, providerId))[0] ?? null;
}

export async function resolveSourceReference(input: { campaignId: string; userId: string; reference: SourceReference }): Promise<SourceReference | null> {
  const provider = await requireProvider(input.campaignId, input.reference.identity.providerId);
  if (!provider) return null;
  const metadata = await bounded((signal) => provider.definition.resolveSource(input.reference.identity.sourceId, { campaignId: input.campaignId, userId: input.userId, limit: 1, signal }));
  const normalized = metadata ? normalizeMetadata(metadata) : null;
  return normalized ? { ...input.reference, metadata: normalized } : null;
}

export async function resolveSourceOpenTarget(input: { campaignId: string; userId: string; reference: SourceReference }): Promise<SourceOpenTarget | null> {
  const provider = await requireProvider(input.campaignId, input.reference.identity.providerId);
  if (!provider?.definition.resolveOpenTarget) return null;
  const target = await bounded((signal) => provider.definition.resolveOpenTarget!(input.reference.identity.sourceId, input.reference.locator, { campaignId: input.campaignId, userId: input.userId, limit: 1, signal }));
  if (!target || target.type !== 'url') return null;
  const url = safeUrl(target.url);
  return url?.startsWith('http://') || url?.startsWith('https://') ? { type: 'url', url } : null;
}
