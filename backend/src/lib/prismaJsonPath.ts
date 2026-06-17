import { env } from '../config/env.js';

/** Prisma JsonFilter.path: string on SQLite, string[] on PostgreSQL. */
export function prismaJsonPath(key: string): string | string[] {
  const provider = process.env.DATABASE_PROVIDER ?? env.databaseProvider;
  return provider === 'sqlite' ? key : [key];
}
