import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const title = process.argv[2] || 'New Character test';
  const page = await prisma.wikiPage.findFirst({ where: { title }, select: { id: true, campaignId: true, metadata: true } });
  console.log(JSON.stringify(page, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
