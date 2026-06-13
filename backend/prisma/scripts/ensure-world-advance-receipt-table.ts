/**
 * Idempotent: create WorldAdvanceReceipt if missing (dev DBs behind migration history).
 * SQLite-only maintenance script — not used in production paths.
 */
import { prisma } from '../../src/lib/prisma.js';

const rows = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT name FROM sqlite_master WHERE type='table' AND name='WorldAdvanceReceipt'
`;
if (rows.length > 0) {
  console.log('WorldAdvanceReceipt already exists');
} else {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "WorldAdvanceReceipt" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "campaignId" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "effectId" TEXT NOT NULL,
      "idempotencyKey" TEXT NOT NULL,
      "chronologyEventId" TEXT NOT NULL,
      "semanticsVersion" TEXT NOT NULL DEFAULT 'world-advance-v1',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorldAdvanceReceipt_campaignId_idempotencyKey_key" UNIQUE ("campaignId", "idempotencyKey"),
      CONSTRAINT "WorldAdvanceReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX "WorldAdvanceReceipt_campaignId_batchId_idx" ON "WorldAdvanceReceipt"("campaignId", "batchId");
    CREATE INDEX "WorldAdvanceReceipt_campaignId_chronologyEventId_idx" ON "WorldAdvanceReceipt"("campaignId", "chronologyEventId");
  `);
  console.log('Created WorldAdvanceReceipt table');
}
await prisma.$disconnect();
