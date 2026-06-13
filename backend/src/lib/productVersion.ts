import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function readRootPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, '../../../package.json');
  const raw = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as { version?: string };
  const version = typeof pkg.version === 'string' ? pkg.version.trim() : '';
  return version || '0.0.0';
}

export const PRODUCT_VERSION = readRootPackageVersion();
