import { validatePluginManifest, type PluginManifest } from './pluginManifest.js';
import {
  fetchPluginRemoteText,
  NetworkFetchError,
} from './networkFetch.js';

export const MAX_MANIFEST_BYTES = 512 * 1024;

const PLUGIN_MANIFEST_TIMEOUT_SECONDS = 15;

export function parseTargetUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Rewrites github.com blob/raw links to raw.githubusercontent.com so fetches return JSON.
 */
export function normalizeRemoteJsonUrl(input: URL): URL {
  if (input.hostname !== 'github.com') {
    return input;
  }

  const parts = input.pathname.split('/').filter(Boolean);
  if (parts.length >= 5 && parts[2] === 'blob') {
    const [owner, repo, , ref, ...pathParts] = parts;
    return new URL(
      `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${pathParts.join('/')}`,
    );
  }

  if (parts.length >= 5 && parts[2] === 'raw') {
    const [owner, repo, , ref, ...pathParts] = parts;
    return new URL(
      `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${pathParts.join('/')}`,
    );
  }

  return input;
}

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
    error: error instanceof Error ? error.message : 'Unable to reach manifest URL',
  };
}

export async function fetchAndValidateManifestFromUrl(
  url: URL,
): Promise<
  | { ok: true; manifest: PluginManifest }
  | { ok: false; status: number; error: string; details?: string[] }
> {
  const fetchUrl = normalizeRemoteJsonUrl(url);

  let rawText: string;
  let contentType: string | null;
  try {
    const fetched = await fetchPluginRemoteText(fetchUrl, {
      maxBytes: MAX_MANIFEST_BYTES,
      timeoutSeconds: PLUGIN_MANIFEST_TIMEOUT_SECONDS,
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
      error: 'Manifest URL must return JSON (application/json)',
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'Manifest URL did not return valid JSON',
    };
  }

  const result = validatePluginManifest(payload);
  if (!result.ok) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid plugin manifest',
      details: result.errors,
    };
  }

  return { ok: true, manifest: result.manifest };
}
