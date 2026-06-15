import { validatePluginManifest, type PluginManifest } from './pluginManifest.js';
import {
  SsrfGuardError,
  assertUrlSafeForImport,
  isUrlSafeForImportSync,
} from '@esiana/ssrf-guard';

export const MAX_MANIFEST_BYTES = 512 * 1024;

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

export async function resolveSafeRemoteJsonUrl(
  url: URL,
  options: { allowHttp: boolean },
): Promise<URL> {
  const normalized = normalizeRemoteJsonUrl(url);
  await assertUrlSafeForImport(normalized, options);
  return normalized;
}

export async function fetchAndValidateManifestFromUrl(
  url: URL,
): Promise<
  | { ok: true; manifest: PluginManifest }
  | { ok: false; status: number; error: string; details?: string[] }
> {
  const normalized = normalizeRemoteJsonUrl(url);

  if (isUrlSafeForImportSync(normalized, { allowHttp: true })) {
    try {
      await assertUrlSafeForImport(normalized, { allowHttp: true });
    } catch (err) {
      if (err instanceof SsrfGuardError) {
        return { ok: false, status: 400, error: err.message };
      }
      throw err;
    }

    let response: globalThis.Response;
    try {
      response = await fetch(normalized.toString(), {
        headers: { Accept: 'application/json' },
        redirect: 'error',
      });
    } catch (err) {
      return {
        ok: false,
        status: 502,
        error:
          err instanceof Error
            ? `Unable to reach manifest URL: ${err.message}`
            : 'Unable to reach manifest URL',
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: `Manifest URL returned HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('text/json') &&
      !contentType.includes('text/plain')
    ) {
      return {
        ok: false,
        status: 400,
        error: 'Manifest URL must return JSON (application/json)',
      };
    }

    const rawText = await response.text();
    if (rawText.length > MAX_MANIFEST_BYTES) {
      return {
        ok: false,
        status: 400,
        error: 'Manifest file exceeds maximum allowed size',
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

  try {
    await assertUrlSafeForImport(normalized, { allowHttp: true });
  } catch (err) {
    if (err instanceof SsrfGuardError) {
      return { ok: false, status: 400, error: err.message };
    }
    throw err;
  }

  return { ok: false, status: 400, error: 'URL target is not allowed' };
}
