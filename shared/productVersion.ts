const FALLBACK_VERSION = '0.0.0';
const ROOT_PACKAGE_NAME = 'esiana';

export function normalizeProductVersion(raw: string): string {
  const version = raw.trim().replace(/^v/i, '');
  return version || FALLBACK_VERSION;
}

export function readVersionFromPackageJson(pkg: {
  name?: string;
  version?: string;
}): string {
  if (pkg.name !== ROOT_PACKAGE_NAME) {
    return FALLBACK_VERSION;
  }
  const version = typeof pkg.version === 'string' ? pkg.version.trim() : '';
  return version || FALLBACK_VERSION;
}
