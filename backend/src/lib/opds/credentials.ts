import { createHmac, randomBytes } from 'node:crypto';

export const OPDS_SCOPE = 'opds:read';

/** A keyed digest prevents OPDS secrets (including prefixed secrets) being API tokens. */
export function hashReaderSecret(secret: string, key: string): string {
  return createHmac('sha256', key).update('esiana:opds:credential:v1\0').update(secret).digest('hex');
}

export function generateReaderSecret(): string {
  return `opds_${randomBytes(32).toString('hex')}`;
}

/** Accept Basic for reader clients and Bearer for clients with custom headers. */
export function parseReaderSecret(header: string | undefined): string | null {
  if (!header) return null;
  if (header.startsWith('Bearer ')) return header.slice(7).trim() || null;
  if (!header.startsWith('Basic ')) return null;
  const encoded = header.slice(6);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  return separator < 0 ? null : decoded.slice(separator + 1) || null;
}
