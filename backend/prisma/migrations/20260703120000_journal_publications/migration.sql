-- CreateTable
CREATE TABLE "JournalSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultType" TEXT NOT NULL DEFAULT 'notice',
    "linkedPageId" TEXT,
    "templateWorkshopDraftId" TEXT,
    "nextIssueRule" JSONB,
    "namingScheme" TEXT,
    "nextIssueNumber" INTEGER NOT NULL DEFAULT 1,
    "seriesMode" TEXT NOT NULL DEFAULT 'live',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JournalSeries_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalPublication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'notice',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "seriesId" TEXT,
    "issueNumber" INTEGER,
    "sourceKind" TEXT NOT NULL DEFAULT 'quick_draft',
    "workshopDraftId" TEXT,
    "contentMarkdown" TEXT,
    "contentBlocks" JSONB,
    "releaseRule" JSONB,
    "linkedPageId" TEXT,
    "createdByUserId" TEXT,
    "releasedByUserId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JournalPublication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalPublication_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "JournalSeries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalPublication_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalPublication_releasedByUserId_fkey" FOREIGN KEY ("releasedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalReleaseReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "releasedAtEpochMinute" BIGINT NOT NULL,
    "triggerKind" TEXT NOT NULL,
    "diagnosticsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalReleaseReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalReleaseReceipt_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "JournalPublication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JournalSeries_campaignId_idx" ON "JournalSeries"("campaignId");

-- CreateIndex
CREATE INDEX "JournalPublication_campaignId_status_idx" ON "JournalPublication"("campaignId", "status");

-- CreateIndex
CREATE INDEX "JournalPublication_campaignId_seriesId_idx" ON "JournalPublication"("campaignId", "seriesId");

-- CreateIndex
CREATE INDEX "JournalPublication_campaignId_status_releasedAt_idx" ON "JournalPublication"("campaignId", "status", "releasedAt");

-- CreateIndex
CREATE INDEX "JournalPublication_campaignId_linkedPageId_idx" ON "JournalPublication"("campaignId", "linkedPageId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalReleaseReceipt_campaignId_publicationId_key" ON "JournalReleaseReceipt"("campaignId", "publicationId");

-- CreateIndex
CREATE INDEX "JournalReleaseReceipt_campaignId_createdAt_idx" ON "JournalReleaseReceipt"("campaignId", "createdAt");
