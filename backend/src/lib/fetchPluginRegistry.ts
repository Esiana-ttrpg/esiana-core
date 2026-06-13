import { parsePluginRegistryIndex } from './pluginManifest.js';
import { normalizeRemoteJsonUrl } from './fetchPluginManifest.js';

export const MAX_REGISTRY_BYTES = 512 * 1024;

export async function fetchAndParsePluginRegistry(
  url: URL,
): Promise<
  | ReturnType<typeof parsePluginRegistryIndex> & { ok: true }
  | { ok: false; status: number; error: string; details?: string[] }
> {
  const fetchUrl = normalizeRemoteJsonUrl(url);
  let response: globalThis.Response;
  try {
    response = await fetch(fetchUrl.toString(), {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error:
        err instanceof Error
          ? `Unable to reach registry URL: ${err.message}`
          : 'Unable to reach registry URL',
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      error: `Registry URL returned HTTP ${response.status}`,
    };
  }

  const rawText = await response.text();
  if (rawText.length > MAX_REGISTRY_BYTES) {
    return {
      ok: false,
      status: 400,
      error: 'Registry file exceeds maximum allowed size',
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
