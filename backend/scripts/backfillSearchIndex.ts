/**
 * Backfill SearchIndexDocument rows for campaigns.
 *
 * Run from repo root:
 *   npx tsx backend/scripts/backfillSearchIndex.ts
 *   npx tsx backend/scripts/backfillSearchIndex.ts --campaign <idOrHandle>
 *   npx tsx backend/scripts/backfillSearchIndex.ts --all
 */
import { prisma } from '../src/lib/prisma.js';
import { rebuildSearchIndexForCampaign } from '../src/lib/search/index/searchIndexService.js';

function parseArgs(argv: string[]): { campaign?: string; all: boolean } {
  let campaign: string | undefined;
  let all = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') all = true;
    else if (arg === '--campaign') {
      campaign = argv[i + 1];
      i += 1;
    }
  }
  return { campaign, all: all || !campaign };
}

async function main(): Promise<void> {
  const { campaign: campaignFilter, all } = parseArgs(process.argv.slice(2));

  const campaigns = await prisma.campaign.findMany({
    where: campaignFilter
      ? {
          OR: [{ id: campaignFilter }, { handle: campaignFilter }],
        }
      : undefined,
    select: { id: true, handle: true, name: true },
    orderBy: { handle: 'asc' },
  });

  if (campaignFilter && campaigns.length === 0) {
    console.error(`No campaign found for ${campaignFilter}`);
    process.exit(1);
  }

  if (!all && !campaignFilter) {
    console.error('Pass --all or --campaign <idOrHandle>');
    process.exit(1);
  }

  let totalDocs = 0;
  for (const campaign of campaigns) {
    const beforePages = await prisma.wikiPage.count({
      where: { campaignId: campaign.id, deletedAt: null },
    });
    const indexed = await rebuildSearchIndexForCampaign(campaign.id);
    const afterDocs = await prisma.searchIndexDocument.count({
      where: { campaignId: campaign.id },
    });
    console.log(
      `${campaign.handle ?? campaign.name} (${campaign.id}): pages=${beforePages} indexed=${indexed} docs=${afterDocs}`,
    );
    totalDocs += afterDocs;
  }

  console.log(`Backfill complete. ${campaigns.length} campaign(s), ${totalDocs} document(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
