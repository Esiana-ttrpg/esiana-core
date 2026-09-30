import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveDatabaseProvider } from './createPrismaClient.js';

describe('resolveDatabaseProvider', () => {
  it('uses explicit DATABASE_PROVIDER when set', () => {
    assert.equal(
      resolveDatabaseProvider({
        DATABASE_PROVIDER: 'sqlite',
        DATABASE_URL: 'file:./dev.db',
      }),
      'sqlite',
    );
    assert.equal(
      resolveDatabaseProvider({
        DATABASE_PROVIDER: 'postgresql',
        DATABASE_URL: 'postgresql://localhost/esiana',
      }),
      'postgresql',
    );
  });

  it('infers provider from DATABASE_URL when DATABASE_PROVIDER is unset', () => {
    assert.equal(
      resolveDatabaseProvider({ DATABASE_URL: 'file:./dev.db' }),
      'sqlite',
    );
    assert.equal(
      resolveDatabaseProvider({ DATABASE_URL: 'postgresql://localhost/esiana' }),
      'postgresql',
    );
    assert.equal(resolveDatabaseProvider({}), 'postgresql');
  });

  it('throws when explicit provider contradicts DATABASE_URL', () => {
    assert.throws(
      () =>
        resolveDatabaseProvider({
          DATABASE_PROVIDER: 'postgresql',
          DATABASE_URL: 'file:./dev.db',
        }),
      /contradicts DATABASE_URL/,
    );
    assert.throws(
      () =>
        resolveDatabaseProvider({
          DATABASE_PROVIDER: 'sqlite',
          DATABASE_URL: 'postgresql://localhost/esiana',
        }),
      /contradicts DATABASE_URL/,
    );
  });

  it('throws on unsupported DATABASE_PROVIDER values', () => {
    assert.throws(
      () => resolveDatabaseProvider({ DATABASE_PROVIDER: 'mysql' }),
      /must be "postgresql" or "sqlite"/,
    );
  });
});
