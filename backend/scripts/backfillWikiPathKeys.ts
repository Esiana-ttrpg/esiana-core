/**
 * Backfill WikiPage.workspace + pathKey for all campaigns.
 * Run: npx tsx backend/scripts/backfillWikiPathKeys.ts
 */
import { prisma } from '../src/lib/prisma.js';
import { backfillCampaignPathKeys } from '../src/lib/wikiPathKeyService.js';

async function main(): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, handle: true, name: true },
  });

  let total = 0;
  for (const campaign of campaigns) {
    const count = await backfillCampaignPathKeys(campaign.id);
    if (count > 0) {
      console.log(
        `Updated ${count} pages for campaign ${campaign.handle ?? campaign.name} (${campaign.id})`,
      );
    }
    total += count;
  }

  console.log(`Backfill complete. ${total} page rows updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
