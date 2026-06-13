/**
 * Updates _prisma_migrations.checksum to match current migration.sql files.
 * Use after intentionally editing applied migrations (e.g. SQLite FK fixes).
 *
 * Usage: node prisma/scripts/reconcile-migration-checksums.mjs
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'migrations');
const prisma = new PrismaClient();

function checksumForMigration(migrationName) {
  const sqlPath = path.join(migrationsDir, migrationName, 'migration.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing migration.sql for ${migrationName}`);
  }
  const content = fs.readFileSync(sqlPath, 'utf8');
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

const pruned = await prisma.$executeRaw`
  DELETE FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL
`;
console.log(`Removed ${pruned} rolled-back migration record(s).`);

const applied = await prisma.$queryRaw`
  SELECT migration_name, checksum, finished_at
  FROM _prisma_migrations
  WHERE rolled_back_at IS NULL
  ORDER BY started_at
`;

let updated = 0;
for (const row of applied) {
  if (!row.finished_at) continue;
  const next = checksumForMigration(row.migration_name);
  const stored = String(row.checksum);
  if (next !== stored) {
    await prisma.$executeRaw`
      UPDATE _prisma_migrations
      SET checksum = ${next}
      WHERE migration_name = ${row.migration_name}
        AND rolled_back_at IS NULL
        AND finished_at IS NOT NULL
    `;
    console.log(`updated checksum: ${row.migration_name}`);
    updated += 1;
  }
}

console.log(updated === 0 ? 'All checksums already match.' : `Updated ${updated} checksum(s).`);
await prisma.$disconnect();
