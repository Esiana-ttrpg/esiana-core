import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { prismaJsonPath } from './prismaJsonPath.js';

describe('prismaJsonPath', () => {
  const originalProvider = process.env.DATABASE_PROVIDER;

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.DATABASE_PROVIDER;
    } else {
      process.env.DATABASE_PROVIDER = originalProvider;
    }
  });

  it('returns string[] on postgresql', () => {
    process.env.DATABASE_PROVIDER = 'postgresql';
    assert.deepEqual(prismaJsonPath('entityCategory'), ['entityCategory']);
  });

  it('returns string path on sqlite', () => {
    process.env.DATABASE_PROVIDER = 'sqlite';
    assert.equal(prismaJsonPath('entityCategory'), 'entityCategory');
  });
});
