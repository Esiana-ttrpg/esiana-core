-- Idempotent repair for partial 20260606200000 apply (SQLite dev)

CREATE TABLE IF NOT EXISTS "CampaignLedgerSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "entryKind" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "amount" INTEGER,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'inferred',
    "acceptedEntryId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignLedgerSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "CampaignLedger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_acceptedEntryId_fkey" FOREIGN KEY ("acceptedEntryId") REFERENCES "CampaignLedgerEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignLedgerSuggestion_acceptedEntryId_key" ON "CampaignLedgerSuggestion"("acceptedEntryId");
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignLedgerSuggestion_campaignId_idempotencyKey_key" ON "CampaignLedgerSuggestion"("campaignId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "CampaignLedgerSuggestion_campaignId_status_idx" ON "CampaignLedgerSuggestion"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "CampaignLedgerSuggestion_ledgerId_status_idx" ON "CampaignLedgerSuggestion"("ledgerId", "status");
