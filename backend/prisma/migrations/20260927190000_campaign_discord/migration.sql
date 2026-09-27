CREATE TABLE "DiscordDestination" (
 "id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "webhookUrlEnc" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true, "subscribedEvents" JSONB NOT NULL,
 "announcementOptions" JSONB, "consecutiveFailures" INTEGER NOT NULL DEFAULT 0, "suspendedAt" TIMESTAMP(3),
 "lastSucceededAt" TIMESTAMP(3), "lastFailedAt" TIMESTAMP(3), "lastError" TEXT, "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DiscordDestination_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "DiscordDelivery" (
 "id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "destinationId" TEXT NOT NULL,
 "eventId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
 "attemptCount" INTEGER NOT NULL DEFAULT 0, "responseStatus" INTEGER, "diagnostic" TEXT, "nextAttemptAt" TIMESTAMP(3),
 "deliveredAt" TIMESTAMP(3), "isTest" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DiscordDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "DiscordDelivery_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "DiscordDestination"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DiscordDestination_campaignId_idx" ON "DiscordDestination"("campaignId");
CREATE INDEX "DiscordDelivery_campaignId_createdAt_idx" ON "DiscordDelivery"("campaignId", "createdAt");
CREATE INDEX "DiscordDelivery_destinationId_createdAt_idx" ON "DiscordDelivery"("destinationId", "createdAt");
CREATE INDEX "DiscordDelivery_status_nextAttemptAt_idx" ON "DiscordDelivery"("status", "nextAttemptAt");
