-- CreateTable
CREATE TABLE "CampaignScheduledEffect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "effectKind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "recurrenceRule" JSON NOT NULL,
    "anchorEpochMinute" BIGINT NOT NULL,
    "nextFireEpochMinute" BIGINT NOT NULL,
    "lastFiredEpochMinute" BIGINT,
    "effectPayload" JSON,
    "ledgerEntryKind" TEXT,
    "ledgerCategory" TEXT,
    "amount" INTEGER,
    "havenWikiPageId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignScheduledEffect_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffect_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffect_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CampaignScheduledEffect_campaignId_status_nextFireEpochMinute_idx" ON "CampaignScheduledEffect"("campaignId", "status", "nextFireEpochMinute");

-- CreateIndex
CREATE INDEX "CampaignScheduledEffect_campaignId_effectKind_idx" ON "CampaignScheduledEffect"("campaignId", "effectKind");
