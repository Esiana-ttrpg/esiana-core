import { assertUrlSafeForImport } from './ssrfGuard.js';

export class PluginSourcePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginSourcePolicyError';
  }
}

/** Exact host allowlist for plugin supply-chain fetches. Not suffix/wildcard matching. */
export const PLUGIN_SOURCE_HOST_ALLOWLIST = [
  'github.com',
  'gitlab.com',
  'raw.githubusercontent.com',
  'gitlabusercontent.com',
] as const;

const ALLOWED_HOSTS = new Set<string>(PLUGIN_SOURCE_HOST_ALLOWLIST);

export function normalizePluginSourceHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

export function isPluginSourceHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(normalizePluginSourceHostname(hostname));
}

export function assertPluginSourceHost(hostname: string): void {
  const host = normalizePluginSourceHostname(hostname);
  if (!ALLOWED_HOSTS.has(host)) {
    throw new PluginSourcePolicyError(
      'URL host is not allowed for plugin fetches (GitHub or GitLab HTTPS only)',
    );
  }
}

export function assertPluginSourceUrl(url: URL): void {
  assertPluginSourceHost(url.hostname);
}

/** Sync allowlist check for CodeQL guarded-branch analysis (no DNS). */
export function isPluginSourceUrlSync(url: URL): boolean {
  return isPluginSourceHost(url.hostname);
}

export async function resolvePluginUrlSafeForRemoteFetch(url: URL): Promise<URL> {
  assertPluginSourceUrl(url);
  await assertUrlSafeForImport(url, { allowHttp: false });
  return url;
}
