-- Layer 1 — campaign economic ledger (treasury + narrative transaction entries)
CREATE TABLE "CampaignLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "currencyLabel" TEXT NOT NULL DEFAULT 'gold',
    "currencySuffix" TEXT NOT NULL DEFAULT 'g',
    "openingBalance" INTEGER NOT NULL DEFAULT 0,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'campaign-ledger-v1',
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedger_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CampaignLedger_campaignId_key" ON "CampaignLedger"("campaignId");

CREATE TABLE "CampaignLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "entryKind" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "amount" INTEGER NOT NULL,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "debtMeta" JSON,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignLedgerEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "CampaignLedger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CampaignLedgerEntry_campaignId_occurredAtEpochMinute_idx" ON "CampaignLedgerEntry"("campaignId", "occurredAtEpochMinute");
CREATE INDEX "CampaignLedgerEntry_ledgerId_occurredAtEpochMinute_idx" ON "CampaignLedgerEntry"("ledgerId", "occurredAtEpochMinute");
CREATE INDEX "CampaignLedgerEntry_campaignId_entryKind_idx" ON "CampaignLedgerEntry"("campaignId", "entryKind");
