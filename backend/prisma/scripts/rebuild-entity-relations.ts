/**
 * Rebuild derived EntityRelation rows for one or all campaigns.
 *
 * Usage:
 *   npx tsx prisma/scripts/rebuild-entity-relations.ts
 *   npx tsx prisma/scripts/rebuild-entity-relations.ts --campaign <campaignId>
 */
import { prisma } from '../../src/lib/prisma.js';
import { rebuildEntityRelationsForCampaign } from '../../src/lib/entityRelationSyncService.js';

async function main(): Promise<void> {
  const campaignArgIdx = process.argv.indexOf('--campaign');
  const campaignId =
    campaignArgIdx >= 0 ? process.argv[campaignArgIdx + 1]?.trim() : undefined;

  if (campaignId) {
    const result = await rebuildEntityRelationsForCampaign(campaignId);
    console.log(JSON.stringify({ campaignId, ...result }, null, 2));
    return;
  }

  const campaigns = await prisma.campaign.findMany({ select: { id: true, handle: true } });
  for (const campaign of campaigns) {
    const result = await rebuildEntityRelationsForCampaign(campaign.id);
    console.log(JSON.stringify({ campaignId: campaign.id, slug: campaign.handle, ...result }));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
