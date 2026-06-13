export interface CspExtensions {
  connectSrc?: string[];
  imgSrc?: string[];
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^\[::1\]$/,
];

function isPrivateNetworkHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function parseCspSource(source: string): URL | null {
  try {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return new URL(source);
    }
    if (source.startsWith('//')) {
      return new URL(`https:${source}`);
    }
    return new URL(`https://${source}`);
  } catch {
    return null;
  }
}

export function filterCspSource(
  source: string,
  options: { trustedInstall: boolean; isDev: boolean },
): { allowed: boolean; reason?: string } {
  const trimmed = source.trim();
  if (!trimmed) return { allowed: false, reason: 'empty' };
  if (trimmed.includes('*')) return { allowed: false, reason: 'wildcards not allowed' };

  const parsed = parseCspSource(trimmed);
  if (!parsed) return { allowed: false, reason: 'invalid URL' };

  const hostname = parsed.hostname;
  const isPrivate = isPrivateNetworkHost(hostname);

  if (isPrivate) {
    if (options.isDev && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')) {
      return { allowed: true };
    }
    if (options.trustedInstall) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'private network requires trusted install' };
  }

  if (!options.isDev && parsed.protocol !== 'https:') {
    return { allowed: false, reason: 'HTTPS required in production' };
  }

  return { allowed: true };
}

export function mergePluginCspExtensions(
  plugins: Array<{ cspExtensions?: CspExtensions; trustedInstall?: boolean }>,
  options: { isDev: boolean },
): CspExtensions {
  const connectSrc = new Set<string>();
  const imgSrc = new Set<string>();

  for (const plugin of plugins) {
    const ext = plugin.cspExtensions;
    if (!ext) continue;
    const trustedInstall = plugin.trustedInstall ?? false;

    for (const src of ext.connectSrc ?? []) {
      const result = filterCspSource(src, { trustedInstall, isDev: options.isDev });
      if (result.allowed) connectSrc.add(src.trim());
    }
    for (const src of ext.imgSrc ?? []) {
      const result = filterCspSource(src, { trustedInstall, isDev: options.isDev });
      if (result.allowed) imgSrc.add(src.trim());
    }
  }

  return {
    ...(connectSrc.size ? { connectSrc: [...connectSrc] } : {}),
    ...(imgSrc.size ? { imgSrc: [...imgSrc] } : {}),
  };
}

export function buildCspMetaContent(
  extensions: CspExtensions,
  options: { isDev: boolean },
): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data:",
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
  ];

  if (extensions.connectSrc?.length) {
    directives.push(`connect-src 'self' ${extensions.connectSrc.join(' ')}`);
  } else {
    directives.push("connect-src 'self'");
  }

  if (extensions.imgSrc?.length) {
    directives.push(`img-src 'self' data: ${extensions.imgSrc.join(' ')}`);
  }

  if (!options.isDev) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export function applyCspMetaTag(content: string): void {
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = content;
  document.head.appendChild(meta);
}
