-- CreateTable
CREATE TABLE "WorldAdvanceReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "effectId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "chronologyEventId" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'world-advance-v1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldAdvanceReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorldAdvanceReceipt_campaignId_batchId_idx" ON "WorldAdvanceReceipt"("campaignId", "batchId");

-- CreateIndex
CREATE INDEX "WorldAdvanceReceipt_campaignId_chronologyEventId_idx" ON "WorldAdvanceReceipt"("campaignId", "chronologyEventId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldAdvanceReceipt_campaignId_idempotencyKey_key" ON "WorldAdvanceReceipt"("campaignId", "idempotencyKey");
