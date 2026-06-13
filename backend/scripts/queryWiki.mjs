import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.wikiPage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, title: true, metadata: true, createdAt: true },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
