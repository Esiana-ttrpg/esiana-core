import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class SsrfGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfGuardError';
  }
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  return false;
}

function assertIpAllowed(ip: string): void {
  const version = isIP(ip);
  if (version === 4 && isPrivateIpv4(ip)) {
    throw new SsrfGuardError('URL target resolves to a private network address');
  }
  if (version === 6 && isPrivateIpv6(ip)) {
    throw new SsrfGuardError('URL target resolves to a private network address');
  }
  if (version === 0) {
    throw new SsrfGuardError('URL target has an invalid IP address');
  }
}

function assertHostnameAllowed(hostname: string): void {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host) {
    throw new SsrfGuardError('URL hostname is required');
  }
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new SsrfGuardError('URL target hostname is not allowed');
  }
  if (host.endsWith('.localhost')) {
    throw new SsrfGuardError('URL target hostname is not allowed');
  }

  const ipVersion = isIP(host);
  if (ipVersion) {
    assertIpAllowed(host);
    return;
  }
}

async function resolveAndAssertHostname(hostname: string): Promise<void> {
  assertHostnameAllowed(hostname);
  let addresses: string[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true }).then(
      (results) => results.map((entry) => entry.address),
    );
  } catch {
    throw new SsrfGuardError('Unable to resolve URL hostname');
  }
  if (addresses.length === 0) {
    throw new SsrfGuardError('URL hostname did not resolve');
  }
  for (const address of addresses) {
    assertIpAllowed(address);
  }
}

export function assertAllowedImportProtocol(
  url: URL,
  allowHttp: boolean,
): void {
  if (url.protocol === 'https:') return;
  if (allowHttp && url.protocol === 'http:') return;
  throw new SsrfGuardError('URL must use HTTPS');
}

export async function assertUrlSafeForImport(
  url: URL,
  options: { allowHttp: boolean },
): Promise<void> {
  if (url.username || url.password) {
    throw new SsrfGuardError('URL credentials are not allowed');
  }
  assertAllowedImportProtocol(url, options.allowHttp);
  await resolveAndAssertHostname(url.hostname);
}
