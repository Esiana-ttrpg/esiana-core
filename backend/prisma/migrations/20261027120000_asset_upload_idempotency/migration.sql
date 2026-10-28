-- CreateTable
CREATE TABLE "AssetOperationIdempotency" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetOperationIdempotency_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssetOperationIdempotency_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AssetOperationIdempotency_expiresAt_idx" ON "AssetOperationIdempotency"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetOperationIdempotency_campaignId_userId_operation_key_key" ON "AssetOperationIdempotency"("campaignId", "userId", "operation", "key");
