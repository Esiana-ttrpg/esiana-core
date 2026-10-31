import { prisma } from '../src/lib/prisma.js';
import { ensureChronologyWikiWorkspaces } from '../src/lib/chronologyWikiWorkspace.js';

// The same idempotent migration also runs before wiki browsing, resolution and search.
try {
  const campaigns = await prisma.campaign.findMany({ select: { id: true } });
  for (const campaign of campaigns) await ensureChronologyWikiWorkspaces(campaign.id);
  console.log(`Checked chronology document ownership in ${campaigns.length} campaigns.`);
} finally {
  await prisma.$disconnect();
}
