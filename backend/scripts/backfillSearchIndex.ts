/**
 * Backfill SearchIndexDocument rows for campaigns.
 *
 * Run from repo root:
 *   npx tsx backend/scripts/backfillSearchIndex.ts --all
 *   npx tsx backend/scripts/backfillSearchIndex.ts --campaign <idOrHandle>
 */
import { prisma } from '../src/lib/prisma.js';
import { rebuildSearchIndexForCampaign } from '../src/lib/search/index/searchIndexService.js';

function parseArgs(argv: string[]): { campaign?: string; all: boolean } {
  let campaign: string | undefined;
  let all = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') {
      all = true;
      continue;
    }
    if (arg === '--campaign') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        console.error('--campaign requires an id or handle value');
        process.exit(1);
      }
      campaign = value;
      i += 1;
      continue;
    }
  }
  return { campaign, all: all || !campaign };
}

async function main(): Promise<void> {
  const { campaign: campaignFilter, all } = parseArgs(process.argv.slice(2));

  if (!all && !campaignFilter) {
    console.error('Pass --all or --campaign <idOrHandle>');
    process.exit(1);
  }

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
