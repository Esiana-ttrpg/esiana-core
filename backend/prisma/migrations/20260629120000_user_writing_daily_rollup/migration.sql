-- CreateTable
CREATE TABLE "UserWritingDailyRollup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "wordsAdded" INTEGER NOT NULL DEFAULT 0,
    "wordsRemoved" INTEGER NOT NULL DEFAULT 0,
    "editsCount" INTEGER NOT NULL DEFAULT 0,
    "linksCreated" INTEGER NOT NULL DEFAULT 0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 0,
    "peakHourUtc" INTEGER,
    "substantialRevisions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWritingDailyRollup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserWritingDailyRollup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserWritingDailyRollup_userId_date_idx" ON "UserWritingDailyRollup"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserWritingDailyRollup_userId_date_key" ON "UserWritingDailyRollup"("userId", "date");

-- CreateIndex
CREATE INDEX "CampaignActivity_userId_createdAt_idx" ON "CampaignActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NarrativeEvent_actorUserId_createdAt_idx" ON "NarrativeEvent"("actorUserId", "createdAt");
