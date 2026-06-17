/**
 * networkFetch — transport-level safety: abort, redirect policy, streaming, size limits
 * ssrfGuard — destination safety: DNS/IP/hostname blocklist, scheme validation
 * pluginSourcePolicy — trust boundary: GitHub/GitLab host allowlist
 */
import fs from 'node:fs';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import {
  PluginSourcePolicyError,
  assertPluginSourceUrl,
  isPluginSourceUrlSync,
  resolvePluginUrlSafeForRemoteFetch,
} from './pluginSourcePolicy.js';
import {
  SsrfGuardError,
  assertUrlSafeForImport,
  isUrlSafeForImportSync,
  resolveUrlSafeForRemoteFetch,
} from './ssrfGuard.js';

export class NetworkFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkFetchError';
  }
}

// INVARIANT: untrusted URLs are fetched exactly once at the validated URL.
// redirect is always 'error'. Redirects are never followed.
const REDIRECT_POLICY = 'error' as const;

type FetchMode = 'asset' | 'plugin';
type AbortReason = 'timeout' | 'size-limit';

interface RemoteFetchOptions {
  maxBytes: number;
  timeoutSeconds: number;
  headers?: Record<string, string>;
}

export interface AssetRemoteFetchOptions extends RemoteFetchOptions {
  allowHttp?: boolean;
}

export type PluginRemoteFetchOptions = RemoteFetchOptions;

interface FetchBodyResult {
  buffer: Buffer;
  contentType: string | null;
}

const abortReasonByController = new WeakMap<AbortController, AbortReason>();

/** Single kill switch for all in-flight fetch cancellation. */
function abortRequest(
  controller: AbortController,
  reason: AbortReason,
  reader?: ReadableStreamDefaultReader<Uint8Array>,
): void {
  abortReasonByController.set(controller, reason);
  controller.abort(new Error(reason));
  void reader?.cancel().catch(() => {});
}

function mapPolicyError(error: unknown): NetworkFetchError {
  if (error instanceof PluginSourcePolicyError) {
    return new NetworkFetchError(error.message);
  }
  if (error instanceof SsrfGuardError) {
    return new NetworkFetchError(error.message);
  }
  if (error instanceof NetworkFetchError) {
    return error;
  }
  if (error instanceof Error) {
    return new NetworkFetchError(error.message);
  }
  return new NetworkFetchError('Remote fetch failed');
}

function toNetworkFetchError(
  error: unknown,
  controller: AbortController,
  timeoutSeconds: number,
): NetworkFetchError {
  if (error instanceof NetworkFetchError) {
    return error;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    const reason = abortReasonByController.get(controller);
    if (reason === 'size-limit') {
      return new NetworkFetchError('Response exceeded size limit');
    }
    if (reason === 'timeout') {
      return new NetworkFetchError(`Request timed out after ${timeoutSeconds}s`);
    }
    return new NetworkFetchError(
      `Request aborted (timeout or cancellation after ${timeoutSeconds}s)`,
    );
  }
  if (error instanceof Error) {
    return new NetworkFetchError(`Unable to reach URL: ${error.message}`);
  }
  return new NetworkFetchError('Unable to reach URL');
}

function passesSyncGuard(url: URL, mode: FetchMode, allowHttp: boolean): boolean {
  if (mode === 'plugin') {
    return (
      isPluginSourceUrlSync(url) && isUrlSafeForImportSync(url, { allowHttp: false })
    );
  }
  return isUrlSafeForImportSync(url, { allowHttp });
}

async function readResponseBody(
  response: globalThis.Response,
  controller: AbortController,
  maxBytes: number,
  timeoutSeconds: number,
): Promise<FetchBodyResult> {
  if (!response.ok) {
    throw new NetworkFetchError(`URL returned HTTP ${response.status}`);
  }

  const body = response.body;
  if (!body) {
    throw new NetworkFetchError('URL response had no body');
  }

  const contentType = response.headers.get('content-type');
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        abortRequest(controller, 'size-limit', reader);
        throw new NetworkFetchError('Response exceeded size limit');
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    if (error instanceof NetworkFetchError) throw error;
    throw toNetworkFetchError(error, controller, timeoutSeconds);
  }

  return { buffer: Buffer.concat(chunks), contentType };
}

async function executeRemoteFetch(
  url: URL,
  options: RemoteFetchOptions,
): Promise<FetchBodyResult> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutSeconds * 1000;
  const timeout = setTimeout(() => abortRequest(controller, 'timeout'), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      redirect: REDIRECT_POLICY,
      signal: controller.signal,
      headers: options.headers,
    });
    return await readResponseBody(
      response,
      controller,
      options.maxBytes,
      options.timeoutSeconds,
    );
  } catch (error) {
    throw toNetworkFetchError(error, controller, options.timeoutSeconds);
  } finally {
    clearTimeout(timeout);
  }
}

async function rejectRemoteFetchPolicy(
  url: URL,
  mode: FetchMode,
  allowHttp: boolean,
): Promise<never> {
  try {
    if (mode === 'plugin') {
      assertPluginSourceUrl(url);
    }
    await assertUrlSafeForImport(url, { allowHttp: mode === 'plugin' ? false : allowHttp });
  } catch (error) {
    throw mapPolicyError(error);
  }
  throw new NetworkFetchError('URL is not allowed for remote fetch');
}

async function fetchRemoteBody(
  url: URL,
  mode: FetchMode,
  options: RemoteFetchOptions & { allowHttp?: boolean },
): Promise<FetchBodyResult> {
  const allowHttp = mode === 'plugin' ? false : (options.allowHttp ?? false);

  if (passesSyncGuard(url, mode, allowHttp)) {
    try {
      const validatedUrl =
        mode === 'plugin'
          ? await resolvePluginUrlSafeForRemoteFetch(url)
          : await resolveUrlSafeForRemoteFetch(url, { allowHttp });
      return await executeRemoteFetch(validatedUrl, options);
    } catch (error) {
      throw mapPolicyError(error);
    }
  }

  return rejectRemoteFetchPolicy(url, mode, allowHttp);
}

export async function fetchAssetRemoteBuffer(
  url: URL,
  options: AssetRemoteFetchOptions,
): Promise<Buffer> {
  const result = await fetchRemoteBody(url, 'asset', options);
  return result.buffer;
}

export async function fetchAssetRemoteText(
  url: URL,
  options: AssetRemoteFetchOptions,
): Promise<string> {
  const result = await fetchRemoteBody(url, 'asset', options);
  return result.buffer.toString('utf8');
}

export async function fetchPluginRemoteText(
  url: URL,
  options: PluginRemoteFetchOptions,
): Promise<{ text: string; contentType: string | null }> {
  const result = await fetchRemoteBody(url, 'plugin', options);
  return { text: result.buffer.toString('utf8'), contentType: result.contentType };
}

export async function fetchPluginRemoteStream(
  url: URL,
  destination: string,
  options: PluginRemoteFetchOptions,
): Promise<void> {
  if (
    isPluginSourceUrlSync(url) &&
    isUrlSafeForImportSync(url, { allowHttp: false })
  ) {
    let validatedUrl: URL;
    try {
      validatedUrl = await resolvePluginUrlSafeForRemoteFetch(url);
    } catch (error) {
      throw mapPolicyError(error);
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutSeconds * 1000;
    const timeout = setTimeout(() => abortRequest(controller, 'timeout'), timeoutMs);

    const destinationPath = path.resolve(destination);
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    const out = createWriteStream(destinationPath);
    let total = 0;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
      const response = await fetch(validatedUrl.toString(), {
        redirect: REDIRECT_POLICY,
        signal: controller.signal,
        headers: options.headers,
      });

      if (!response.ok) {
        throw new NetworkFetchError(`URL returned HTTP ${response.status}`);
      }

      const body = response.body;
      if (!body) {
        throw new NetworkFetchError('URL response had no body');
      }

      reader = body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > options.maxBytes) {
          abortRequest(controller, 'size-limit', reader);
          throw new NetworkFetchError('Response exceeded size limit');
        }
        if (!out.write(Buffer.from(value))) {
          await new Promise<void>((resolve, reject) => {
            out.once('drain', () => resolve());
            out.once('error', reject);
          });
        }
      }

      out.end();
      await finished(out);
      return;
    } catch (error) {
      out.destroy();
      await fs.promises.rm(destinationPath, { force: true }).catch(() => {});
      if (error instanceof NetworkFetchError) throw error;
      throw toNetworkFetchError(error, controller, options.timeoutSeconds);
    } finally {
      clearTimeout(timeout);
      void reader?.cancel().catch(() => {});
    }
  }

  return rejectRemoteFetchPolicy(url, 'plugin', false);
}
