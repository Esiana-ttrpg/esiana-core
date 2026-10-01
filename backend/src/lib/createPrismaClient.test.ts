import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { resolveDatabaseProvider } from './createPrismaClient.js';
import {
  extractPostgresSchema,
  getPrismaDir,
  resolveDatasourceUrl,
  resolveSqliteDatabaseUrl,
} from './databaseUrl.js';

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

describe('resolveSqliteDatabaseUrl', () => {
  it('resolves relative file URLs against backend/prisma', () => {
    const resolved = resolveSqliteDatabaseUrl('file:./dev.db');
    assert.equal(resolved, `file:${path.join(getPrismaDir(), 'dev.db')}`);
  });

  it('leaves absolute file URLs absolute', () => {
    const abs = path.join(getPrismaDir(), 'abs.db');
    const resolved = resolveSqliteDatabaseUrl(`file:${abs}`);
    assert.equal(resolved, `file:${path.normalize(abs)}`);
  });

  it('is used by resolveDatasourceUrl for file URLs only', () => {
    assert.equal(resolveDatasourceUrl(undefined), undefined);
    assert.equal(
      resolveDatasourceUrl('postgresql://localhost/esiana?schema=app'),
      'postgresql://localhost/esiana?schema=app',
    );
    assert.equal(
      resolveDatasourceUrl('file:./dev.db'),
      resolveSqliteDatabaseUrl('file:./dev.db'),
    );
  });
});

describe('extractPostgresSchema', () => {
  it('reads schema query param and defaults to public', () => {
    assert.equal(
      extractPostgresSchema('postgresql://localhost/esiana?schema=campaign'),
      'campaign',
    );
    assert.equal(extractPostgresSchema('postgresql://localhost/esiana'), 'public');
    assert.equal(extractPostgresSchema('not-a-url'), 'public');
  });
});
