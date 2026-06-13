/** SQLite-only migration inspection helper for local dev. */
import { prisma } from '../../src/lib/prisma.js';

const tables = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT name FROM sqlite_master
  WHERE type='table'
    AND name IN (
      'RumorCirculation',
      'MapPresentationPreset',
      'WorldAdvanceReceipt',
      'SystemAppearanceProfile',
      'CreativeDriftDisposition'
    )
  ORDER BY name
`;

const migrations = await prisma.$queryRaw<
  Array<{ migration_name: string; finished_at: string | null; rolled_back_at: string | null; logs: string | null }>
>`
  SELECT migration_name, finished_at, rolled_back_at, logs
  FROM _prisma_migrations
  WHERE migration_name LIKE '202606%'
  ORDER BY started_at
`;

console.log('Tables:', tables.map((t) => t.name));
console.log('Migrations:', migrations);

await prisma.$disconnect();
