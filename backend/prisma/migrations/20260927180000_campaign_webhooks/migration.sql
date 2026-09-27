CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "url" TEXT NOT NULL, "secretEnc" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "subscribedEvents" JSONB NOT NULL, "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "suspendedAt" TIMESTAMP(3), "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookEndpoint_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "endpointId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "responseStatus" INTEGER, "diagnostic" TEXT, "nextAttemptAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WebhookEndpoint_campaignId_idx" ON "WebhookEndpoint"("campaignId");
CREATE INDEX "WebhookDelivery_campaignId_createdAt_idx" ON "WebhookDelivery"("campaignId", "createdAt");
CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx" ON "WebhookDelivery"("endpointId", "createdAt");
CREATE INDEX "WebhookDelivery_status_nextAttemptAt_idx" ON "WebhookDelivery"("status", "nextAttemptAt");
