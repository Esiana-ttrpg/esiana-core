-- CreateTable
CREATE TABLE "WritingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "activeDurationMs" INTEGER NOT NULL DEFAULT 0,
    "intervals" JSONB NOT NULL DEFAULT '[]',
    "documentIds" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'open',
    "completeness" TEXT NOT NULL DEFAULT 'measured',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WritingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WritingSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WritingSession_userId_campaignId_status_lastActivityAt_idx" ON "WritingSession"("userId", "campaignId", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "WritingSession_userId_startedAt_idx" ON "WritingSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "WritingSession_campaignId_startedAt_idx" ON "WritingSession"("campaignId", "startedAt");

-- CreateIndex
CREATE INDEX "WritingContribution_writingSessionId_idx" ON "WritingContribution"("writingSessionId");

-- AddForeignKey
ALTER TABLE "WritingContribution" ADD CONSTRAINT "WritingContribution_writingSessionId_fkey" FOREIGN KEY ("writingSessionId") REFERENCES "WritingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
