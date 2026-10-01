import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to `backend/prisma` — historical base for `file:./dev.db`. */
export function getPrismaDir(): string {
  // src/lib → backend/prisma
  return path.resolve(moduleDir, '../../prisma');
}

/**
 * Resolve a SQLite `file:` URL (or bare relative path) to an absolute `file:` URL.
 * Relative paths are resolved against `backend/prisma` so the same DB is used
 * regardless of process cwd (matches deploy-sqlite-migrations.mjs).
 */
export function resolveSqliteDatabaseUrl(
  databaseUrl: string,
  prismaDir: string = getPrismaDir(),
): string {
  const raw = (databaseUrl || 'file:./dev.db').trim();
  if (
    raw === ':memory:' ||
    raw.startsWith('file:memory:') ||
    raw.startsWith('file::memory:')
  ) {
    return raw;
  }

  let filePath: string;
  if (raw.startsWith('file:')) {
    filePath = raw.slice('file:'.length);
    // file:///C:/... or file:///tmp/... → /C:/... or /tmp/...
    if (filePath.startsWith('///')) {
      filePath = filePath.slice(2);
    }
  } else {
    filePath = raw;
  }

  const absolute = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(prismaDir, filePath);

  return `file:${absolute}`;
}

/**
 * Datasource URL for Prisma CLI config and runtime adapters.
 * Resolves relative SQLite `file:` URLs; leaves other URLs unchanged.
 */
export function resolveDatasourceUrl(
  databaseUrl: string | undefined,
  prismaDir: string = getPrismaDir(),
): string | undefined {
  if (databaseUrl === undefined || databaseUrl === '') return databaseUrl;
  if (databaseUrl.startsWith('file:') || databaseUrl === ':memory:') {
    return resolveSqliteDatabaseUrl(databaseUrl, prismaDir);
  }
  return databaseUrl;
}

/**
 * Read `?schema=` from a Postgres connection URL; default `public`.
 */
export function extractPostgresSchema(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.searchParams.get('schema')?.trim() || 'public';
  } catch {
    return 'public';
  }
}
