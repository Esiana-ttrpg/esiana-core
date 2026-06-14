-- CreateTable
CREATE TABLE "TimeAdvanceSimulationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "previousEpochMinute" BIGINT NOT NULL,
    "nextEpochMinute" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'time-hooks-v1',
    "receipt" JSON NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeAdvanceSimulationRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TimeAdvanceSimulationRun_campaignId_createdAt_idx" ON "TimeAdvanceSimulationRun"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimeAdvanceSimulationRun_campaignId_source_sourceRef_nextEpochMinute_key" ON "TimeAdvanceSimulationRun"("campaignId", "source", "sourceRef", "nextEpochMinute");
