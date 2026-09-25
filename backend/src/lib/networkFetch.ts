/**
 * networkFetch — transport-level safety: abort, redirect policy, streaming, size limits
 * ssrfGuard — destination safety: DNS/IP/hostname blocklist, scheme validation
 * pluginSourcePolicy — trust boundary: GitHub/GitLab host allowlist
 *
 * fetch() runs only inside guarded branches (sync guard + async resolve on same url).
 */
import fs from 'node:fs';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { Agent, fetch as undiciFetch } from 'undici';
import {
  PluginSourcePolicyError,
  assertPluginSourceUrl,
  isPluginSourceUrlSync,
  resolvePluginUrlSafeForRemoteFetch,
} from '@esiana/plugin-source-policy';
import {
  SsrfGuardError,
  assertUrlSafeForImport,
  isUrlSafeForImportSync,
  resolveUrlAddressesForRemoteFetch,
  resolveUrlSafeForRemoteFetch,
  type ValidatedRemoteAddress,
} from '@esiana/ssrf-guard';
import { env } from '../config/env.js';

export class NetworkFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkFetchError';
  }
}

// INVARIANT: untrusted URLs are fetched exactly once at the validated URL.
// redirect is always 'error'. Redirects are never followed.
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

export interface AuthenticatedRemoteFetchOptions {
  allowedOrigins: string[];
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  timeoutSeconds?: number;
  maxBytes?: number;
  signal?: AbortSignal;
}

export interface AuthenticatedRemoteResponse {
  status: number;
  contentType: string | null;
  body: Buffer;
}

const FORBIDDEN_PLUGIN_HEADERS = new Set([
  'authorization', 'cookie', 'host', 'proxy-authorization', 'forwarded',
  'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
]);

export function createPinnedLookup(addresses: ValidatedRemoteAddress[]) {
  const selected = addresses[0];
  if (!selected) throw new NetworkFetchError('URL hostname did not resolve');
  return (_hostname: string, _options: unknown, callback: (error: Error | null, address: string, family: number) => void) => callback(null, selected.address, selected.family);
}

function pinnedDispatcher(addresses: ValidatedRemoteAddress[]): Agent {
  return new Agent({ connect: { lookup: createPinnedLookup(addresses) } });
}

async function fetchPinned(url: URL, addresses: ValidatedRemoteAddress[], init: NonNullable<Parameters<typeof undiciFetch>[1]>): Promise<{ response: globalThis.Response; dispatcher: Agent }> {
  const dispatcher = pinnedDispatcher(addresses);
  try {
    const response = await undiciFetch(url, { ...init, dispatcher, redirect: 'error' }) as unknown as globalThis.Response;
    return { response, dispatcher };
  } catch (error) {
    await dispatcher.close().catch(() => {});
    throw error;
  }
}

/** Guarded transport for connection credentials. Callers cannot supply auth headers. */
export async function fetchAuthenticatedRemote(
  url: URL,
  injectedHeader: { name: string; value: string },
  options: AuthenticatedRemoteFetchOptions,
): Promise<AuthenticatedRemoteResponse> {
  if (!options.allowedOrigins.includes(url.origin)) {
    throw new NetworkFetchError('Destination origin is not declared by the plugin');
  }
  const allowHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !allowHttp) throw new NetworkFetchError('Authenticated fetch requires HTTPS');
  const devLoopback = allowHttp && env.nodeEnv !== 'production' && env.enablePluginConnectionFixtures;
  let addresses: ValidatedRemoteAddress[];
  if (!devLoopback) {
    if (!isUrlSafeForImportSync(url, { allowHttp })) return rejectRemoteFetchPolicy(url, 'asset', allowHttp);
    try { addresses = await resolveUrlAddressesForRemoteFetch(url, { allowHttp }); }
    catch (error) { throw mapPolicyError(error); }
  } else addresses = [{ address: url.hostname === '::1' ? '::1' : '127.0.0.1', family: url.hostname === '::1' ? 6 : 4 }];

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    const lower = name.toLowerCase();
    if (FORBIDDEN_PLUGIN_HEADERS.has(lower) || lower === injectedHeader.name.toLowerCase() || lower.startsWith('x-forwarded-')) {
      throw new NetworkFetchError(`Header "${name}" is not allowed`);
    }
    headers[name] = value;
  }
  headers[injectedHeader.name] = injectedHeader.value;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timeoutSeconds = Math.min(Math.max(options.timeoutSeconds ?? 10, 1), 30);
  const timeout = setTimeout(() => abortRequest(controller, 'timeout'), timeoutSeconds * 1000);
  let dispatcher: Agent | undefined;
  try {
    const pinned = await fetchPinned(url, addresses, {
      method: options.method ?? 'GET', headers, body: options.body,
      signal: controller.signal,
    });
    const response = pinned.response; dispatcher = pinned.dispatcher;
    const body = response.body;
    if (!body) return { status: response.status, contentType: response.headers.get('content-type'), body: Buffer.alloc(0) };
    const reader = body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    const maxBytes = Math.min(Math.max(options.maxBytes ?? 1024 * 1024, 1), 5 * 1024 * 1024);
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
    return { status: response.status, contentType: response.headers.get('content-type'), body: Buffer.concat(chunks) };
  } catch (error) {
    throw toNetworkFetchError(error, controller, timeoutSeconds);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
    await dispatcher?.close().catch(() => {});
  }
}

/** Core-only OAuth exchange transport. Values are sent only to a declared origin. */
export function fetchOAuthRemote(
  url: URL,
  options: Omit<AuthenticatedRemoteFetchOptions, 'allowedOrigins'> & { allowedOrigins: string[]; authorization?: string },
): Promise<AuthenticatedRemoteResponse> {
  return fetchAuthenticatedRemote(
    url,
    options.authorization
      ? { name: 'Authorization', value: options.authorization }
      : { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
    { ...options, headers: { Accept: 'application/json', ...(options.authorization ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(options.headers ?? {}) } },
  );
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

  if (mode === 'plugin') {
    if (
      isPluginSourceUrlSync(url) &&
      isUrlSafeForImportSync(url, { allowHttp: false })
    ) {
      try {
        await resolvePluginUrlSafeForRemoteFetch(url);
      } catch (error) {
        throw mapPolicyError(error);
      }
      let addresses: ValidatedRemoteAddress[];
      try { addresses = await resolveUrlAddressesForRemoteFetch(url, { allowHttp: false }); }
      catch (error) { throw mapPolicyError(error); }

      const controller = new AbortController();
      const timeoutMs = options.timeoutSeconds * 1000;
      const timeout = setTimeout(() => abortRequest(controller, 'timeout'), timeoutMs);

      try {
        const pinned = await fetchPinned(url, addresses, {
          signal: controller.signal,
          headers: options.headers,
        });
        try { return await readResponseBody(
          pinned.response,
          controller,
          options.maxBytes,
          options.timeoutSeconds,
        ); } finally { await pinned.dispatcher.close().catch(() => {}); }
      } catch (error) {
        throw toNetworkFetchError(error, controller, options.timeoutSeconds);
      } finally {
        clearTimeout(timeout);
      }
    }

    return rejectRemoteFetchPolicy(url, 'plugin', false);
  }

  if (isUrlSafeForImportSync(url, { allowHttp })) {
    try {
      await resolveUrlSafeForRemoteFetch(url, { allowHttp });
    } catch (error) {
      throw mapPolicyError(error);
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutSeconds * 1000;
    const timeout = setTimeout(() => abortRequest(controller, 'timeout'), timeoutMs);

    try {
      const addresses = await resolveUrlAddressesForRemoteFetch(url, { allowHttp });
      const pinned = await fetchPinned(url, addresses, {
        signal: controller.signal,
        headers: options.headers,
      });
      try { return await readResponseBody(
        pinned.response,
        controller,
        options.maxBytes,
        options.timeoutSeconds,
      ); } finally { await pinned.dispatcher.close().catch(() => {}); }
    } catch (error) {
      throw toNetworkFetchError(error, controller, options.timeoutSeconds);
    } finally {
      clearTimeout(timeout);
    }
  }

  return rejectRemoteFetchPolicy(url, 'asset', allowHttp);
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
    try {
      await resolvePluginUrlSafeForRemoteFetch(url);
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
    let dispatcher: Agent | undefined;

    try {
      const addresses = await resolveUrlAddressesForRemoteFetch(url, { allowHttp: false });
      const pinned = await fetchPinned(url, addresses, {
        signal: controller.signal,
        headers: options.headers,
      });
      const response = pinned.response; dispatcher = pinned.dispatcher;

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
      await dispatcher?.close().catch(() => {});
    }
  }

  return rejectRemoteFetchPolicy(url, 'plugin', false);
}
