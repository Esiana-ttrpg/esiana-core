import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at`,
  );
  console.log(JSON.stringify(rows, null, 2));

  const campaignCols = (
    await prisma.$queryRawUnsafe(`PRAGMA table_info(Campaign)`)
  ).map((c) => c.name);
  console.log('Campaign has templateSettings:', campaignCols.includes('templateSettings'));

  const systemSettingCols = colNames(
    await prisma.$queryRawUnsafe(`PRAGMA table_info(SystemSetting)`),
  );
  console.log('SystemSetting columns:', systemSettingCols);
  console.log(
    'SystemSetting has allowCampaignPluginManifestLink:',
    systemSettingCols.includes('allowCampaignPluginManifestLink'),
  );
  console.log('Has WikiLink:', tables.includes('WikiLink'));
} finally {
  await prisma.$disconnect();
}
