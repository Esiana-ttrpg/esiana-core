import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function colNames(rows) {
  return rows.map((c) => c.name);
}

try {
  const userCols = colNames(await prisma.$queryRawUnsafe(`PRAGMA table_info(User)`));
  const campaignCols = colNames(await prisma.$queryRawUnsafe(`PRAGMA table_info(Campaign)`));
  const eventCols = colNames(await prisma.$queryRawUnsafe(`PRAGMA table_info(CalendarEvent)`));

  const tables = (
    await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
    )
  ).map((t) => t.name);

  console.log('User has appearanceProfile:', userCols.includes('appearanceProfile'));
  console.log('User has allowCampaignSystemOverride:', userCols.includes('allowCampaignSystemOverride'));
  console.log('Campaign has appearanceProfile:', campaignCols.includes('appearanceProfile'));
  console.log('Campaign has allowPlayerChronologyManagement:', campaignCols.includes('allowPlayerChronologyManagement'));
  console.log('Has _WikiPageToTag:', tables.includes('_WikiPageToTag'));
  console.log('Has _TagToWikiPage:', tables.includes('_TagToWikiPage'));
  console.log('Has TagAssignment:', tables.includes('TagAssignment'));
  console.log('Has TimelineEra:', tables.includes('TimelineEra'));
  console.log('Has CalendarEventCategory:', tables.includes('CalendarEventCategory'));
  console.log('CalendarEvent columns:', eventCols);
} finally {
  await prisma.$disconnect();
}
