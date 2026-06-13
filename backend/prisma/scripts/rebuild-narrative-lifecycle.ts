/**
 * Backfill NarrativeLifecycleState rows from existing quest metadata.
 * Run after applying migration 20260603160000_narrative_lifecycle_state.
 *
 * Usage: npx tsx backend/prisma/scripts/rebuild-narrative-lifecycle.ts [--campaign <id>]
 */
import { prisma } from '../../src/lib/prisma.js';
import { rebuildNarrativeLifecycleForCampaign } from '../../src/lib/narrativeLifecycleService.js';

async function main(): Promise<void> {
  const campaignArg = process.argv.indexOf('--campaign');
  const campaignId =
    campaignArg >= 0 ? process.argv[campaignArg + 1]?.trim() : undefined;

  if (campaignId) {
    const result = await rebuildNarrativeLifecycleForCampaign(campaignId);
    console.log(`Campaign ${campaignId}: upserted ${result.upserted} lifecycle rows`);
    return;
  }

  const campaigns = await prisma.campaign.findMany({ select: { id: true, name: true } });
  let total = 0;
  for (const campaign of campaigns) {
    const result = await rebuildNarrativeLifecycleForCampaign(campaign.id);
    total += result.upserted;
    if (result.upserted > 0) {
      console.log(`${campaign.name}: ${result.upserted}`);
    }
  }
  console.log(`Done. Upserted ${total} lifecycle rows across ${campaigns.length} campaigns.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
