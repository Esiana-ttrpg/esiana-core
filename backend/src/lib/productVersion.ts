import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVersionFromPackageJson } from '../../../shared/productVersion.js';

const FALLBACK_VERSION = '0.0.0';

function readRootPackageVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (true) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === 'esiana') {
        return readVersionFromPackageJson(pkg);
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  console.warn(
    '[version] Could not locate root package.json; falling back to 0.0.0',
  );
  return FALLBACK_VERSION;
}

export const PRODUCT_VERSION = readRootPackageVersion();
