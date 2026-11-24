-- CreateTable
CREATE TABLE "WritingContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "wordsAdded" INTEGER NOT NULL DEFAULT 0,
    "wordsRemoved" INTEGER NOT NULL DEFAULT 0,
    "netChange" INTEGER NOT NULL DEFAULT 0,
    "narrativeEventId" TEXT,
    "origin" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "writingSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingContribution_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WritingContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WritingContribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WritingContribution_narrativeEventId_key" ON "WritingContribution"("narrativeEventId");

-- CreateIndex
CREATE INDEX "WritingContribution_userId_occurredAt_idx" ON "WritingContribution"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "WritingContribution_campaignId_occurredAt_idx" ON "WritingContribution"("campaignId", "occurredAt");

-- CreateIndex
CREATE INDEX "WritingContribution_userId_campaignId_occurredAt_idx" ON "WritingContribution"("userId", "campaignId", "occurredAt");

-- CreateIndex
CREATE INDEX "WritingContribution_documentId_occurredAt_idx" ON "WritingContribution"("documentId", "occurredAt");
