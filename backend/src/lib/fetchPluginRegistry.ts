import { parsePluginRegistryIndex } from './pluginManifest.js';
import { normalizeRemoteJsonUrl } from './fetchPluginManifest.js';
import { fetchPluginRemoteText, NetworkFetchError } from './networkFetch.js';

export const MAX_REGISTRY_BYTES = 512 * 1024;

const PLUGIN_REGISTRY_TIMEOUT_SECONDS = 15;

function isAllowedPluginJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    normalized === 'application/json' ||
    normalized === 'text/json' ||
    normalized === 'application/manifest+json'
  );
}

function mapNetworkFetchFailure(error: unknown): {
  status: number;
  error: string;
} {
  if (error instanceof NetworkFetchError) {
    const policyFailure =
      error.message.includes('not allowed') ||
      error.message.includes('HTTPS') ||
      error.message.includes('credentials') ||
      error.message.includes('private network');
    return {
      status: policyFailure ? 400 : 502,
      error: error.message,
    };
  }
  return {
    status: 502,
    error: error instanceof Error ? error.message : 'Unable to reach registry URL',
  };
}

export async function fetchAndParsePluginRegistry(
  url: URL,
): Promise<
  | ReturnType<typeof parsePluginRegistryIndex> & { ok: true }
  | { ok: false; status: number; error: string; details?: string[] }
> {
  const fetchUrl = normalizeRemoteJsonUrl(url);

  let rawText: string;
  let contentType: string | null;
  try {
    const fetched = await fetchPluginRemoteText(fetchUrl, {
      maxBytes: MAX_REGISTRY_BYTES,
      timeoutSeconds: PLUGIN_REGISTRY_TIMEOUT_SECONDS,
      headers: { Accept: 'application/json' },
    });
    rawText = fetched.text;
    contentType = fetched.contentType;
  } catch (error) {
    const mapped = mapNetworkFetchFailure(error);
    return { ok: false, status: mapped.status, error: mapped.error };
  }

  if (!isAllowedPluginJsonContentType(contentType)) {
    return {
      ok: false,
      status: 400,
      error: 'Registry URL must return JSON (application/json)',
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'Registry URL did not return valid JSON',
    };
  }

  const parsed = parsePluginRegistryIndex(payload);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid plugin registry index',
      details: [
        ...parsed.errors,
        fetchUrl.hostname === 'github.com'
          ? 'GitHub page URLs must use raw.githubusercontent.com or a /blob/ link (auto-normalized when possible).'
          : 'Expected registry.json with a plugins array, or a single manifest.json plugin object.',
      ],
    };
  }

  return parsed;
}
