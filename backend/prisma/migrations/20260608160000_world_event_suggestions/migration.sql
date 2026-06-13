-- Layer 1 — pending world event prompts from pressure projection
CREATE TABLE "CampaignWorldEventSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'time_hook',
    "sourceRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "primaryOrgPageId" TEXT,
    "eraId" TEXT,
    "momentumState" TEXT,
    "trendDirection" TEXT,
    "acceptedCalendarEventId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignWorldEventSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignWorldEventSuggestion_primaryOrgPageId_fkey" FOREIGN KEY ("primaryOrgPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignWorldEventSuggestion_acceptedCalendarEventId_fkey" FOREIGN KEY ("acceptedCalendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignWorldEventSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CampaignWorldEventSuggestion_acceptedCalendarEventId_key" ON "CampaignWorldEventSuggestion"("acceptedCalendarEventId");
CREATE UNIQUE INDEX "CampaignWorldEventSuggestion_campaignId_idempotencyKey_key" ON "CampaignWorldEventSuggestion"("campaignId", "idempotencyKey");
CREATE INDEX "CampaignWorldEventSuggestion_campaignId_status_idx" ON "CampaignWorldEventSuggestion"("campaignId", "status");
CREATE INDEX "CampaignWorldEventSuggestion_campaignId_primaryOrgPageId_momentumState_idx" ON "CampaignWorldEventSuggestion"("campaignId", "primaryOrgPageId", "momentumState");

-- Structured provenance for events created from world pressure prompts
-- SQLite + Prisma: use JSONB affinity (plain JSON breaks Prisma reads)
ALTER TABLE "CalendarEvent" ADD COLUMN "metadata" JSONB;
