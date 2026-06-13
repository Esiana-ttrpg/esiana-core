/**
 * Backfill handle field for campaigns missing a valid handle.
 */

import { prisma } from '../src/lib/prisma.js';
import { generateHandle, makeUniqueHandle } from '../src/lib/handleUtils.js';

async function main() {
  console.log('Starting handle backfill for existing campaigns...');

  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true, handle: true },
  });

  let updated = 0;
  for (const campaign of campaigns) {
    if (campaign.handle?.trim()) continue;

    try {
      const baseHandle = generateHandle(campaign.name);
      const existingHandles = new Set(
        (
          await prisma.campaign.findMany({
            where: {
              handle: { startsWith: baseHandle },
              NOT: { id: campaign.id },
            },
            select: { handle: true },
          })
        ).map((c) => c.handle),
      );
      const handle =
        existingHandles.size > 0
          ? makeUniqueHandle(baseHandle, existingHandles)
          : baseHandle;

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { handle },
      });
      updated++;
      console.log(`Updated campaign ${campaign.id}: ${handle}`);
    } catch (error) {
      console.error(`Failed to update campaign ${campaign.id}:`, error);
    }
  }

  console.log(`Handle backfill complete. Updated ${updated} campaigns.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
