/**
 * Normalize committed Postgres schema.prisma for SQLite generate / local swap.
 *
 * - provider postgresql → sqlite
 * - Unsupported("tsvector")? → String? (vectors unused on SQLite)
 * - strip `, type: Gin` from @@index (SQLite has no GIN)
 */
export function normalizeSchemaPrismaForSqlite(schema) {
  return schema
    .replaceAll('provider = "postgresql"', 'provider = "sqlite"')
    .replaceAll('Unsupported("tsvector")?', 'String?')
    .replaceAll(', type: Gin', '');
}

/**
 * Normalize committed Postgres migration SQL for SQLite migrate deploy.
 *
 * - TIMESTAMP(3) → DATETIME
 * - JSONB → TEXT
 * - tsvector → TEXT
 * - drop CREATE INDEX … USING GIN statements
 */
export function normalizeMigrationSqlForSqlite(sql) {
  return sql
    .replaceAll('TIMESTAMP(3)', 'DATETIME')
    .replaceAll('JSONB', 'TEXT')
    .replaceAll('tsvector', 'TEXT')
    .replace(
      /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\b[^;]*\bUSING\s+GIN\b[^;]*;\s*$/gim,
      '',
    );
}
