-- CreateTable
CREATE TABLE "PageNarrativeStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'page-narrative-status-v1',
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageNarrativeStatus_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageNarrativeStatus_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageNarrativeStatus_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PageNarrativeStatus_wikiPageId_key" ON "PageNarrativeStatus"("wikiPageId");

-- CreateIndex
CREATE INDEX "PageNarrativeStatus_campaignId_status_idx" ON "PageNarrativeStatus"("campaignId", "status");

-- Backfill ACTIVE for all existing wiki pages
INSERT INTO "PageNarrativeStatus" ("id", "campaignId", "wikiPageId", "status", "semanticsVersion", "createdAt", "updatedAt")
SELECT
    'pns-' || "id",
    "campaignId",
    "id",
    'ACTIVE',
    'page-narrative-status-v1',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WikiPage"
WHERE "deletedAt" IS NULL;
