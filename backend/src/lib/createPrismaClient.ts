import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import {
  extractPostgresSchema,
  resolveSqliteDatabaseUrl,
} from './databaseUrl.js';
import { PrismaClient, type Prisma } from './prismaClient.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });

export type DatabaseProvider = 'postgresql' | 'sqlite';

export type CreatePrismaClientOptions = {
  log?: Prisma.LogLevel[] | Prisma.LogDefinition[];
};

/**
 * Resolve which SQL engine to use.
 *
 * Priority: explicit DATABASE_PROVIDER, then infer from DATABASE_URL.
 * If both are present and disagree, throw — do not silently pick an adapter.
 */
export function resolveDatabaseProvider(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseProvider {
  const explicit = env.DATABASE_PROVIDER?.trim().toLowerCase();
  const url = env.DATABASE_URL ?? '';
  const inferredFromUrl: DatabaseProvider = url.startsWith('file:')
    ? 'sqlite'
    : 'postgresql';

  if (explicit === 'postgresql' || explicit === 'sqlite') {
    if (url && explicit !== inferredFromUrl) {
      throw new Error(
        `DATABASE_PROVIDER=${explicit} contradicts DATABASE_URL (inferred ${inferredFromUrl}). ` +
          `Fix the mismatch before starting.`,
      );
    }
    return explicit;
  }

  if (explicit) {
    throw new Error(
      `DATABASE_PROVIDER must be "postgresql" or "sqlite" (got ${JSON.stringify(explicit)}).`,
    );
  }

  return inferredFromUrl;
}

function createAdapter(provider: DatabaseProvider, databaseUrl: string) {
  if (provider === 'sqlite') {
    const url = resolveSqliteDatabaseUrl(databaseUrl || 'file:./dev.db');
    return new PrismaBetterSqlite3(
      { url },
      { timestampFormat: 'unixepoch-ms' },
    );
  }

  const connectionString =
    databaseUrl || 'postgresql://esiana:esiana@localhost:5432/esiana';
  const schema = extractPostgresSchema(connectionString);

  return new PrismaPg(
    {
      connectionString,
      // Align with Prisma ORM v6 default connection timeout (pg default is 0).
      connectionTimeoutMillis: 5000,
    },
    { schema },
  );
}

/**
 * Construct a PrismaClient with the required driver adapter.
 * Free of app lifecycle / env.ts imports — safe for one-off scripts.
 * Callers that own the client should call `$disconnect()` when finished.
 */
export function createPrismaClient(
  options: CreatePrismaClientOptions = {},
): PrismaClient {
  const provider = resolveDatabaseProvider();
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const adapter = createAdapter(provider, databaseUrl);

  return new PrismaClient({
    adapter,
    log: options.log,
  });
}
