import { createPrismaClient } from '../src/lib/createPrismaClient.js';

const prisma = createPrismaClient();

function colNames(rows: Array<{ name: string }>) {
  return rows.map((c) => c.name);
}

try {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at`,
  );
  console.log(JSON.stringify(rows, null, 2));

  const campaignCols = colNames(
    await prisma.$queryRawUnsafe(`PRAGMA table_info(Campaign)`),
  );
  console.log('Campaign has templateSettings:', campaignCols.includes('templateSettings'));

  const systemSettingCols = colNames(
    await prisma.$queryRawUnsafe(`PRAGMA table_info(SystemSetting)`),
  );
  console.log('SystemSetting columns:', systemSettingCols);
  console.log(
    'SystemSetting has allowCampaignPluginManifestLink:',
    systemSettingCols.includes('allowCampaignPluginManifestLink'),
  );

  const tables = (
    await prisma.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
    )
  ).map((t) => t.name);
  console.log('Has WikiLink:', tables.includes('WikiLink'));
} finally {
  await prisma.$disconnect();
}
