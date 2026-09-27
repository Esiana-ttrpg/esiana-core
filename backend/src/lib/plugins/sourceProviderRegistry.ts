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

function boundedText(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : undefined;
}

function normalizeMetadata(input: unknown): SourceMetadata | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const metadata = input as Record<string, unknown>;
  const title = boundedText(metadata.title, 512);
  if (!title) return null;
  const subtitle = boundedText(metadata.subtitle, 512);
  const publisher = boundedText(metadata.publisher, 256);
  const library = boundedText(metadata.library, 256);
  const thumbnail = typeof metadata.thumbnail === 'string' ? safeUrl(metadata.thumbnail) : undefined;
  const year = typeof metadata.year === 'number' && Number.isInteger(metadata.year) && metadata.year >= 0 && metadata.year <= 9999 ? metadata.year : undefined;
  const authors = Array.isArray(metadata.authors)
    ? metadata.authors.map((author) => boundedText(author, 256)).filter((author): author is string => Boolean(author)).slice(0, 32)
    : undefined;
  const kind = ['book', 'document', 'web', 'compendium', 'other'].includes(String(metadata.kind)) ? metadata.kind as SourceMetadata['kind'] : undefined;
  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(authors?.length ? { authors } : {}),
    ...(publisher ? { publisher } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(library ? { library } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    ...(kind ? { kind } : {}),
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
      if (!await registration.isEnabledForCampaign(input.campaignId).catch(() => false)) {
        return { providerId: registration.definition.id, results: [], diagnostic: 'disabled' };
      }
      return { providerId: registration.definition.id, results: (Array.isArray(results) ? results : []).slice(0, limit).flatMap((result: unknown) => {
        if (!result || typeof result !== 'object' || Array.isArray(result)) return [];
        const candidate = result as { identity?: unknown; metadata?: unknown };
        const identity = candidate.identity && typeof candidate.identity === 'object' && !Array.isArray(candidate.identity) ? candidate.identity as Record<string, unknown> : null;
        const sourceId = boundedText(identity?.sourceId, 512);
        const metadata = normalizeMetadata(candidate.metadata);
        if (!metadata || identity?.providerId !== registration.definition.id || !sourceId) return [];
        return [{ identity: { providerId: registration.definition.id, sourceId }, metadata }];
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
  if (!await provider.isEnabledForCampaign(input.campaignId).catch(() => false)) return null;
  const normalized = metadata ? normalizeMetadata(metadata) : null;
  return normalized ? { ...input.reference, metadata: normalized } : null;
}

export async function resolveSourceOpenTarget(input: { campaignId: string; userId: string; reference: SourceReference }): Promise<SourceOpenTarget | null> {
  const provider = await requireProvider(input.campaignId, input.reference.identity.providerId);
  if (!provider?.definition.resolveOpenTarget) return null;
  const target = await bounded((signal) => provider.definition.resolveOpenTarget!(input.reference.identity.sourceId, input.reference.locator, { campaignId: input.campaignId, userId: input.userId, limit: 1, signal }));
  if (!await provider.isEnabledForCampaign(input.campaignId).catch(() => false)) return null;
  if (!target || target.type !== 'url') return null;
  const url = safeUrl(target.url);
  return url?.startsWith('http://') || url?.startsWith('https://') ? { type: 'url', url } : null;
}
