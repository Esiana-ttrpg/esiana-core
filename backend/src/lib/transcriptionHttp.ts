import { lookup } from 'node:dns/promises';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Agent, fetch } from 'undici';
import { resolveUrlAddressesForRemoteFetch } from '@esiana/ssrf-guard';
import { createPinnedLookup } from './networkFetch.js';
import { decryptSecret } from './crypto/secretBox.js';
import { assertAudio, AudioError } from './audioCore.js';
import type { ProcessingConnection } from './prismaClient.js';
import type { TranscriptSegmentInput } from '../../../shared/sessionAudio.js';

export interface TranscriptResult { language: string | null; segments: TranscriptSegmentInput[] }
export function normalizeProviderResult(raw: unknown): TranscriptResult {
  assertAudio(raw && typeof raw === 'object', 502, 'invalid_provider_result');
  const result = raw as Record<string, unknown>;
  const source = Array.isArray(result.segments) ? result.segments : result.transcription;
  assertAudio(Array.isArray(source) && source.length <= 100000, 502, 'timestamped_result_required');
  const segments = source.map((value: unknown): TranscriptSegmentInput => {
    assertAudio(value && typeof value === 'object', 502, 'invalid_provider_result');
    const segment = value as Record<string, unknown>;
    const offsets = segment.offsets as { from?: number; to?: number } | undefined;
    const startMs = offsets ? offsets.from : typeof segment.start === 'number' ? Math.round(segment.start * 1000) : undefined;
    const endMs = offsets ? offsets.to : typeof segment.end === 'number' ? Math.round(segment.end * 1000) : undefined;
    assertAudio(typeof startMs === 'number' && Number.isSafeInteger(startMs) && typeof endMs === 'number' &&
      Number.isSafeInteger(endMs) && startMs >= 0 && endMs > startMs && typeof segment.text === 'string', 502, 'invalid_provider_timestamps');
    return { startMs, endMs, text: segment.text, speaker: typeof segment.speaker === 'string' ? segment.speaker : null };
  });
  return { language: typeof result.language === 'string' ? result.language : null, segments };
}
async function providerAgent(connection: ProcessingConnection) {
  const url = new URL(connection.endpoint);
  assertAudio(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.hash && !url.search, 400, 'invalid_endpoint');
  let addresses;
  if (connection.allowPrivateNetwork) {
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    addresses = (await lookup(hostname, { all: true })).map((a) => ({ address: a.address, family: a.family as 4 | 6 }));
    // Explicitly approved LAN/loopback access does not include link-local metadata services.
    assertAudio(addresses.length && addresses.every((a) => !a.address.startsWith('169.254.') && !a.address.toLowerCase().startsWith('fe80:') && a.address !== '0.0.0.0'), 403, 'provider_destination_forbidden');
  } else {
    assertAudio(url.protocol === 'https:', 403, 'provider_requires_https');
    addresses = await resolveUrlAddressesForRemoteFetch(url, { allowHttp: false });
  }
  return new Agent({ connect: { lookup: createPinnedLookup(addresses) } });
}
export async function testProviderConnection(connection: ProcessingConnection) {
  const agent = await providerAgent(connection);
  try {
    const response = await fetch(connection.endpoint, { method: 'HEAD', redirect: 'error', dispatcher: agent,
      signal: AbortSignal.timeout(10000), headers: connection.encryptedCredential ? { Authorization: `Bearer ${decryptSecret(connection.encryptedCredential)}` } : {} });
    await response.body?.cancel();
    assertAudio((response.status >= 200 && response.status < 300) || response.status === 405,
      502, 'provider_connection_failed');
    return { status: 'reachable', capabilitiesVerified: false };
  } finally { await agent.close(); }
}
export async function transcribeHttp(input: {
  connection: ProcessingConnection; modelKey?: string; stream: Readable; sizeBytes: number;
  mimeType: string; format: string; signal: AbortSignal; maxResultBytes: number;
}): Promise<TranscriptResult> {
  const { connection } = input;
  const agent = await providerAgent(connection);
  const boundary = `esiana-${randomUUID()}`;
  const fields: Record<string, string> = { response_format: 'verbose_json' };
  if (input.modelKey) fields.model = input.modelKey;
  if (connection.protocol === 'openai_transcription') fields['timestamp_granularities[]'] = 'segment';
  const prefix = Buffer.from(Object.entries(fields).map(([key, value]) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`).join('') +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.${input.format}"\r\nContent-Type: ${input.mimeType}\r\n\r\n`);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Readable.from((async function* () { yield prefix; for await (const chunk of input.stream) yield chunk; yield suffix; })());
  const signal = AbortSignal.any([input.signal, AbortSignal.timeout(connection.timeoutSeconds * 1000)]);
  try {
    const response = await fetch(connection.endpoint, { method: 'POST', body, duplex: 'half', redirect: 'error', dispatcher: agent, signal,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(prefix.length + input.sizeBytes + suffix.length),
        ...(connection.encryptedCredential ? { Authorization: `Bearer ${decryptSecret(connection.encryptedCredential)}` } : {}) } });
    if ([429, 503].includes(response.status)) { await response.body?.cancel(); throw new AudioError(503, 'provider_transient_rejection'); }
    if (!response.ok) { await response.body?.cancel(); throw new AudioError(502, `provider_http_${response.status}`); }
    assertAudio(response.body, 502, 'empty_provider_response');
    const chunks: Uint8Array[] = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      assertAudio(size <= input.maxResultBytes, 502, 'provider_result_too_large'); chunks.push(chunk);
    }
    let result: unknown;
    try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new AudioError(502, 'invalid_provider_result'); }
    return normalizeProviderResult(result);
  } finally { body.destroy(); input.stream.destroy(); await agent.close(); }
}
