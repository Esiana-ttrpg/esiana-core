import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCT_VERSION } from './productVersion.js';

test('PRODUCT_VERSION matches monorepo root package.json', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  const rootPkg = JSON.parse(
    readFileSync(join(repoRoot, 'package.json'), 'utf8'),
  ) as { name?: string; version?: string };

  assert.equal(rootPkg.name, 'esiana');
  assert.equal(PRODUCT_VERSION, rootPkg.version?.trim() || '0.0.0');
});
