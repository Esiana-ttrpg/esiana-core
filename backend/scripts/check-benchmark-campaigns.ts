import { prisma } from '../src/lib/prisma.js';

const rows = await prisma.campaign.findMany({
  where: { handle: { startsWith: 'baseline-benchmark' } },
  orderBy: { createdAt: 'desc' },
  select: { handle: true, _count: { select: { wikiPages: true } } },
  take: 5,
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
