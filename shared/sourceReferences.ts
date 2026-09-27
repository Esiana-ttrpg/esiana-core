export const SOURCE_REFERENCE_VERSION = 1 as const;
export const SOURCE_REFERENCE_MAX_PAYLOAD_BYTES = 16_384;

export type SourceKind = 'book' | 'document' | 'web' | 'compendium' | 'other';

export interface SourceIdentity {
  providerId: string;
  sourceId: string;
}

export interface SourceMetadata {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  year?: number;
  library?: string;
  thumbnail?: string;
  kind?: SourceKind;
}

export interface SourceLocator {
  label: string;
  data?: unknown;
}

export interface SourceReference {
  payloadVersion: 1;
  identity: SourceIdentity;
  metadata: SourceMetadata;
  locator?: SourceLocator;
  extensions?: Record<string, unknown>;
}

export interface SourceProviderCapabilities {
  search?: boolean;
  resolve?: boolean;
  open?: boolean;
  locators?: boolean;
}

export interface SourceProviderPresentation {
  id: string;
  displayName: string;
  aliases?: string[];
  icon?: string;
  origin?: string;
  capabilities: SourceProviderCapabilities;
}

export interface SourceSearchResult {
  identity: SourceIdentity;
  metadata: SourceMetadata;
}

export type SourceOpenTarget = { type: 'url'; url: string };

function utf8ToBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUtf8(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url payload');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function boundedString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : undefined;
}

function jsonDepth(value: unknown, depth = 0): number {
  if (depth > 8) return depth;
  if (!value || typeof value !== 'object') return depth;
  const values = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  return values.reduce((max, child) => Math.max(max, jsonDepth(child, depth + 1)), depth);
}

export function normalizeSourceReference(value: unknown): SourceReference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || jsonDepth(value) > 8) return null;
  const raw = value as Record<string, unknown>;
  if (raw.payloadVersion !== SOURCE_REFERENCE_VERSION) return null;
  const identity = raw.identity as Record<string, unknown> | undefined;
  const metadata = raw.metadata as Record<string, unknown> | undefined;
  const providerId = boundedString(identity?.providerId, 128);
  const sourceId = boundedString(identity?.sourceId, 512);
  const title = boundedString(metadata?.title, 512);
  if (!providerId || !sourceId || !title) return null;
  const authors = Array.isArray(metadata?.authors)
    ? metadata.authors.map((author) => boundedString(author, 256)).filter((author): author is string => Boolean(author)).slice(0, 32)
    : undefined;
  const kind = ['book', 'document', 'web', 'compendium', 'other'].includes(String(metadata?.kind))
    ? metadata?.kind as SourceKind
    : undefined;
  const locatorRaw = raw.locator as Record<string, unknown> | undefined;
  const locatorLabel = boundedString(locatorRaw?.label, 256);
  const extensions = raw.extensions && typeof raw.extensions === 'object' && !Array.isArray(raw.extensions)
    ? raw.extensions as Record<string, unknown>
    : undefined;
  return {
    payloadVersion: 1,
    identity: { providerId, sourceId },
    metadata: {
      title,
      ...(boundedString(metadata?.subtitle, 512) ? { subtitle: boundedString(metadata?.subtitle, 512) } : {}),
      ...(authors?.length ? { authors } : {}),
      ...(boundedString(metadata?.publisher, 256) ? { publisher: boundedString(metadata?.publisher, 256) } : {}),
      ...(typeof metadata?.year === 'number' && Number.isInteger(metadata.year) && metadata.year >= 0 && metadata.year <= 9999 ? { year: metadata.year } : {}),
      ...(boundedString(metadata?.library, 256) ? { library: boundedString(metadata?.library, 256) } : {}),
      ...(boundedString(metadata?.thumbnail, 2048) ? { thumbnail: boundedString(metadata?.thumbnail, 2048) } : {}),
      ...(kind ? { kind } : {}),
    },
    ...(locatorLabel ? { locator: { label: locatorLabel, ...('data' in (locatorRaw ?? {}) ? { data: locatorRaw?.data } : {}) } } : {}),
    ...(extensions ? { extensions } : {}),
  };
}

export function encodeSourceReference(reference: SourceReference): string {
  const normalized = normalizeSourceReference(reference);
  if (!normalized) throw new Error('Invalid source reference');
  const json = JSON.stringify(normalized);
  if (new TextEncoder().encode(json).byteLength > SOURCE_REFERENCE_MAX_PAYLOAD_BYTES) throw new Error('Source reference payload is too large');
  return `v1:${utf8ToBase64Url(json)}`;
}

export function decodeSourceReference(payload: string): SourceReference | null {
  if (!payload.startsWith('v1:')) return null;
  try {
    const json = base64UrlToUtf8(payload.slice(3));
    if (new TextEncoder().encode(json).byteLength > SOURCE_REFERENCE_MAX_PAYLOAD_BYTES) return null;
    return normalizeSourceReference(JSON.parse(json));
  } catch {
    return null;
  }
}

